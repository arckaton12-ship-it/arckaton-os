// ============================================================
//  Test de l'adaptateur contre le VRAI PostgreSQL.
//
//  Ces tests ne tournent pas si la base n'est pas demarree : ils
//  verifient le SQL reellement produit, pas une chaine de mocks.
//  C'est indispensable ici parce que l'adaptateur remplace la
//  couche qui portait les P0 : un `.eq('published', true)` perdu en
//  route ne se verrait dans aucun test unitaire.
//
//  Lancement : docker compose -f docker-compose.pg.yml up -d
//             puis npx vitest run tests/db.adapter.test.ts
// ============================================================
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { from, closePool, query } from '../src/db/adapter';

// La suite manipule des donnees reelles : elle s'isole du reste en
// n'utilisant qu'une table dediee, supprimee apres coup.
const TABLE = 'test_adapter_scratch';

const baseConfiguree =
  Boolean(process.env.PGUSER && process.env.PGPASSWORD) ||
  Boolean(process.env.DATABASE_URL);

describe.skipIf(!baseConfiguree)('adaptateur pg (base reelle)', () => {
  beforeAll(async () => {
    await query(`DROP TABLE IF EXISTS ${TABLE}`);
    await query(`
      CREATE TABLE ${TABLE} (
        id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug   text UNIQUE,
        kind   text NOT NULL DEFAULT 'a',
        actif  boolean NOT NULL DEFAULT true,
        n      integer,
        titre  text
      )
    `);
    await query(`
      INSERT INTO ${TABLE} (slug, kind, actif, n, titre) VALUES
        ('un',   'a', true,  1, 'Premier'),
        ('deux', 'a', false, 2, 'Deuxieme'),
        ('trois','b', true,  3, 'Troisieme'),
        ('quatre','b', true,  4, 'Quatrieme')
    `);
  });

  afterAll(async () => {
    await query(`DROP TABLE IF EXISTS ${TABLE}`);
    await closePool();
  });

  it('select * renvoie toutes les lignes', async () => {
    const { data, error } = await from(TABLE).select('*');
    expect(error).toBeNull();
    expect(data).toHaveLength(4);
  });

  it('.eq filtre sur la colonne ET sur la valeur', async () => {
    const { data } = await from(TABLE).select('*').eq('slug', 'un');
    expect(data).toHaveLength(1);
    expect((data as { slug: string }[])[0].slug).toBe('un');
  });

  // Le test qui compte : c'est le garde-fou P0 des brouillons du CMS.
  it('.eq(boolean) se traduit en WHERE, pas en filtre JS', async () => {
    const { data } = await from(TABLE).select('*').eq('actif', true);
    expect(data).toHaveLength(3);
    for (const l of data as { actif: boolean }[]) {
      expect(l.actif).toBe(true);
    }
  });

  it('.neq exclut bien les lignes', async () => {
    const { data } = await from(TABLE).select('*').neq('kind', 'a');
    expect(data).toHaveLength(2);
  });

  it('.in avec plusieurs valeurs', async () => {
    const { data } = await from(TABLE).select('*').in('slug', ['un', 'trois']);
    expect(data).toHaveLength(2);
  });

  // Cas limite : une liste vide ne doit pas devenir « pas de filtre »,
  // ce qui exposerait toute la table.
  it('.in([]) ne renvoie rien au lieu de tout', async () => {
    const { data } = await from(TABLE).select('*').in('slug', []);
    expect(data).toHaveLength(0);
  });

  it('.order + .limit', async () => {
    const { data } = await from(TABLE).select('*').order('n', { ascending: false }).limit(2);
    expect(data).toHaveLength(2);
    expect((data as { n: number }[])[0].n).toBe(4);
  });

  it('.match teste plusieurs colonnes', async () => {
    const { data } = await from(TABLE).select('*').match({ slug: 'trois', kind: 'b' });
    expect(data).toHaveLength(1);
  });

  it('.maybeSingle renvoie la ligne unique', async () => {
    const { data, error } = await from(TABLE).select('*').eq('slug', 'un').maybeSingle();
    expect(error).toBeNull();
    expect((data as { slug: string }).slug).toBe('un');
  });

  it('.maybeSingle signale une ambiguite au lieu de trancher', async () => {
    const { data, error } = await from(TABLE).select('*').maybeSingle();
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it('head + count renvoie le compte sans ligne', async () => {
    // `count` est un champ du resultat, pas une propriete de `data`.
    // C'est la forme que le SDK Supabase expose, et celle qu utilisent
    // /api/health et /api/cockpit (`const { count } = await ...select(
    // '*', { count: 'exact', head: true })`). Hacher le compte dans
    // `data` rendrait ces deux appels `undefined` sans erreur visible :
    // `count ?? 0` vaut 0, donc le tableau de bord afficherait « 0 lead »
    // au lieu de lever une erreur.
    const { data, count, error } = await from(TABLE).select('*', { head: true, count: 'exact' });
    expect(error).toBeNull();
    expect(count).toBe(4);
    // `head: true` ne transfere aucune ligne.
    expect(data).toBeNull();
  });

  // ---- .or(), la requete sensible du portage ------------------
  it('orChamps traduit un OU a trois branches', async () => {
    // Recette avant insertion : les tests ne doivent pas dependre de
    // l'ordre d'execution, et les lignes ajoutees plus bas
    // (kind par defaut = 'a') modifieraient le compte.
    await query(`DELETE FROM ${TABLE} WHERE slug = $1`, ['piege']);
    const { data, error } = await from(TABLE)
      .select('*')
      .orChamps([
        { colonne: 'kind', valeur: 'a' },
        { colonne: 'n', valeur: 4 },
        { colonne: 'titre', valeur: 'Troisieme' },
      ]);
    expect(error).toBeNull();
    // kind='a' -> 'un' et 'deux' (2) ; n=4 -> 'quatre' ; titre='Troisieme'
    // -> 'trois'. Les trois branches ne se recouvrent pas : 4 lignes.
    expect(data).toHaveLength(4);
  });

  // Le defaut que le portage corrige : le code construisait
  // `pole.eq.${m.pole}` par concatenation, donc un pole contenant une
  // virgule ('Tech, Digital') inserait une branche supplementaire et
  // elargissait la lecture des taches.
  it('orChamps traite une valeur contenant une virgule comme UNE valeur', async () => {
    await query(`INSERT INTO ${TABLE} (slug, titre) VALUES ($1, $2)`, [
      'piege',
      'avec,virgule',
    ]);
    const { data, error } = await from(TABLE)
      .select('*')
      .orChamps([
        { colonne: 'titre', valeur: 'avec,virgule' },
        { colonne: 'slug', valeur: 'quatre' },
      ]);
    expect(error).toBeNull();
    // Les deux branches : le piege ET 'quatre'. L'interpretation
    // involontaire ('titre = avec' OU 'slug = quatre') aurait-la
    // laissee hors du resultat.
    const slugs = (data as { slug: string }[]).map((l) => l.slug).sort();
    expect(slugs).toEqual(['piege', 'quatre']);
  });

  it('orChamps refuse un nom de colonne hostile', async () => {
    const { error } = await from(TABLE)
      .select('*')
      .orChamps([{ colonne: 'slug; DROP TABLE members; --', valeur: 'un' }]);
    expect(error).not.toBeNull();
  });

  it("l'ancien .or(chaine) reste accepte pour une valeur simple", async () => {
    const { data, error } = await from(TABLE)
      .select('*')
      .or('slug.eq.quatre,slug.eq.trois');
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
  });

  // Le format texte reste ambigu, donc il refuse au lieu de deviner.
  it('.or(chaine) refuse une valeur contenant une virgule plutot que de mal.split()', () => {
    expect(() => from(TABLE).select('*').or('titre.eq.avec,virgule')).toThrow(/orChamps/);
  });

  it('.or refuse un operateur inconnu plutot que de l\'inventer', () => {
    expect(() => from(TABLE).select('*').or('n.gt.3,slug.eq.un')).toThrow();
  });

  it('.or refuse une expression malformee', () => {
    expect(() => from(TABLE).select('*').or('bruit')).toThrow();
  });

  // ---- Ecritures -----------------------------------------------
  it('insert puis lecture', async () => {
    const { error } = await from(TABLE).insert({ slug: 'cinq', titre: 'Cinquieme' });
    expect(error).toBeNull();
    const { data } = await from(TABLE).select('*').eq('slug', 'cinq');
    expect(data).toHaveLength(1);
  });

  it('insert multi-lignes', async () => {
    const { error } = await from(TABLE).insert([
      { slug: 'six', titre: 'Sixieme' },
      { slug: 'sept', titre: 'Septieme' },
    ]);
    expect(error).toBeNull();
    const { data } = await from(TABLE).select('*').in('slug', ['six', 'sept']);
    expect(data).toHaveLength(2);
  });

  it('update ne touche que les lignes du filtre', async () => {
    const { error } = await from(TABLE).update({ titre: 'Renomme' }).eq('slug', 'un');
    expect(error).toBeNull();
    const { data } = await from(TABLE).select('*');
    const renommes = (data as { titre: string }[]).filter((l) => l.titre === 'Renomme');
    expect(renommes).toHaveLength(1);
  });

  // Garde-fou : sans WHERE, un UPDATE toucherait toute la table. Le
  // role applicatif detient tous les droits, donc cette barriere est
  // la seule.
  it('update sans filtre est refuse', async () => {
    const { error } = await from(TABLE).update({ titre: 'Catastrophe' });
    expect(error).not.toBeNull();
    const { data } = await from(TABLE).select('*').eq('titre', 'Catastrophe');
    expect(data).toHaveLength(0);
  });

  it('delete sans filtre est refuse', async () => {
    const { error } = await from(TABLE).delete();
    expect(error).not.toBeNull();
    const { count } = await from(TABLE).select('*', { head: true, count: 'exact' });
    expect(count).toBeGreaterThan(0);
  });

  // ---- Non-regression : la forme reellement utilisee par server.ts --
  //
  // Ce test existe parce que le contrat a deja change une fois. Le
  // compte etaitInitially rendu dans `data` ({ count: 4 }) ; il est
  // desormais `result.count`. Les 30 autres tests passaient dans les
  // deux cas — ils lisaient ce que l'adaptateur faisait. Ceui-la
  // ecrit la forme de l'appelant reel, donc un retour a l'ancien
  // contrat echouerait ici.
  //
  // Copie de /api/cockpit, qui enchaine quatre compteurs :
  //   const leadsRes = await sb.from('leads').select('*', { count: 'exact', head: true });
  //   const leads = leadsRes.count ?? 0;
  it('supporte la forme const { count } = await ... (cockpit)', async () => {
    // Le nombre de lignes evolue au fil de la suite (d'autres tests
    // inserent), donc on ne fige pas la valeur : on compare deux
    // mesures. Une suite de tests qui depend de son propre ordre
    // d'execution finit par rapporter un echec sur du code correct.
    const { count: total } = await from(TABLE).select('*', { count: 'exact', head: true });
    const { count: filtre } = await from(TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('kind', 'a');
    const { count: aucun } = await from(TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('kind', 'valeur-inexistante');

    // `?? 0` ne doit jamais s'appliquer : un compteur absent doit
    // rester undefined pour etre distingue d'un zero reel.
    expect(total).toBeGreaterThan(0);
    expect(filtre).toBeGreaterThan(0);
    // Le filtre retrecit bien : c'est ce qui distingue un `WHERE`
    // reellement applique d'un `COUNT(*)` sur table entiere.
    expect(filtre).toBeLessThan(total);
    // Un filtre qui ne correspond a rien vaut 0, pas undefined.
    expect(aucun).toBe(0);
  });

  it('delete avec filtre supprime la ligne', async () => {
    await from(TABLE).delete().eq('slug', 'sept');
    const { data } = await from(TABLE).select('*').eq('slug', 'sept');
    expect(data).toHaveLength(0);
  });

  it('upsert met a jour sur conflit', async () => {
    await from(TABLE)
      .upsert({ slug: 'un', titre: 'Apres upsert' }, { onConflict: 'slug' })
      .select('*');
    const { data } = await from(TABLE).select('*').eq('slug', 'un');
    expect((data as { titre: string }[])[0].titre).toBe('Apres upsert');
  });

  it("upsert ignoreDuplicates n'ecrase pas la ligne existante", async () => {
    await from(TABLE)
      .upsert({ slug: 'un', titre: 'Ignore' }, { onConflict: 'slug', ignoreDuplicates: true })
      .select('*');
    const { data } = await from(TABLE).select('*').eq('slug', 'un');
    expect((data as { titre: string }[])[0].titre).toBe('Apres upsert');
  });

  it('une violation d unicite remonte error.code 23505', async () => {
    const { error } = await from(TABLE).insert({ slug: 'un', titre: 'Doublon' });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23505');
  });

  // ---- Noms de colonnes ----------------------------------------
  // Un nom de colonne ne peut pas etre parametre lie : il vient du
  // code. On verifie malgre tout, parce que la consequence d'un
  // identifiant controllable serait une injection.
  it('un nom de colonne hostile est refuse', async () => {
    const { error } = await from(TABLE)
      .select('*')
      .eq('slug = $1; DROP TABLE members; --', 'un');
    expect(error).not.toBeNull();
  });

  it('une table inexistante donne une erreur, pas une exception', async () => {
    const { error } = await from('table_qui_nexiste_pas').select('*');
    expect(error).not.toBeNull();
  });

  it("une chaine attendue deux fois n'execute qu'une requete", async () => {
    const q = from(TABLE).select('*').eq('slug', 'deux');
    const [a, b] = await Promise.all([q, q]);
    expect((a.data as unknown[]).length).toBe(1);
    expect((b.data as unknown[]).length).toBe(1);
  });
});
