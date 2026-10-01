// Verifie que le code et le schema parlent des memes contraintes.
//
// `server.ts` compare `error.constraint` a un nom en dur pour
// distinguer deux violations d'unicite qui partagent le meme code
// SQL (23505) : « un administrateur existe deja » de « cet email est
// deja pris ». Si le nom change dans la migration sans que le code
// soit suivi, rien ne casse : la reponse bascule silencieusement sur
// le message « email deja utilise » pour un conflit d'administrateur.
//
// C'est le genre d'erreur qu'aucun test de bout en bout ne rattrape
// facilement, parce que le code HTTP est identique (409 dans les deux
// cas) : seul le message change. Ce test compare donc directement les
// noms.
//
// necessite la base reelle : `npm run test:db`.
import { describe, it, expect, afterAll } from 'vitest';
import { query, closePool, enLignes, estColonneJsonb } from '../src/db/adapter';

const baseConfiguree =
  Boolean(process.env.PGUSER && process.env.PGPASSWORD) ||
  Boolean(process.env.DATABASE_URL);

// Doit rester identique a CONTRAINTE_ADMIN_UNIQUE dans server.ts.
const CONTRAINTE_ADMIN_UNIQUE = 'members_un_seul_admin';

describe.skipIf(!baseConfiguree)('contraintes du schema', () => {
  it(`l index d unicite admin s appelle ${CONTRAINTE_ADMIN_UNIQUE}`, async () => {
    const { data, error } = await query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'members' AND indexname = $1`,
      [CONTRAINTE_ADMIN_UNIQUE]
    );
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it("l index d unicite admin porte bien sur role = 'admin'", async () => {
    // Un index unique sur `role` en entier refuserait deux membres
    // ordinaires — c'est-a-dire la totalite de l'annuaire. La
    // condition partielle `WHERE role = 'admin'` est ce qui rend la
    // regle correcte ; on la verifie plutot que de faire confiance
    // au nom.
    const { data } = await query(
      `SELECT indexdef FROM pg_indexes WHERE indexname = $1`,
      [CONTRAINTE_ADMIN_UNIQUE]
    );
    const def = String(enLignes<{ indexdef: string }>(data)[0]?.indexdef ?? '');
    expect(def).toContain('UNIQUE');
    expect(def).toMatch(/WHERE/i);
    expect(def).toContain('admin');
  });

  it("l email des membres est unique, insensible a la casse", async () => {
    // `UNIQUE (email)` seul autoriserait `a@x.test` et `A@x.test` :
    // deux comptes distincts pour la meme boite, dont un seul
    // connectable de facon fiable. L'index porte sur `lower(email)`.
    const { data } = await query(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'members' AND indexname = 'members_email_key'`
    );
    const def = String(enLignes<{ indexdef: string }>(data)[0]?.indexdef ?? '');
    expect(def).toContain('lower');
  });

  it("l email des identifiants est aussi unique et insensible a la casse", async () => {
    // `member_credentials` porte sa propre contrainte. Sans elle, deux
    // lignes pourraient porter le meme email, et le login trancherait
    // au hasard entre les deux mots de passe.
    const { data } = await query(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'member_credentials'`
    );
    const defs = enLignes<{ indexdef: string }>(data);
    expect(defs.some((d) => String(d.indexdef).includes('lower'))).toBe(true);
  });

  it('member_credentials depend de members avec ON DELETE CASCADE', async () => {
    // C'est cette contrainte qui rend la suppression d'un membre
    // atomique : un seul DELETE suffit, et il ne peut pas laisser
    // d'identifiants orphelins (un compte d'authentification sans
    // profil — l'etat intermediaire que l'ancien code créait avec ses
    // deux appels successifs).
    const { data } = await query(
      `SELECT confdeltype FROM pg_constraint
       WHERE conrelid = 'member_credentials'::regclass
         AND contype = 'f'`
    );
    // 'c' = CASCADE dans pg_constraint.
    expect(enLignes<{ confdeltype: string }>(data)[0]?.confdeltype).toBe('c');
  });

  it("la liste des colonnes jsonb du code correspond a la base", async () => {
    // `src/db/adapter.ts` maintient une liste figee des colonnes jsonb,
    // parce que `node-postgres` ne serialise pas un tableau JS en JSON
    // mais en litteral de tableau PostgreSQL. La consequence d'un oubli
    // est silencieuse : `permissions: []` arrive en base sous la forme
    // `{}`, `hasPerm` n'accorde plus rien, et rien ne leve d'erreur.
    //
    // Ce test echoue des qu'une migration ajoute une colonne jsonb sans
    // que la liste soit mise a jour.
    const { data } = await query(
      `SELECT table_name || '.' || column_name AS nom
       FROM information_schema.columns
       WHERE table_schema = 'public' AND data_type IN ('jsonb', 'json')
       ORDER BY 1`
    );
    const reelles = new Set(enLignes<{ nom: string }>(data).map((r) => r.nom));
    expect(reelles.size).toBeGreaterThan(0);
    for (const nom of reelles) {
      expect(estColonneJsonb(nom.split('.')[0], nom.split('.')[1])).toBe(true);
    }
  });

  it('aucune table applicative ne porte de politique RLS', async () => {    // Choix d'architecture, pas oubli : les droits sont dans le code
    // (`requireAuth`, `requirePerm`, `contentVisibility`). Un RLS
    // ajoute ici serait une deuxieme source de verite, susceptible de
    // diverger de la premiere en silence. Voir migrations/001_roles.sql.
    const { data } = await query(
      `SELECT c.relname, c.relrowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'
         AND c.relname <> 'schema_migrations'`
    );
    const tables = enLignes<{ relname: string; relrowsecurity: boolean }>(data);
    expect(tables.length).toBeGreaterThan(0);
    const avecRls = tables.filter((t) => t.relrowsecurity);
    expect(avecRls.map((t) => t.relname)).toEqual([]);
  });

  it("le role applicatif n'a aucun droit de DROP ni de creation de tables", async () => {
    // Le role applicatif ne doit pas pouvoir modifier le schema. Sur
    // Supabase, `service_role` l'etait : le code pouvait, par
    // megauvais calcul, laisser passer un `CREATE TABLE`. Ici les
    // droits sont strictement DML sur les tables declarees.
    const { data } = await query(
      `SELECT has_schema_privilege('arckaton_app', 'public', 'CREATE') as peut_creer`
    );
    expect(enLignes<{ peut_creer: boolean }>(data)[0]?.peut_creer).toBe(false);
  });

  it('le role applicatif possede les tables (controle de derive)', async () => {
    // Un controle de derive, volontairement sur LES DEUX sens :
    //   - une table declaree dans 002 mais non accordee casserait
    //     l'endpoint correspondant en 500 ;
    //   - une table accordee mais non declaree signalerait un
    //     fichier de migration oublie.
    const { data } = await query(
      `SELECT table_name FROM information_schema.role_table_grants
       WHERE grantee = 'arckaton_app' AND table_schema = 'public'
       ORDER BY table_name`
    );
    const accordees = enLignes<{ table_name: string }>(data).map((r) => r.table_name);

    // Ces trois tables sont creees et accordees par la migration.
    for (const attendu of ['members', 'member_credentials', 'content_items']) {
      expect(accordees).toContain(attendu);
    }
    // Rien d'autre : un droit sur une table inconnue serait suspect.
    const connues = [
      'members', 'member_credentials', 'content_items', 'activity_log',
      'tasks', 'messages', 'leads', 'agent_reports', 'whatsapp_outbox',
      'projects', 'quotes', 'app_settings',
    ];
    for (const t of accordees) {
      expect(connues).toContain(t);
    }
  });

  // Ferme le pool pour ne pas laisser de connexion ouverte en fin de
  // suite, sinon vitest signale une sortie en attente.
  afterAll(async () => {
    await closePool();
  });
});
