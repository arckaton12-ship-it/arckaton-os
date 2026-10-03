import { describe, it, expect } from 'vitest';
import { __buildCockpitDigest } from '../server';

// Le cloisonnement du copilote est LA promesse de confidentialite : la
// Direction lit tout le cockpit (coordonnees comprises), un membre reste
// borne a son pole et ne recoit jamais les coordonnees des prospects.
//
// `buildCockpitDigest` accepte une couche de donnees injectable ; le faux
// ci-dessous applique reellement les filtres ET enregistre les contraintes
// posees. Sans ce test, supprimer un `.eq('pole', ...)` resterait invisible :
// les tests existants n'exercaient que le formatage d'un digest deja construit.

type Ligne = Record<string, unknown>;
type Reponse = { data: unknown[] | null; error: { message: string } | null };
type Filtre =
  | { op: 'eq' | 'neq'; colonne: string; valeur: unknown }
  | { op: 'in'; colonne: string; valeur: unknown[] }
  | { op: 'or'; branches: { colonne: string; valeur: unknown }[] };

interface FauxBuilder {
  select: () => FauxBuilder;
  order: () => FauxBuilder;
  limit: () => FauxBuilder;
  eq: (colonne: string, valeur: unknown) => FauxBuilder;
  neq: (colonne: string, valeur: unknown) => FauxBuilder;
  in: (colonne: string, valeur: unknown[]) => FauxBuilder;
  orChamps: (branches: { colonne: string; valeur: unknown }[]) => FauxBuilder;
  then: <T>(onFulfilled: (value: Reponse) => T) => Promise<T>;
}

function applique(f: Filtre, l: Ligne): boolean {
  switch (f.op) {
    case 'eq':
      return l[f.colonne] === f.valeur;
    case 'neq':
      return l[f.colonne] !== f.valeur;
    case 'in':
      return f.valeur.includes(l[f.colonne]);
    case 'or':
      return f.branches.some((b) => l[b.colonne] === b.valeur);
  }
}

function creerFauxCockpit(donnees: Record<string, Ligne[]>) {
  const requetes: { table: string; filtres: Filtre[] }[] = [];

  const from = (table: string): FauxBuilder => {
    const filtres: Filtre[] = [];
    requetes.push({ table, filtres });
    const q: FauxBuilder = {
      select: () => q,
      order: () => q,
      limit: () => q,
      eq: (colonne, valeur) => {
        filtres.push({ op: 'eq', colonne, valeur });
        return q;
      },
      neq: (colonne, valeur) => {
        filtres.push({ op: 'neq', colonne, valeur });
        return q;
      },
      in: (colonne, valeur) => {
        filtres.push({ op: 'in', colonne, valeur });
        return q;
      },
      orChamps: (branches) => {
        filtres.push({ op: 'or', branches });
        return q;
      },
      then: <T>(onFulfilled: (value: Reponse) => T): Promise<T> => {
        const lignes = (donnees[table] || []).filter((l) => filtres.every((f) => applique(f, l)));
        return Promise.resolve(onFulfilled({ data: lignes, error: null }));
      },
    };
    return q;
  };

  return { couche: { from }, requetes };
}

const JOUR = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const donnees: Record<string, Ligne[]> = {
  leads: [
    { name: 'Prospect Tech', pole_assigned: 'Tech', statut: 'nouveau', phone: '+237699000000', email: 'tech@exemple.cm', project_type: 'App', budget: '2M', source: 'site', created_at: JOUR(10) },
    { name: 'Prospect Digital', pole_assigned: 'Digital', statut: 'nouveau', phone: '+237655111222', email: 'digital@exemple.cm', project_type: 'Site', budget: '1M', source: 'site', created_at: JOUR(3) },
  ],
  tasks: [
    { titre: 'Tache Tech', pole: 'Tech', cree_par: 't1', assigne_a: 't1', priorite: 'haute', echeance: '2020-01-01', statut: 'en_cours' },
    { titre: 'Tache Digital', pole: 'Digital', cree_par: 'x', assigne_a: 'x', priorite: 'normale', echeance: '2020-01-01', statut: 'en_cours' },
  ],
  projects: [
    { client_name: 'Projet Tech', client_code: 'PRJ-T', pole: 'Tech', statut: 'en_cours', forfait: 'Synergie', progression: 40, deadline: '2026-12-01', chef_de_projet: 'Tech', created_at: JOUR(20) },
    { client_name: 'Projet Digital', client_code: 'PRJ-D', pole: 'Digital', statut: 'en_cours', forfait: 'Synergie', progression: 20, deadline: '2026-12-01', chef_de_projet: 'Digital', created_at: JOUR(15) },
  ],
  members: [
    { id: 't1', name: 'Membre Tech', role: 'membre', pole: 'Tech', poste_id: 'p3', poste_titre: 'Developpeur', active: true },
    { id: 'd1', name: 'Le Boss', role: 'admin', pole: 'Direction', poste_id: 'p1', poste_titre: "Chef d'agence", active: true },
  ],
  agent_reports: [
    { client_name: 'Contact Tech', pole: 'Tech', contact_info: 'tech@site.cm', sujet: 'Devis', intention: 'devis', status: 'nouveau', created_at: JOUR(1) },
    { client_name: 'Contact Digital', pole: 'Digital', contact_info: 'digital@site.cm', sujet: 'Devis', intention: 'devis', status: 'nouveau', created_at: JOUR(1) },
  ],
};

const direction = {
  id: 'd1', name: 'Le Boss', email: 'boss@arckaton.cm', role: 'admin', pole: 'Direction',
  poste_id: 'p1', permissions: [], active: true, created_at: JOUR(99), updated_at: JOUR(1),
};

const membreTech = {
  id: 't1', name: 'Membre Tech', email: 'tech@arckaton.cm', role: 'membre', pole: 'Tech',
  poste_id: 'p3', permissions: [], active: true, created_at: JOUR(99), updated_at: JOUR(1),
};

function filtresDe(requetes: { table: string; filtres: Filtre[] }[], table: string): Filtre[] {
  return requetes.filter((r) => r.table === table).flatMap((r) => r.filtres);
}

describe('Copilote — cloisonnement Direction vs pole', () => {
  it('la Direction lit tout le cockpit et recoit les coordonnees', async () => {
    const { couche, requetes } = creerFauxCockpit(donnees);
    const digest = await __buildCockpitDigest(direction, couche);
    expect(digest).not.toBeNull();

    expect(filtresDe(requetes, 'leads').some((f) => f.op === 'eq' && f.colonne === 'pole_assigned')).toBe(false);
    expect(filtresDe(requetes, 'projects').some((f) => f.op === 'eq' && f.colonne === 'pole')).toBe(false);
    expect(filtresDe(requetes, 'members').some((f) => f.op === 'eq' && f.colonne === 'pole')).toBe(false);

    expect(digest!.projets.map((p) => p.nom).sort()).toEqual(['Projet Digital', 'Projet Tech']);
    expect(digest!.membres).toHaveLength(2);
    expect(digest!.leadsARelancer.find((l) => l.nom === 'Prospect Tech')?.contact).toContain('699000000');
    expect(digest!.contactsSite.find((c) => c.client === 'Contact Tech')?.contact).toContain('tech@site.cm');
  });

  it('un membre reste borne a son pole et ne voit jamais les coordonnees', async () => {
    const { couche, requetes } = creerFauxCockpit(donnees);
    const digest = await __buildCockpitDigest(membreTech, couche);
    expect(digest).not.toBeNull();

    expect(filtresDe(requetes, 'leads')).toContainEqual({ op: 'eq', colonne: 'pole_assigned', valeur: 'Tech' });
    expect(filtresDe(requetes, 'projects')).toContainEqual({ op: 'eq', colonne: 'pole', valeur: 'Tech' });
    expect(filtresDe(requetes, 'members')).toContainEqual({ op: 'eq', colonne: 'pole', valeur: 'Tech' });
    expect(filtresDe(requetes, 'agent_reports')).toContainEqual({ op: 'eq', colonne: 'pole', valeur: 'Tech' });

    expect(digest!.projets.map((p) => p.nom)).toEqual(['Projet Tech']);
    expect(digest!.membres.map((m) => m.nom)).toEqual(['Membre Tech']);
    expect(digest!.counts.members).toBe(1);
    expect(digest!.contactsSite.map((c) => c.client)).toEqual(['Contact Tech']);

    expect(digest!.leadsARelancer.find((l) => l.nom === 'Prospect Tech')?.contact).toBeUndefined();
    expect(digest!.contactsSite[0].contact).toBeUndefined();
    expect(digest!.caEncaisse).toBe(0);
  });

  it('les taches d\'un membre sont filtrees sur lui ou son pole', async () => {
    const { couche, requetes } = creerFauxCockpit(donnees);
    const digest = await __buildCockpitDigest(membreTech, couche);
    const orTaches = filtresDe(requetes, 'tasks').find((f) => f.op === 'or');
    expect(orTaches).toBeDefined();
    const colonnes = orTaches && orTaches.op === 'or' ? orTaches.branches.map((b) => b.colonne) : [];
    expect(colonnes).toEqual(expect.arrayContaining(['cree_par', 'assigne_a', 'pole']));
    expect(digest!.tachesEnRetard.map((t) => t.titre)).toEqual(['Tache Tech']);
  });
});
