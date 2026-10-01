// Tests de la couche d'authentification (src/db/auth.ts).
//
// Ces tests-touchent du code qui decide qui entre. Ils sont donc ecrits
// pour couvrir les cas d'echec, pas seulement le chemin heureux :
// un jeu de tests qui ne verifie que « le bon mot de passe passe »
// laisse passer un jeton falsifie, une cle trop courte, ou une
// comparaison de hash non constante.
//
// necessite une base reelle (`npm run test:db` / PG* definis). Le
// compte utilise est cree puis supprime : la suite ne laisse pas de
// trace en base.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import {
  emettreJetons,
  verifierJetonAcces,
  verifierJetonRefresh,
  verifierMotDePasse,
  definirIdentifiants,
  supprimerIdentifiants,
  nouvelIdentifiantMembre,
  hacherMotDePasse,
  authConfiguree,
} from '../src/db/auth';
import { from, query, closePool, enLigne } from '../src/db/adapter';

const baseConfiguree =
  Boolean(process.env.PGUSER && process.env.PGPASSWORD) ||
  Boolean(process.env.DATABASE_URL);

// JWT_SECRET est lu par le module a chaque appel (pas de cache), donc
// on peut le poser ici avant les assertions. 32 caracteres minimum.
const SECRET_1 = 'a'.repeat(48);
const SECRET_2 = 'b'.repeat(48);

const EMAIL = `test-auth-${Date.now()}@example.test`;
const MOT_DE_PASSE = 'mot-de-passe-solide-1';
let memberId = '';

describe.skipIf(!baseConfiguree)('auth JWT (base reelle)', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = SECRET_1;
    memberId = nouvelIdentifiantMembre();
    await query(
      `INSERT INTO members (id, name, email, role, pole, active)
       VALUES ($1, $2, $3, 'membre', 'Tech', true)`,
      [memberId, 'Membre Test', EMAIL]
    );
    await definirIdentifiants(memberId, EMAIL, MOT_DE_PASSE);
  });

  afterAll(async () => {
    // CASCADE : supprimer le membre emporte ses identifiants.
    await query(`DELETE FROM members WHERE id = $1`, [memberId]);
    await closePool();
  });

  beforeEach(() => {
    process.env.JWT_SECRET = SECRET_1;
  });

  // ---- Mots de passe -------------------------------------------
  describe('mots de passe', () => {
    it('accepte le bon mot de passe et renvoie le membre', async () => {
      const trouve = await verifierMotDePasse(EMAIL, MOT_DE_PASSE);
      expect(trouve).toBe(memberId);
    });

    it('refuse un mot de passe faux', async () => {
      const trouve = await verifierMotDePasse(EMAIL, 'mauvais-mot-de-passe');
      expect(trouve).toBeNull();
    });

    it('l email est insensible a la casse', async () => {
      // `member_credentials.email` est indexe sur `lower(email)`, donc
      // `ADRESSE@...` et `adresse@...` designent le meme compte. Si
      // l'index disparait, on pourrait creer un compte quasi identique
      // a un existant en changeant la casse de l'adresse.
      const trouve = await verifierMotDePasse(EMAIL.toUpperCase(), MOT_DE_PASSE);
      expect(trouve).toBe(memberId);
    });

    it('un email inconnu est refuse, pas une erreur', async () => {
      // Le login doit distinguer « mauvais mot de passe » (401) de
      // « infrastructure cassee » (500). Un email inexistant est un
      // mauvais mot de passe, pas une panne.
      const trouve = await verifierMotDePasse('inconnu@example.test', 'peu-importe');
      expect(trouve).toBeNull();
    });

    it('changer de mot de passe invalide l ancien immediatement', async () => {
      // Un seul mot de passe a la fois, impose par la cle primaire
      // `member_id` de `member_credentials`. Si l upsert creait une
      // seconde ligne, l ancien resterait valable — un secret expose
      // ne pourrait jamais etre revoque.
      await definirIdentifiants(memberId, EMAIL, 'nouveau-mot-de-passe-2');
      expect(await verifierMotDePasse(EMAIL, MOT_DE_PASSE)).toBeNull();
      expect(await verifierMotDePasse(EMAIL, 'nouveau-mot-de-passe-2')).toBe(memberId);

      // Remise en etat pour les tests suivants.
      await definirIdentifiants(memberId, EMAIL, MOT_DE_PASSE);
      expect(await verifierMotDePasse(EMAIL, MOT_DE_PASSE)).toBe(memberId);
    });

    it('deux membres ne peuvent pas partager un email', async () => {
      const autre = nouvelIdentifiantMembre();
      await query(
        `INSERT INTO members (id, name, email, role, pole, active)
         VALUES ($1, $2, $3, 'membre', 'Tech', true)`,
        [autre, 'Doublon', EMAIL]
      );
      // Le refus vient de l'index unique, pas du code : c'est la
      // garantie qui tient meme si quelqu'un ecrit ailleurs dans la
      // base. Dupliquer l'email rendrait le login non deterministe.
      await expect(definirIdentifiants(autre, EMAIL, MOT_DE_PASSE)).resolves.toBe(false);

      await query(`DELETE FROM members WHERE id = $1`, [autre]);
    });

    it('le hash n est jamais le mot de passe en clair', async () => {
      const hash = await hacherMotDePasse('visible-en-clair');
      expect(hash).not.toBe('visible-en-clair');
      // bcrypt : prefixe d'identification du cout et du sel.
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    });

    it('deux hachages du meme mot de passe different', async () => {
      // Le sel est aleatoire : deux comptes avec le meme mot de passe
      // n'ont pas le meme hash. Sans sel, une base volee offrirait
      // des indices sur les mots de passe faibles.
      const [a, b] = await Promise.all([
        hacherMotDePasse('meme'),
        hacherMotDePasse('meme'),
      ]);
      expect(a).not.toBe(b);
    });

    it('supprimer les identifiants rend le compte non connectable', async () => {
      const jetable = nouvelIdentifiantMembre();
      await query(
        `INSERT INTO members (id, name, email, role, pole, active)
         VALUES ($1, $2, $3, 'membre', 'Tech', true)`,
        [jetable, 'Jetable', `jetable-${Date.now()}@example.test`]
      );
      const emailJetable = `jetable-${Date.now()}@example.test`;
      await definirIdentifiants(jetable, emailJetable, MOT_DE_PASSE);
      expect(await verifierMotDePasse(emailJetable, MOT_DE_PASSE)).toBe(jetable);

      expect(await supprimerIdentifiants(jetable)).toBe(true);
      expect(await verifierMotDePasse(emailJetable, MOT_DE_PASSE)).toBeNull();

      await query(`DELETE FROM members WHERE id = $1`, [jetable]);
    });
  });

  // ---- Emission et verification des jetons ----------------------
  describe('jetons', () => {
    it('emet un access token et un refresh token distincts', () => {
      const session = emettreJetons(memberId)!;
      expect(session.token).toBeTruthy();
      expect(session.refreshToken).toBeTruthy();
      expect(session.token).not.toBe(session.refreshToken);
      // 1 heure, comme le TTL de GoTrue.
      expect(session.expiresIn).toBe(3600);
    });

    it('un access token se verifie et donne le membre', () => {
      const { token } = emettreJetons(memberId)!;
      expect(verifierJetonAcces(token)).toBe(memberId);
    });

    it('un refresh token ne vaut pas comme access token', () => {
      // Erreur de confusion classique : si les deux types se validaient
      // mutuellement, un refresh vole (30 jours de validite) donnerait
      // un acces direct a l'API pendant un mois.
      const { refreshToken } = emettreJetons(memberId)!;
      expect(verifierJetonAcces(refreshToken)).toBeNull();
    });

    it('un access token ne vaut pas comme refresh token', () => {
      const { token } = emettreJetons(memberId)!;
      expect(verifierJetonRefresh(token)).toBeNull();
    });

    it('refuse un jeton signe avec une autre cle', () => {
      // Le piege le plus evident d'une signature symetrique : signer
      // soi-meme un jeton avec une cle qu on connait donne un acces
      // total. C'est pourquoi le secret n'est ni partage ni derive
      // d'une valeur devinable.
      const { token } = emettreJetons(memberId)!;
      process.env.JWT_SECRET = SECRET_2;
      expect(verifierJetonAcces(token)).toBeNull();
    });

    it('refuse un jeton dont la charge a ete modifiee', () => {
      // On re-signe un payload change avec la meme cle pour
      // demontrer que la signature couvre bien le contenu, pas
      // seulement la presence de trois segments.
      const { token } = emettreJetons(memberId)!;
      const [entete, , signature] = token.split('.');
      const chargeFalsifiee = Buffer.from(
        JSON.stringify({
          sub: 'autre-membre',
          typ: 'access',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          jti: 'falsifie',
        })
      )
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      expect(verifierJetonAcces(`${entete}.${chargeFalsifiee}.${signature}`)).toBeNull();
    });

    it('refuse un jeton dont la signature est abimee', () => {
      const { token } = emettreJetons(memberId)!;
      const parties = token.split('.');
      // Un octet change : le HMAC ne correspond plus.
      const signatureAbimee =
        (parties[2][0] === 'A' ? 'B' : 'A') + parties[2].slice(1);
      expect(verifierJetonAcces(`${parties[0]}.${parties[1]}.${signatureAbimee}`)).toBeNull();
    });

    it('refuse un jeton expire', () => {
      // Forge un jeton valide mais deja echu. La cle est la bonne :
      // seul le controle d'expiration peut le rejeter, ce qui isole
      // precisement la regle testee.
      const expire = Math.floor(Date.now() / 1000) - 10;
      const signe = JSON.stringify({
        sub: memberId,
        typ: 'access',
        iat: expire - 3600,
        exp: expire,
        jti: 'expire',
      });
      const jwt = forgerJwt(signe);
      expect(verifierJetonAcces(jwt)).toBeNull();
    });

    it('refuse une chainee qui n est pas un JWT', () => {
      // `optionalAuth` laisse passer ces jetons sans les demonter ;
      // `requireAuth` doit les refuser, pas planter.
      for (const nonsense of ['', 'abc', 'a.b', 'a.b.c.d', '...', 'null']) {
        expect(verifierJetonAcces(nonsense)).toBeNull();
      }
    });

    it('sans JWT_SECRET, aucune session n est emise', () => {
      // Plutot que d emettre un jeton signe avec une cle devinee, on
      // refuse. Le login rendra 500 explicite.
      delete process.env.JWT_SECRET;
      expect(authConfiguree()).toBe(false);
      expect(emettreJetons(memberId)).toBeNull();
    });

    it('refuse un JWT_SECRET trop court', () => {
      // Un secret de 8 caracteres se devine ; c'est la meme chose
      // qu'aucun secret.
      process.env.JWT_SECRET = 'court';
      expect(authConfiguree()).toBe(false);
      expect(emettreJetons(memberId)).toBeNull();
    });
  });

  // ---- Integrite de la table ------------------------------------
  // ---- Non-regression : permissions reste un tableau JSON ----------
  it('permissions est un tableau JSON, pas un objet', async () => {
    // Regression silencieuse. `node-postgres` convertit un tableau
    // JavaScript en litteral de tableau PostgreSQL : lier
    // `permissions: ['devis']` a une colonne jsonb stockait `{devis}`
    // (un objet), pas `["devis"]`. Or `hasPerm` teste
    // `Array.isArray(...)` : le membre perdait TOUS ses droits, sans
    // qu'aucune erreur ne soit levee et sans qu'aucun test ne tombe —
    // la reponse HTTP restait 200 dans tous les cas.
    //
    // On ecrit puis on relit par la base, pas via l'objet renvoye : le
    // defaut ne se voyait justement pas dans la valeur retournee.
    const jetable = nouvelIdentifiantMembre();
    const emailJetable = `perm-${Date.now()}@example.test`;
    await query(
      `INSERT INTO members (id, name, email, role, pole, permissions, active)
       VALUES ($1, $2, $3, 'membre', 'Tech', $4, true)`,
      [jetable, 'Permissions', emailJetable, JSON.stringify(['devis', 'content'])]
    );

    const { data } = await from('members').select('permissions').eq('id', jetable).single();
    const permissions = (enLigne(data)?.permissions) as unknown;

    expect(Array.isArray(permissions)).toBe(true);
    expect(permissions).toEqual(['devis', 'content']);
    // C'est cette forme que `hasPerm` consomme.
    expect((permissions as string[]).includes('devis')).toBe(true);

    await query(`DELETE FROM members WHERE id = $1`, [jetable]);
  });

  it('un tableau vide reste un tableau vide', async () => {
    // Le cas limite qui a produit le bug le plus deroutant : `[]`
    // devenait `{}`. Un objet vide est « present mais vide » pour
    // `Array.isArray`, et « absent » pour `hasPerm` — les deux se
    // comportent comme « aucune permission », mais un test d'egalite
    // les distingue. Le bootstrap cree le directeur avec `[]`.
    const jetable = nouvelIdentifiantMembre();
    await query(
      `INSERT INTO members (id, name, email, role, pole, permissions, active)
       VALUES ($1, $2, $3, 'membre', 'Tech', '[]'::jsonb, true)`,
      [jetable, 'Vide', `vide-${Date.now()}@example.test`]
    );
    const { data } = await from('members').select('permissions').eq('id', jetable).single();
    expect(enLigne(data)?.permissions).toEqual([]);

    await query(`DELETE FROM members WHERE id = $1`, [jetable]);
  });

  it('member_credentials n est pas lisible par un membre via members', async () => {    // Le hash vit dans une table separee : `select('*')` sur `members`
    // ne peut donc pas le renvoyer. C'est ce qui empeche le hash de
    // fuiter dans la reponse JSON de /api/auth/login, qui serialise
    // la ligne entiere.
    const { data, error } = await from('members').select('*').eq('id', memberId).single();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect((data as Record<string, unknown>).password_hash).toBeUndefined();
  });
});

/**
 * Construit un JWT signe avec le vrai secret courant.
 * Sert uniquement a forger un jeton expire de facon valide : sans ca,
 * le test d'expiration devrait soit attendre une heure, soit
 * falsifier la signature — et ne testerait donc pas l'expiration.
 */
function forgerJwt(chargeJson: string): string {
  const b64 = (d: Buffer | string) =>
    Buffer.from(d)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  const entete = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const corps = b64(chargeJson);
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET as string)
    .update(entete + '.' + corps)
    .digest();
  return entete + '.' + corps + '.' + b64(signature);
}
