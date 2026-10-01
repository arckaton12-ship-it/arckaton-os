// ============================================================
//  Adaptateur PostgREST -> SQL
//
//  Pourquoi cet adaptateur existe : l'inventaire de `server.ts` a
//  montre que le SDK Supabase n'y sert QUE de client PostgREST
//  generique — 11 tables, zero jointure, zero transaction multi-
//  tables — plus 6 appels d'identite traites a part (voir
//  src/db/auth.ts). Reecrire les 41 endpoints en SQL a la main
//  serait 41 occasions de reecrire une regle d'autorisation, donc
//  41 occasions de l'exposer.
//
//  On garde la forme des appels existants, et on traduit en SQL
//  parametre :
//
//      from('tasks').select('*').eq('statut', 'a_faire')
//
//  Le contrat de retour reste `{ data, error }`, y compris
//  `error.message` et `error.code === '23505'`, utilise par
//  POST /api/quotes pour retenter un numero de devis.
//
//  CE QUE CET ADAPTATEUR NE FAIT PAS : il n'invente aucune regle
//  d'autorisation. Toute la securite reste dans `server.ts`. Voir
//  migrations/001_roles.sql pour le raisonnement.
//
//  Surface couverte, relevee sur les 41 endpoints :
//    select / eq / neq / or / in / like / match / lt / order /
//    limit / insert / update / delete / upsert /
//    maybeSingle / single / count+head
// ============================================================
import { query } from './pool';
import type { QueryResultRow } from 'pg';

// ------------------------------------------------------------
//  Types
// ------------------------------------------------------------
export interface DbError extends Error {
  code?: string;
  /** Nom de la contrainte violee, quand PostgreSQL en fournit un. */
  constraint?: string;
}

export type RowSet<T> = T | T[] | null;

export interface Result<T> {
  data: RowSet<T>;
  error: DbError | null;
  /**
   * Nombre de lignes correspondant aux filtres, quand la requete
   * demande un compte (`select('*', { count: 'exact' })` ou
   * `.count('exact')`).
   *
   * Il est expose comme champ a part et non/cache dans `data` : c'est
   * ce que fait PostgREST, donc `const { count, error } = await ...`
   * — la forme utilisee par /api/health et /api/settings — continue
   * de fonctionner. Hacher le compte dans `data` aurait produit un
   * objet `{count}` la ou le code attendait un tableau, en mode head.
   */
  count?: number;
}

/**
 * Un nom de colonne ou de table ne peut pas etre un parametre lie :
 * PostgreSQL attend un identifiant a cet endroit. Ces noms viennent
 * donc du code, jamais du client — mais on le verifie plutot que de
 * le presumer, parce que la consequence d'un identifiant devenu
 * controllable serait une injection SQL.
 *
 * Le controle est volontairement LACHE : n'importe quelle suite de
 * caracteres est acceptee ici, et c'est `verifierIdentifiant` — appele
 * au moment de construire le SQL — qui refuse ce qui n'est pas un
 * simple nom. Ainsi, un nom hostile produit une `error` retournee,
 * comme le reste des erreurs de l'adaptateur, au lieu d'une exception
 * synchronisee que l'appelant devraitrofler.
 */
function verifierIdentifiant(nom: string): string {
  if (typeof nom !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(nom)) {
    throw new Error('Identifiant SQL invalide : ' + String(nom));
  }
  return '"' + nom + '"';
}

/** Lourd : a n'appeler que sur une liste de noms deja known. */
function verifierTous(noms: string[]): string[] {
  return noms.map(verifierIdentifiant);
}

/**
 * Colonnes `jsonb` du schema.
 *
 * Liste explicite plutot qu'une detection a l'ecution : le type
 * PostgreSQL d'une colonne ne se connait qu'en interrogeant
 * `information_schema` a chaque requete, ce qui coutait un aller-
 * retour supplementaire. Elle est donc figee ici, avec une consequence
 * assumee : ajouter une colonne jsonb dans une migration oblige a
 * l'ajouter ici. Un test (`tests/schema.constraints.test.ts`) compare
 * cette liste a `information_schema`, donc l'oubli est detecte au
 * lieu de corrompre des donnees en silence.
 */
const COLONNES_JSONB = new Set([
  'activity_log.details',
  'agent_reports.recommendations',
  'content_items.data',
  'members.permissions',
  'projects.deliverables',
  'projects.feedbacks',
  'projects.jalons',
  'projects.sorties_terrain',
  'quotes.items',
]);

/** JSON stocke dans `members.permissions`, utilisé par `hasPerm`. */
export function estColonneJsonb(table: string, colonne: string): boolean {
  return COLONNES_JSONB.has(`${table}.${colonne}`);
}

/**
 * Prepare une valeur pour un parametre lie.
 *
 * Le point delicat est le JSON. `node-postgres` convertit un tableau
 * JavaScript en litteral de tableau PostgreSQL (`{a,b}`), pas en JSON.
 * Lie comme ca, `permissions: []` arrivait dans une colonne `jsonb`
 * sous la forme `{}` — un objet vide, pas un tableau vide — et
 * `permissions: ['devis']` devenait `{devis}`.
 *
 * Deux consequences, silencieuses toutes les deux :
 *   - `Array.isArray(member.permissions)` renvoie `false`, donc
 *     `hasPerm` accorde systematiquement rien : un membre configure
 *     perdait tous ses droits sans qu'aucune erreur ne soit levee ;
 *   - l'interface lisait `permissions` comme un objet, et une
 *     edition de contenu ecrasee par `{}` detruisait la donnee.
 *
 * La conversion est donc explicite pour ces colonnes, et le
 * controle de bout en bout verifie qu'un membre cree retrouve
 * exactement les droits qu'on lui a donnes.
 */
function valeurPourLiaison(
  table: string,
  colonne: string,
  valeur: unknown,
): unknown {
  if (valeur === null || valeur === undefined) return valeur;
  if (estColonneJsonb(table, colonne) && typeof valeur !== 'string') {
    return JSON.stringify(valeur);
  }
  // Un objet simple envoye vers une colonne texte doit devenir sa
  // representation textuelle, sinon `pg` refuse le parametre
  // (« invalid input syntax » ou « cannot convert »).
  if (
    typeof valeur === 'object' &&
    !Buffer.isBuffer(valeur) &&
    !estColonneJsonb(table, colonne)
  ) {
    return JSON.stringify(valeur);
  }
  return valeur;
}

function direction(ascending: boolean): 'ASC' | 'DESC' {
  return ascending ? 'ASC' : 'DESC';
}

function erreurPostgres(err: unknown): DbError {
  const e = err as { message?: string; code?: string; constraint?: string };
  const out = new Error(e?.message || 'Erreur requete base de donnees') as DbError;
  if (e?.code) out.code = e.code;
  // `constraint` est recopie pour que `violatedConstraint()` puisse
  // dire QUELLE regle a ete violee. Le message de PostgreSQL ne le
  // contient pas toujours, et le traduire par motif de texte serait
  // fragile.
  if (e?.constraint) out.constraint = e.constraint;
  return out;
}

/**
 * Accumulateur de parametres lies. Les valeurs ne sont jamais
 * interpolees dans le SQL : chaque filtre recoit son numero au
 * moment ou il est construit, ce qui garantit que l'ordre du SQL et
 * l'ordre de `values` ne peuvent pas diverger.
 */
class Params {
  readonly values: unknown[] = [];
  push(v: unknown): string {
    this.values.push(v);
    return '$' + this.values.length;
  }
}

/** Un predicat, construit a la demande avec son numero de parametre. */
type Predicat = (p: Params) => string;

type Operation = 'lecture' | 'insertion' | 'mise_a_jour' | 'suppression';

interface Ecriture {
  lignes: Record<string, unknown>[];
  onConflict: string[] | null;
  ignoreDuplicates: boolean;
}

// ------------------------------------------------------------
//  Constructeur de requete
// ------------------------------------------------------------
export class DbTable {
  private readonly table: string;
  private operation: Operation = 'lecture';

  private predicats: Predicat[] = [];
  private ordres: { colonne: string; ascending: boolean }[] = [];
  private limite: number | null = null;

  private ecriture: Ecriture | null = null;
  private selection: string | null = null;
  private headOnly = false;
  private wantsCount = false;

  private resultat: Promise<Result<QueryResultRow>> | null = null;
  private singleMode: 'peutEtre' | 'exactement' | null = null;

  constructor(table: string) {
    this.table = verifierIdentifiant(table);
  }

  // ---- Lecture -------------------------------------------------
  select(colonnes = '*', options?: { count?: string; head?: boolean }): this {
    this.selection = colonnes;
    if (options?.head) this.headOnly = true;
    if (options?.count) this.wantsCount = true;
    return this;
  }

  /** `count('exact')` — le nombre de lignes correspondant aux filtres. */
  count(_precision: 'exact' | 'planned' = 'exact'): this {
    this.wantsCount = true;
    return this;
  }

  // Les noms de colonnes ne sont valides qu'a la construction du SQL,
  // pas ici : voir `verifierIdentifiant`. Un nom hostile doit produire
  // une `error` retournee, pas une exception que l'appelant ne
  // serait pas cense attendre d'un `await`.
  eq(cle: string, valeur: unknown): this {
    this.predicats.push(
      (p) => `${verifierIdentifiant(cle)} = ${p.push(valeurPourLiaison(this.table, cle, valeur))}`
    );
    return this;
  }

  neq(cle: string, valeur: unknown): this {
    this.predicats.push(
      (p) => `${verifierIdentifiant(cle)} <> ${p.push(valeurPourLiaison(this.table, cle, valeur))}`
    );
    return this;
  }

  lt(cle: string, valeur: unknown): this {
    this.predicats.push(
      (p) => `${verifierIdentifiant(cle)} < ${p.push(valeurPourLiaison(this.table, cle, valeur))}`
    );
    return this;
  }

  like(cle: string, motif: unknown): this {
    this.predicats.push((p) => `${verifierIdentifiant(cle)} LIKE ${p.push(motif)}`);
    return this;
  }

  /** `in('statut', ['brouillon', 'envoye'])` */
  in(cle: string, valeurs: unknown[]): this {
    const liste = Array.isArray(valeurs) ? valeurs : [valeurs];
    // `IN ()` est invalide en SQL. Une liste vide doit signifier
    // « aucune ligne », pas « pas de filtre » : ce second cas
    // exposerait toute la table.
    if (liste.length === 0) {
      this.predicats.push(() => 'false');
      return this;
    }
    this.predicats.push((p) => {
      const c = verifierIdentifiant(cle);
      return `${c} IN (${liste.map((v) => p.push(valeurPourLiaison(this.table, cle, v))).join(', ')})`;
    });
    return this;
  }

  /** Egalite sur plusieurs colonnes : `.match({ ref, slug })`. */
  match(objet: Record<string, unknown>): this {
    for (const [cle, valeur] of Object.entries(objet)) {
      this.eq(cle, valeur);
    }
    return this;
  }

  /**
   * OU logique, comme `.or('a.eq.1,b.eq.2')`.
   *
   * C'etait la SEULE requete `.or()` de l'application :
   *   `.or(\`cree_par.eq.${m.id},assigne_a.eq.${m.id},pole.eq.${m.pole}\`)`
   *
   * Ces valeurs etaient interpolees dans une chaine PostgREST, donc
   * interpretees par le serveur de requetes. Elles viennent de la base
   * (`m.id` est un UUID, `m.pole` une colonne texte modifiable par un
   * admin), donc l'exploitation demande deja un acces admin — mais un
   * simple `pole` contenant une virgule suffisait a deformer la
   * condition et a elargir la lecture.
   *
   * Ici chaque valeur devient un parametre lie. Un `pole` avec une
   * virgule est desormais compare comme une chaine entiere.
   */
  /**
   * OU logique, structurel.
   *
   * C'etait la SEULE requete `.or()` de l'application :
   *   `.or(\`cree_par.eq.${m.id},assigne_a.eq.${m.id},pole.eq.${m.pole}\`)`
   *
   * Elle etait construite par concatenation, puis PostgREST
   * l'interpreiait. Deux problemes, corriges ici :
   *
   *   1. Les valeurs venaient de la base (`m.id` est un UUID, `m.pole`
   *      une colonne texte modifiable par un admin). Un `pole` contenant
   *      une virgule suffisait a deformer la condition et a elargir la
   *      lecture — un pole s'appelle « Tech, Digital » dans un organigramme
   *      a deux lignes, ce n'est pas hypotetique.
   *   2. Analyser une chaine pour deviner ou commence la valeur est
   *      ambigu par construction. On ne le fait donc pas : la structure
   *      est passee telle quelle, chaque valeur devient un parametre lie.
   *
   *   `orChamps([{ colonne, valeur }, …])` est donc l'API a utiliser.
   *   `.or(chaine)` reste accepte pour compatibilite, mais n'accepte que
   *   des valeurs sans virgule — et le signale plutot que de mal
   *   interpreter.
   */
  orChamps(branches: { colonne: string; valeur: unknown }[]): this {
    if (!Array.isArray(branches) || branches.length === 0) {
      // Aucune branche : aucune ligne. Comme pour `.in([])`, on ne
      // laisse pas « pas de filtre » se glisser la.
      this.predicats.push(() => 'false');
      return this;
    }
    this.predicats.push((p) => {
      const sql = branches
        .map((b) => `${verifierIdentifiant(b.colonne)} = ${p.push(valeurPourLiaison(this.table, b.colonne, b.valeur))}`)
        .join(' OR ');
      return `(${sql})`;
    });
    return this;
  }

  /**
   * OU logique a partir d'une chaine PostgREST (`'a.eq.1,b.eq.2'`).
   *
   * Format de chaque branche : `colonne.eq.valeur`. Seul `eq` est
   * accepte — c'est le seul utilise, et refuser le reste evite
   * d'implementer une grammaire de mini-SQL cote serveur.
   *
   * ATTENTION, limite assumee : la separation des branches se fait sur
   * la virgule, donc une valeur qui en contient une est rejetee plutot
   * que devinee. C'est le comportement voulu : une erreur franche vaut
   * mieux qu'un `WHERE` different de l'intention. Utilisez
   * `orChamps` des qu'une valeur peut contenir une virgule.
   */
  or(expression: string): this {
    const morceaux = String(expression)
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    if (morceaux.length === 0) {
      this.predicats.push(() => 'false');
      return this;
    }

    // Analyse avant toute requete : une expression malformee doit
    // echouer ici, pas produire un SQL different de l'intention.
    const branches: { colonne: string; valeur: string }[] = [];
    for (const morceau of morceaux) {
      const parties = morceau.split('.');
      if (parties.length < 3) {
        throw new Error(
          'Expression .or() mal formee : ' + morceau + ' (utilisez orChamps pour une valeur contenant une virgule)'
        );
      }
      const [, operateur, ...reste] = parties;
      if (operateur !== 'eq') {
        throw new Error('Operateur .or() non supporte : ' + operateur);
      }
      // `reste.join('.')` : une valeur peut contenir un point (un nom
      // de domaine, une version). Seul le point suivant le nom de
      // colonne est un separateur.
      branches.push({ colonne: parties[0], valeur: reste.join('.') });
    }
    return this.orChamps(branches);
  }

  order(cle: string, options?: { ascending?: boolean }): this {
    this.ordres.push({ colonne: cle, ascending: options?.ascending !== false });
    return this;
  }

  limit(n: number): this {
    this.limite = n;
    return this;
  }

  maybeSingle(): Promise<Result<QueryResultRow>> {
    this.singleMode = 'peutEtre';
    return this.lancer();
  }

  single(): Promise<Result<QueryResultRow>> {
    this.singleMode = 'exactement';
    return this.lancer();
  }

  // ---- Ecriture ------------------------------------------------
  insert(valeurs: Record<string, unknown> | Record<string, unknown>[]): this {
    this.operation = 'insertion';
    this.ecriture = {
      lignes: Array.isArray(valeurs) ? valeurs : [valeurs],
      onConflict: null,
      ignoreDuplicates: false,
    };
    return this;
  }

  update(valeurs: Record<string, unknown>): this {
    this.operation = 'mise_a_jour';
    this.ecriture = { lignes: [valeurs], onConflict: null, ignoreDuplicates: false };
    return this;
  }

  upsert(
    valeurs: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): this {
    this.operation = 'insertion';
    this.ecriture = {
      lignes: Array.isArray(valeurs) ? valeurs : [valeurs],
      onConflict: options?.onConflict
        ? options.onConflict
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean)
        : null,
      ignoreDuplicates: options?.ignoreDuplicates === true,
    };
    return this;
  }

  delete(): this {
    this.operation = 'suppression';
    return this;
  }

  // ---- Terminaison ---------------------------------------------
  /**
   * `server.ts` fait `await sb.from(...)` : la chaine doit donc
   * etre alors meme. Une chaine executee deux fois ne le fait qu'une
   * fois — sans cela, `const { data } = await q` suivi d'un second
   * `await q` taperait deux fois la base.
   */
  then(
    onFulfilled?: (v: Result<QueryResultRow>) => unknown,
    onRejected?: (e: unknown) => unknown,
  ): Promise<unknown> {
    return this.lancer().then(onFulfilled, onRejected);
  }

  private lancer(): Promise<Result<QueryResultRow>> {
    if (!this.resultat) {
      // La construction du SQL est encapsulee : une exception
      // (identifiant invalide, expression malformee) doit devenir un
      // `error` retourne, pas un rejet non rattrape qui remonterait
      // jusqu'au middleware Express.
      this.resultat = Promise.resolve()
        .then(() => this.versSql())
        .then(({ sql, params }) => this.executer(sql, params))
        .catch((err) => ({ data: null, error: erreurPostgres(err) }));
    }
    return this.resultat;
  }

  private async executer(
    sql: string,
    params: unknown[],
  ): Promise<Result<QueryResultRow>> {
    const res = await query(sql, params);
    if (res.error) {
      return { data: null, error: erreurPostgres(res.error) };
    }

    let data: RowSet<QueryResultRow> = res.data;

    if (this.singleMode) {
      // PostgREST leve une erreur sur plusieurs lignes, dans les deux
      // cas (`single` et `maybeSingle`). On s'y tient : le code
      // appelant teste `error`, pas le nombre de lignes.
      if (res.data.length > 1) {
        return { data: null, error: new Error('Plusieurs lignes renvoyees') };
      }
      // `single()` refuse aussi ZERO ligne (PGRST116), ce que
      // `maybeSingle()` tolere.
      //
      // La difference est visible sur PATCH /api/members/:id : sans
      // elle, modifier un identifiant inexistant renvoyait 200 avec
      // `{ member: null }`, et l'interface affichait « membre
      // enregistre » alors que rien n'avait ete touche.
      if (res.data.length === 0 && this.singleMode === 'exactement') {
        return { data: null, error: new Error('Aucune ligne renvoyee') };
      }
      data = res.data[0] ?? null;
    }

    if (this.headOnly) {
      // `head: true` ne demande que le compte : aucune ligne n'est
      // transferee.
      data = null;
    }

    if (this.wantsCount) {
      return { data, error: null, count: res.count ?? 0 };
    }

    return { data, error: null };
  }

  // ---- Construction du SQL -------------------------------------

  /**
   * Colonnes a renvoyer apres une ecriture, ou `null` si rien n'est
   * demande.
   *
   * PostgREST ne renvoie les lignes ecrites que si le client les a
   * demandees : `.insert(x)` seul renvoie `null`, `.insert(x).select()`
   * renvoie la ligne creee. `single()` et `maybeSingle()` impliquent
   * une selection — c'est leur raison d'etre.
   *
   * Sans `RETURNING`, l'adaptateur executait l'ecriture puis renviait
   * un tableau vide, donc `res.json({ member })` serialisait `null`.
   * Le code HTTP restait 201, ce qui est le pire cas : une creation
   * reussie affichee comme un membre inexistant. Detecte par le
   * controle de bout en bout, pas par les tests unitaires — ceux-ci
   * lisaient la meme forme de retour que celle qu'ils testaient.
   */
  private colonnesEnRetour(): string | null {
    if (this.selection) return this.selection === '*' ? '*' : this.selection;
    if (this.singleMode) return '*';
    return null;
  }

  private versSql(): { sql: string; params: unknown[] } {
    const p = new Params();
    const enRetour = this.colonnesEnRetour();

    switch (this.operation) {
      case 'lecture':
        return { sql: this.sqlSelect(p), params: p.values };
      case 'suppression': {
        const where = this.sqlWhere(p);
        // Un DELETE sans WHERE viderait la table. Sur Supabase, le
        // role etait bride par ses politiques ; ici il ne l'est pas,
        // donc on refuse plutot que d'executer.
        if (!where) {
          throw new Error('DELETE sans filtre refuse : restreignez la portee.');
        }
        const retour = enRetour ? ` RETURNING ${enRetour}` : '';
        return { sql: `DELETE FROM ${this.table}${where}${retour}`, params: p.values };
      }
      case 'mise_a_jour': {
        const set = this.sqlSet(p);
        if (!set) {
          throw new Error('UPDATE sans colonne a modifier.');
        }
        const where = this.sqlWhere(p);
        // Meme raison que pour le DELETE : un UPDATE sans WHERE
        // modifierait toutes les lignes de la table. Le role
        // applicatif detient tous les droits, donc la seule barriere
        // est ici.
        if (!where) {
          throw new Error('UPDATE sans filtre refuse : restreignez la portee.');
        }
        const retour = enRetour ? ` RETURNING ${enRetour}` : '';
        return { sql: `UPDATE ${this.table} SET ${set}${where}${retour}`, params: p.values };
      }
      case 'insertion': {
        const { lignes, onConflict, ignoreDuplicates } = this.ecriture!;
        if (lignes.length === 0) {
          return { sql: 'SELECT 1 WHERE false', params: [] };
        }

        // L'union des colonnes de toutes les lignes : une insertion
        // multi-lignes peut ne pas fournir les memes cles partout.
        const colonnes = [...new Set(lignes.flatMap((l) => Object.keys(l)))];
        const tuples = lignes.map((ligne) => {
          const valeurs = colonnes.map((c) => {
            const v = (ligne as Record<string, unknown>)[c];
            return v === undefined ? 'DEFAULT' : p.push(valeurPourLiaison(this.table, c, v));
          });
          return `(${valeurs.join(', ')})`;
        });

        let sql =
          `INSERT INTO ${this.table} (${verifierTous(colonnes).join(', ')}) ` +
          `VALUES ${tuples.join(', ')}`;

        if (onConflict && onConflict.length > 0) {
          const cible = verifierTous(onConflict).join(', ');
          if (ignoreDuplicates) {
            // `ON CONFLICT DO NOTHING` : c'est ce qu'attend
            // persistOutbox pour ne pas renvoyer deux fois le meme
            // message WhatsApp.
            //
            // `RETURNING` ne rend alors AUCUNE ligne si le conflit a
            // eu lieu — ce qui est le comportement attendu : rien n'a
            // ete ecrit, donc rien a renvoyer. Ne pas mettre
            // `DO UPDATE` ici : cela reecrirait une ligne deja
            // presente et enverrait un message WhatsApp en double.
            sql += ` ON CONFLICT (${cible}) DO NOTHING`;
          } else {
            const maj = this.sqlMajDepuisExcluded(colonnes);
            sql += ` ON CONFLICT (${cible}) DO UPDATE SET ${maj}`;
          }
        }

        if (enRetour) sql += ` RETURNING ${enRetour}`;

        return { sql, params: p.values };
      }
    }
  }

  private sqlSelect(p: Params): string {
    const projection = this.projectionSql();
    const where = this.sqlWhere(p);
    let sql = `SELECT ${projection} FROM ${this.table}${where}`;

    if (this.ordres.length > 0) {
      sql +=
        ' ORDER BY ' +
        this.ordres.map((o) => `${o.colonne} ${direction(o.ascending)}`).join(', ');
    }
    // `LIMIT` prend un entier, pas un parametre lie. La valeur vient
    // du code et a ete normalisee en nombre : on la revalide plutot
    // que d'inserer quoi que ce soit d'externe.
    if (this.limite !== null) {
      const n = Number(this.limite);
      if (!Number.isInteger(n) || n < 0) {
        throw new Error('LIMIT invalide : ' + String(this.limite));
      }
      sql += ` LIMIT ${n}`;
    }
    return sql;
  }

  private projectionSql(): string {
    if (this.headOnly) return '1';
    if (!this.selection || this.selection.trim() === '*') return '*';
    const colonnes = this.selection
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    return verifierTous(colonnes).join(', ');
  }

  private sqlWhere(p: Params): string {
    if (this.predicats.length === 0) return '';
    return ' WHERE ' + this.predicats.map((pred) => pred(p)).join(' AND ');
  }

  private sqlSet(p: Params): string {
    const ligne = this.ecriture?.lignes[0] ?? {};
    return Object.entries(ligne)
      .map(
        ([cle, valeur]) =>
          `${verifierIdentifiant(cle)} = ${p.push(valeurPourLiaison(this.table, cle, valeur))}`
      )
      .join(', ');
  }

  private sqlMajDepuisExcluded(colonnes: string[]): string {
    // `excluded` designe la ligne qui n'a pas ete inseree. La PK est
    // exclue : la reassigner Nullifierait la ligne.
    const cibles = colonnes.filter((c) => c !== 'id');
    if (cibles.length === 0) {
      // Rien a mettre a jour : la ligne est deja identique, ou n'existe
      // pas. `DO NOTHING` est le comportement correct et sans risque.
      return 'true WHERE false';
    }
    return cibles
      .map((c) => {
        const col = verifierIdentifiant(c);
        return `${col} = excluded.${col}`;
      })
      .join(', ');
  }
}

// ------------------------------------------------------------
//  Point d'entree, identique a `sb.from(...)`
// ------------------------------------------------------------
export function from(table: string): DbTable {
  return new DbTable(table);
}

export { query, closePool, getPool } from './pool';

// ------------------------------------------------------------
//  Re Narrowissement des resultats
//
//  `Result.data` est volontairement `T | T[] | null` : la forme exacte
//  depend de l'appel (`select` seul renvoie un tableau, `single` une
//  ligne, `head: true` rien). Un union oblige l'appelant a reduire le
//  type avant d'acceder a une colonne, sinon TypeScript refuse
//  `.titre` sur `T | T[] | null`.
//
//  Ces deux fonctions font cette reduction, a un seul endroit, sans
//  cast aveugle. Elles sont aussi tolerantes a l'ecart : si l'appelant
//  attend une ligne et recoit un tableau d'une seule ligne, elles
//  rendent cette ligne plutot que `null`.
//
//  Le type se deduit de l'argument (`T = typeof data[number]`) plutot
//  que d'etre impose : ecrire `enLignes<{ indexdef: string }>(data)`
//  sur un `QueryResultRow[]` est refuse par le compilateur, alors que
//  c'est precisement le cas d'usage voulu — nommer la forme attendue
//  aide a lire le code mais ne doit pas bloquer l'appel.
// ------------------------------------------------------------

/**
 * Resultat comme tableau de lignes.
 *
 * La surcharge accepte un `RowSet` plus large que le type demande : la
 * valeur vient de `query()`, dont le type de ligne est
 * `QueryResultRow` (un index `[string: any]` coming du pilote), et
 * nommer la forme attendue — `enLignes<{ indexdef: string }>(data)` —
 * doit rester possible sans passer par un `as` sur le resultat entier.
 */
export function enLignes<T>(data: RowSet<T>): T[];
export function enLignes<T>(data: RowSet<QueryResultRow>): T[];
export function enLignes<T>(data: RowSet<QueryResultRow> | RowSet<T>): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data == null) return [];
  return [data as T];
}

/** Resultat comme ligne unique, ou `null` si vide. */
export function enLigne<T>(data: RowSet<T>): T | null;
export function enLigne<T>(data: RowSet<QueryResultRow>): T | null;
export function enLigne<T>(data: RowSet<QueryResultRow> | RowSet<T>): T | null {
  if (Array.isArray(data)) return data.length > 0 ? (data[0] as T) : null;
  return (data as T) ?? null;
}

/**
 * Vrai si l'erreur est une violation d'unicite PostgreSQL (23505).
 *
 * C'est ce qui permet de distinguer deux echecs qui se presentent
 * pareil cote appelant : « cet email existe deja » (400, l'utilisateur
 * doit en choisir un autre) et « un administrateur existe deja »
 * (409, l'etat du systeme a change et le client doit recharger).
 *
 * Sans cette distinction, /api/auth/bootstrap renvoyait 400 « echec
 * d'enregistrement : duplicate key » quand un second bootstrap etait
 * refuse — c'est-a-dire un fonctionnement nominal — ce qui faisait
 * passer une protection functioning pour une panne de base.
 */
export function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === '23505';
}

/** Meme test, pour la cle de contrainte, quand le message ne suffit pas. */
export function violatedConstraint(err: unknown): string | null {
  const e = err as { constraint?: string } | null;
  return e?.constraint ?? null;
}
