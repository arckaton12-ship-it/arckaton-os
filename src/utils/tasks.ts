import type { Task } from '../types';

// Le serveur renvoie les taches avec les colonnes PostgreSQL (`priorite`,
// `echeance`, `due`, `assigne_nom`) alors que l'interface historique lit
// `priority`, `due_date`/`date_echeance` et `assigned_to`/`assignee_name`.
// On aligne les deux jeux de champs a la frontiere : sans cela, une tache
// chargee par `refreshTasks` perd sa priorite (et son echeance), et
// `TasksTab` plante sur un `priority` absent.
export type TacheServeur = Task & {
  echeance?: string;
  due?: string;
  assigne_nom?: string | null;
  assigne?: string | null;
};

export function normaliserTache(t: TacheServeur): Task {
  const statut = t.statut || t.status || 'a_faire';
  const priorite = t.priorite || t.priority || 'normale';
  const echeance = t.date_echeance || t.due_date || t.echeance || t.due || '';
  const assignee = t.assignee_name || t.assigned_to || t.assigne_nom || t.assigne || undefined;
  return {
    ...t,
    titre: t.titre || t.title,
    title: t.title || t.titre,
    statut,
    status: statut,
    priorite,
    priority: priorite,
    date_echeance: echeance,
    due_date: echeance,
    assignee_name: assignee,
    assigned_to: assignee,
  };
}
