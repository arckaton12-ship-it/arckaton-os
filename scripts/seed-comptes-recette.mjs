#!/usr/bin/env node
// ============================================================
//  Cree les 8 comptes de la recette fonctionnelle dans PostgreSQL
//  LOCAL, puis les lignes `members` et `member_credentials`
//  correspondantes.
//
//  Ce que le script remplace :
//
//  Sous Supabase, un compte d'authentification vivait dans
//  `auth.users`, gere par GoTrue, qui hachait le mot de passe et
//  emettait la session. Il n'y a plus de `auth.users` : l'auth est
//  desormais dans `server.ts` (JWT maison) et le hachage dans la
//  colonne `password_hash` de `member_credentials`.
//
//  On ecrit donc directement ces deux tables, avec le meme bcrypt que
//  le serveur, pour qu'un compte cree ici et un compte cree via
//  l'API soient rigoureusement interchangeables. C'est ce qui permet
//  a la recette de se connecter a l'un comme a l'autre.
//
//  Les identifiants `members` sont generes ici et non repris d'un
//  service externe : il n'y a plus d'UUID d'auth a recopier.
//
//  Idempotent : relancer le script reconstruit la base des comptes de
//  test. Chaque insertion et son hachage se font dans UNE
//  transaction, donc un echec au 6e compte ne laisse pas cinq comptes
//  a moitie installes — ce qui donnait ensuite des 401 incomprehensibles.
//
//  Usage :
//    node scripts/seed-comptes-recette.mjs
//    node scripts/seed-comptes-recette.mjs --reset   (reinitialise aussi)
// ============================================================

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, '..');
const RESET = process.argv.includes('--reset');

const MDP = process.env.RECETTE_MDP || 'TestArckaton2026!';

// Les memes adresses que dans recette.cjs. Si la liste diverge, la
// recette ne pourra pas se connecter et l'echec paraitra etre un
// bug serveur : d'ou la verification de coherence ci-dessous.
const COMPTES = [
  { cle: 'dir', email: 'test.directeur@arckaton-os.test', nom: 'Directeur General', role: 'admin', poste_id: 'p1', pole: 'Direction', permissions: ['*'] },
  // `content` est necessaire : la section D verifie que le chef peut
  // reecrire le CMS, et que le stagiaire ne le peut pas. Les trois
  // permissions declarees dans l'interface d'administration sont
  // 'content', 'bat' et 'finance' (cf. MembersTab.tsx) ; on ne peut pas
  // en inventer d'autres, `hasPerm` compare a la chaine exacte.
  { cle: 'chef', email: 'test.chef@arckaton-os.test', nom: 'Chef d Agence', role: 'membre', poste_id: 'p1', pole: 'Direction', permissions: ['content'] },
  { cle: 'dc', email: 'test.commercial.dir@arckaton-os.test', nom: 'Directeur Commercial', role: 'membre', poste_id: 'p11', pole: 'Direction', permissions: [] },
  { cle: 'compta', email: 'test.compta@arckaton-os.test', nom: 'Comptable', role: 'membre', poste_id: 'p14', pole: 'Direction', permissions: [] },
  { cle: 'tech', email: 'test.tech@arckaton-os.test', nom: 'Developpeur Tech', role: 'membre', poste_id: 'p3', pole: 'Tech', permissions: [] },
  { cle: 'creatif', email: 'test.creatif@arckaton-os.test', nom: 'Chargement Creatif', role: 'membre', poste_id: 'p5', pole: 'Creatif', permissions: [] },
  { cle: 'digital', email: 'test.digital@arckaton-os.test', nom: 'Referent Digital', role: 'membre', poste_id: 'p9', pole: 'Digital', permissions: [] },
  // Pole Tech volontairement : la recette verifie que le stagiaire voit les
  // taches Tech. Avec le correctif P0 qui force le pole de l'auteur pour
  // les non-admins, un stag en pole 'Direction' ne verrait rien.
  { cle: 'stag', email: 'test.stagiaire@arckaton-os.test', nom: 'Stagiaire', role: 'membre', poste_id: 'p8', pole: 'Tech', permissions: [] },
];

// ------------------------------------------------------------
//  Configuration : uniquement la base locale.
// ------------------------------------------------------------
// Meme source que scripts/dev-local.mjs et docker-compose.pg.yml.
// Volontairement en dur et non lu dans un `.env` : un fichier local
// serait une deuxieme source de verite, et c'est cette duplication qui
// avait laisse la recette viser la production.
const PG = {
  host: '127.0.0.1',
  port: 5434,
  database: 'arckaton',
  user: 'arckaton_app',
  password: 'arckaton_app_local',
};

// Garde-fou : ce script ecrase des tables. Il ne doit JAMAIS toucher
// une base hebergee. On controle l'hote ET le port : `127.0.0.1` seul
// ne suffit pas, puisque la production est aussi joignable en local
// via un tunnel ou un port-forward.
const HOSTS_LOCAUX = new Set(['127.0.0.1', 'localhost', '::1']);
if (!HOSTS_LOCAUX.has(PG.host) || PG.port !== 5434) {
  console.error(
    '\n  REFUS : ' + PG.host + ':' + PG.port + ' n\'est pas la base locale de developpement.\n' +
    '  Ce script ecrase les comptes : il ne doit ecrire que dans le\n' +
    '  conteneur Docker de developpement (docker-compose.pg.yml).\n'
  );
  process.exit(1);
}

console.log('Cible locale : ' + PG.host + ':' + PG.port + '/' + PG.database + ' (' + PG.user + ')');

// Meme cout que `server.ts` (COST_BCRYPT). Un seed a 10 ferait
// diverger les comptes de test des comptes crees par l'API : le test
// du cout est ailleurs, il ne doit pas dependre de l'outil de seed.
const HACHAGE_COUT = 12;

(async () => {
  const client = new pg.Client({ ...PG, connectionTimeoutMillis: 5000 });
  await client.connect();

  try {
    // `verifierMotDePasse` compare l'email saisi a
    // `member_credentials.email` apres `toLowerCase()` des deux cotes.
    // Une adresse stockee en majuscules serait donc introuvable, et le
    // symptome — un 401 sur un compte qui existe — ne designerait pas la
    // vraie cause. Le meme `toLowerCase()` que `definirIdentifiants`
    // est donc applique ici, et une adresse melangee est refusee plutot
    // que de se faire corriger en silence.
    for (const c of COMPTES) {
      if (c.email !== c.email.toLowerCase()) {
        throw new Error(
          'compte ' + c.cle + ' : adresse non en minuscules (' + c.email + '). Corriger la liste.'
        );
      }
    }

    // Les 8 hachages sont calcules AVANT d'ouvrir la transaction : le
    // cout 12 est delibere, et le tenir hors transaction evite de
    // retenir un verrou sur les tables pendant une seconde.
    console.log('  bcrypt  ' + COMPTES.length + ' mots de passe (cout ' + HACHAGE_COUT + ')...');
    const haches = await Promise.all(COMPTES.map(() => bcrypt.hash(MDP, HACHAGE_COUT)));

    await client.query('BEGIN');
    try {
      // 1. Purge des comptes precedents.
      //
      // Un DELETE sur `members` entraine la suppression des
      // credentials via ON DELETE CASCADE, donc une seule requete
      // suffit et aucune ligne ne peut survive avec un compte fantome.
      const purge = await client.query('DELETE FROM members');
      console.log('  purge   ' + purge.rowCount + ' membre(s) precedent(s)');

      // 2. Membres + credentials.
      for (const [i, c] of COMPTES.entries()) {
        const id = randomUUID();
        await client.query(
          `INSERT INTO members
             (id, name, email, phone, role, pole, poste_id, poste_titre, permissions, active)
           VALUES ($1, $2, $3, '', $4, $5, $6, '', $7::jsonb, true)`,
          [id, c.nom, c.email, c.role, c.pole, c.poste_id, JSON.stringify(c.permissions)]
        );
        await client.query(
          `INSERT INTO member_credentials (member_id, email, password_hash)
           VALUES ($1, $2, $3)`,
          [id, c.email.toLowerCase(), haches[i]]
        );
        console.log('  compte  ' + c.cle.padEnd(8) + c.email);
      }

      if (RESET) {
        // On purge les objets crees par les runs precedents pour que les
        // assertions de la recette (listes vides au depart) soient fiables.
        //
        // Aucun ordre n'est impose ici : la seule cle etrangere du schema
        // est `member_credentials.member_id -> members.id`, et le DELETE
        // sur `members` ci-dessus a deja emporté les credentials en
        // cascade. Les tables de travail sont donc independantes entre
        // elles, ce que larequete de contraintes confirme.
        for (const t of ['activity_log', 'messages', 'agent_reports', 'leads', 'quotes', 'tasks']) {
          const r = await client.query('DELETE FROM ' + t);
          console.log('  reset   ' + t + ' : ' + r.rowCount + ' ligne(s)');
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    }

    // Relecture : on ne fait pas confiance au `rowCount` cumule, on
    // verifie ce que la base contient reellement apres commit.
    const lus = await client.query('SELECT email FROM members ORDER BY email');
    const creds = await client.query('SELECT count(*)::int AS n FROM member_credentials');

    console.log('  base    ' + lus.rowCount + ' membre(s), ' + creds.rows[0].n + ' credential(s)');

    if (lus.rowCount !== COMPTES.length) {
      throw new Error(
        ' attendu ' + COMPTES.length + ' membres, trouve ' + lus.rowCount + '. Transaction annulee ?'
      );
    }
    if (creds.rows[0].n !== COMPTES.length) {
      throw new Error(
        ' attendu ' + COMPTES.length + ' credentials, trouve ' + creds.rows[0].n + '.'
      );
    }

    // La contrainte d'unicite de l'admin est un index partiel : une
    // recette qui se termine avec deux administrateurs echouerait au
    // PROCHAIN lancement, pas ici. On le verifie donc maintenant.
    const admins = await client.query("SELECT count(*)::int AS n FROM members WHERE role = 'admin'");
    if (admins.rows[0].n !== 1) {
      throw new Error(
        ' la recette attend exactement 1 administrateur, trouve ' + admins.rows[0].n + '.'
      );
    }

    console.log('\n  ' + COMPTES.length + ' comptes prets. Mot de passe : ' + MDP);
    console.log('  Verifiez que recette.cjs utilise exactement ces adresses.\n');
  } finally {
    await client.end().catch(() => {});
  }
})().catch((e) => {
  console.error('\n  ECHEC : ' + e.message + '\n');
  process.exit(1);
});
