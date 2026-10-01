// ============================================================
//  Authentification — JWT maison
//
//  Remplace GoTrue (Supabase Auth). Les 6 appels utilises par
//  `server.ts` etait :
//     signInWithPassword / refreshSession / getUser(token)      -> session
//     admin.createUser / deleteUser / updateUserById           -> CRUD comptes
//
//  Ils deviennent : `verifierMotDePasse`, `emettreJetons`,
//  `verifierJeton`, et le CRUD dans `src/db/membres.ts`.
//
//  CE QUI CHANGE, et c'est volontaire :
//
//  1. La signature est verifiee LOCALEMENT (HMAC-SHA256). Sur Supabase,
//     chaque requete authentifiée coutait deux allers-retours :
//     un vers GoTrue pour valider le jeton, un vers PostgREST pour
//     charger le membre. La validation locale supprime le premier.
//
//  2. Le jeton ne contient que l'identite, PAS les droits. Role,
//     pole et permissions sont relus en base a chaque requete, comme
//     avant. Un jeton vole de 24 h ne donne donc pas un acces elargi
//     si un compte est desactive entre-temps : c'est la raison de ce
//     choix plutot que des claims porte-pemission.
//
//  3. Une seule cle de signature (`JWT_SECRET`), comme sur Supabase.
//     Si elle est absente, aucune session n'est emise : mieux vaut
//     refuser le login que d'emettre un jeton signe avec une cle
//     devinee.
//
//  4. Le refresh est un jeton de longue duree, sans stockage
//     serveur — exactement le comportement actuel, ou
//     POST /api/auth/logout ne revoque rien et le client efface
//     lui-meme son localStorage. La consequence : un refresh token
//     vole reste valable jusqu'a expiration. C'est un choix
//     documente, pas un oubli ; `MEMBER_REFRESH_TTL_JOURS` le borne.
// ============================================================
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { from, query } from './adapter';

// ------------------------------------------------------------
//  Configuration
// ------------------------------------------------------------
const ACCESS_TTL_SEC = 3600; // 1 h, comme avant.
const REFRESH_TTL_SEC = 30 * 24 * 3600; // 30 jours.

/**
 * Coût bcrypt. 12 est le minimum recommande par OWASP en 2024 pour
 * bcrypt. C'est volontairement lent : c'est ce qui rend le forcage
 * brut coûteux. Sur une machine de 8 Go, verifier un mot de passe
 * coute ~200 ms — irrelevant pour un login, decisive contre un
 * attaquant qui tente des milliers de combinaisons.
 */
const BCRYPT_COUT = 12;

// Secret de signature. En production il vient de l'environnement ;
// en developpement, on peut le deriver du secret de session pour
// eviter une configuration obligatoire.
function secretSignature(): string | null {
  const depuisEnv = process.env.JWT_SECRET;
  if (depuisEnv && depuisEnv.length >= 32) return depuisEnv;
  if (depuisEnv && depuisEnv.length > 0) {
    console.error(
      '[auth] JWT_SECRET est trop court (32 caracteres minimum). Aucune session ne sera emise.'
    );
    return null;
  }
  return null;
}

export function authConfiguree(): boolean {
  return secretSignature() !== null;
}

// ------------------------------------------------------------
//  Encode / decode JWT (HS256)
// ------------------------------------------------------------
function base64url(donnees: Buffer | string): string {
  return Buffer.from(donnees)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64url(valeur: string): Buffer {
  // Le padding est optionnel en base64url ; on le remet avant de
  // decoder, sinon `Buffer.from` ignore silencieusement des caracteres.
  const complement = '='.repeat((4 - (valeur.length % 4)) % 4);
  return Buffer.from(valeur.replace(/-/g, '+').replace(/_/g, '/') + complement, 'base64');
}

interface ChargeJeton {
  sub: string; // member_id
  typ: 'access' | 'refresh';
  iat: number;
  exp: number;
  // Un identifiant de jeton, pour distinguer deux refresh emis pour
  // le meme membre. Sans lui, impossible de reconnaitre un rejeu.
  jti: string;
}

function signer(charge: ChargeJeton, secret: string): string {
  const entete = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const corps = base64url(JSON.stringify(charge));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(entete + '.' + corps)
    .digest();
  return entete + '.' + corps + '.' + base64url(signature);
}

/**
 * Verifie signature et expiration. Renvoie `null` si le jeton est
 * inexploitable, sans distinguer les causes : un message different
 * pour « signature invalide » et « expire » aiderait un attaquant a
 * distinguer un jeton authentique d'un jeton falsifie.
 */
function verifierSignature(token: string, attendu: 'access' | 'refresh'): ChargeJeton | null {
  const secret = secretSignature();
  if (!secret) return null;

  const parties = token.split('.');
  if (parties.length !== 3) return null;
  const [entete, corps, signature] = parties;

  const attendue = crypto
    .createHmac('sha256', secret)
    .update(entete + '.' + corps)
    .digest();
  let recue: Buffer;
  try {
    recue = fromBase64url(signature);
  } catch {
    return null;
  }

  // Comparaison a temps constant : une comparaison `===` s'arrete au
  // premier octet different et laisse fuiter, par la duree, combien
  // de caracteres corrects ont ete devines.
  if (recue.length !== attendue.length || !crypto.timingSafeEqual(recue, attendue)) {
    return null;
  }

  let charge: ChargeJeton;
  try {
    charge = JSON.parse(fromBase64url(corps).toString('utf8'));
  } catch {
    return null;
  }

  if (charge.typ !== attendu) return null;
  if (typeof charge.exp !== 'number' || charge.exp * 1000 <= Date.now()) return null;
  if (typeof charge.sub !== 'string' || charge.sub.length === 0) return null;

  return charge;
}

// ------------------------------------------------------------
//  Emission
// ------------------------------------------------------------
export interface SessionEmise {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export function emettreJetons(memberId: string): SessionEmise | null {
  const secret = secretSignature();
  if (!secret) return null;

  const maintenant = Math.floor(Date.now() / 1000);
  const access = signer(
    {
      sub: memberId,
      typ: 'access',
      iat: maintenant,
      exp: maintenant + ACCESS_TTL_SEC,
      jti: crypto.randomUUID(),
    },
    secret
  );
  const refresh = signer(
    {
      sub: memberId,
      typ: 'refresh',
      iat: maintenant,
      exp: maintenant + REFRESH_TTL_SEC,
      jti: crypto.randomUUID(),
    },
    secret
  );

  return { token: access, refreshToken: refresh, expiresIn: ACCESS_TTL_SEC };
}

// ------------------------------------------------------------
//  Verification
// ------------------------------------------------------------
/** Renvoie le `member_id` d'un access token valide, sinon `null`. */
export function verifierJetonAcces(token: string): string | null {
  return verifierSignature(token, 'access')?.sub ?? null;
}

/** Renvoie le `member_id` d'un refresh token valide, sinon `null`. */
export function verifierJetonRefresh(token: string): string | null {
  return verifierSignature(token, 'refresh')?.sub ?? null;
}

// ------------------------------------------------------------
//  Mots de passe
// ------------------------------------------------------------
// ------------------------------------------------------------
//  Identifiants
// ------------------------------------------------------------
/**
 * Genere l'identifiant d'un membre.
 *
 * GoTrue produisait le `user.id` en UUID et le code le recyclait comme
 * `members.id`. Il n'y a plus de compte utilisateur distinct : c'est
 * le membre qui EST l'identite. La colonne reste un `uuid` et la
 * valeur reste un UUID, donc les URLs `/api/members/<uuid>` et les
 * donnees deja en base restent compatibles sans conversion.
 */
export function nouvelIdentifiantMembre(): string {
  return crypto.randomUUID();
}

export async function hacherMotDePasse(motDePasse: string): Promise<string> {
  return bcrypt.hash(motDePasse, BCRYPT_COUT);
}

/**
 * Compare un mot de passe au hash stocke.
 *
 * Si le membre n'existe pas, on compare malgre tout contre un hash
 * factice : sans cela, un email inconnu repondrait beaucoup plus vite
 * qu'un email connu, et l'asynchronisme des deux reponses trahirait
 * quelles adresses sont enregistrees.
 */
const HASH_FACTICE = '$2a$12$Kix7ZqZ0pQ8vN3mL5sYQeJ7hR2uW9xY4cD6fG8hJ0kL2nP4rS6tUu';

export async function verifierMotDePasse(
  email: string,
  motDePasse: string,
): Promise<string | null> {
  const { data } = await from('member_credentials')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  const hash = (data as { password_hash?: string } | null)?.password_hash;
  if (!hash) {
    await bcrypt.compare(motDePasse, HASH_FACTICE);
    return null;
  }

  const correct = await bcrypt.compare(motDePasse, hash);
  return correct ? (data as { member_id: string }).member_id : null;
}

/**
 * Ecrit (ou reecrit) les identifiants d'un membre.
 *
 * Un seul mot de passe a la fois : la ligne est remplacee, ce qui
 * rend le changement immediatement effectif et invalide l'ancien.
 */
export async function definirIdentifiants(
  memberId: string,
  email: string,
  motDePasse: string,
): Promise<boolean> {
  const hash = await hacherMotDePasse(motDePasse);
  const { data, error } = await from('member_credentials')
    .upsert(
      { member_id: memberId, email: email.toLowerCase(), password_hash: hash },
      { onConflict: 'member_id' }
    )
    .select('member_id');

  // PostgREST renvoyait une erreur si l'upsert ne touchait aucune
  // ligne. Ici, l'absence d'erreur suffit : on verifie par une
  // relecture, parce qu'un upsert peut reussir sans modifier.
  if (error) return false;
  const { data: relu } = await from('member_credentials')
    .select('member_id')
    .eq('member_id', memberId)
    .maybeSingle();
  return Boolean(relu);
}

/** Supprime les identifiants. Lcascade sur `members` fait le reste. */
export async function supprimerIdentifiants(memberId: string): Promise<boolean> {
  const { error } = await from('member_credentials').delete().eq('member_id', memberId);
  return !error;
}

/**
 * Verification d'integrite au demarrage.
 *
 * Sans ca, une configuration incomplete ne se revele qu'au premier
 * login, sous la forme d'un 500 et d'un message « Erreur de
 * connexion » — impossible a diagnostiquer depuis les journaux.
 */
export async function verifierIntegriteAuth(): Promise<{ ok: boolean; message: string }> {
  if (!authConfiguree()) {
    return {
      ok: false,
      message:
        'JWT_SECRET absent ou trop court (32 caracteres minimum) : aucune connexion ne peut aboutir.',
    };
  }
  const { error } = await query('select 1 as ok');
  if (error) {
    return { ok: false, message: 'Base injoignable : ' + error.message };
  }
  return { ok: true, message: 'Auth JWT operationnelle' };
}
