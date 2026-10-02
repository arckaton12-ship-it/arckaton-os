// Tests de la normalisation des taches a la frontiere serveur -> interface.
//
// Le serveur repond avec les colonnes PostgreSQL (`priorite`, `echeance`,
// `due`, `assigne_nom`) tandis que l'interface lit `priority`,
// `due_date`/`date_echeance` et `assigned_to`/`assignee_name`. Sans cet
// alignement, une tache convertie depuis un lead perdait son urgence et sa
// deadline, et `TasksTab` pouvait planter sur un `priority` absent.
import { describe, it, expect } from 'vitest';
import { normaliserTache } from '../src/utils/tasks';
import type { TacheServeur } from '../src/utils/tasks';
import type { Task } from '../src/types';

const base: Task = { id: 't-1', pole: 'Tech' };

describe('normaliserTache', () => {
  it('traduit la forme PostgreSQL du serveur vers la forme de l interface', () => {
    const brut: TacheServeur = {
      ...base,
      titre: 'Intégrer la passerelle MTN',
      statut: 'en_cours',
      priorite: 'urgente',
      echeance: 'Sous 3 jours',
      due: 'Sous 3 jours',
      assigne_nom: 'Awa Ngo',
    };
    const t = normaliserTache(brut);
    expect(t.priority).toBe('urgente');
    expect(t.priorite).toBe('urgente');
    expect(t.due_date).toBe('Sous 3 jours');
    expect(t.date_echeance).toBe('Sous 3 jours');
    expect(t.title).toBe('Intégrer la passerelle MTN');
    expect(t.titre).toBe('Intégrer la passerelle MTN');
    expect(t.status).toBe('en_cours');
    expect(t.statut).toBe('en_cours');
    expect(t.assignee_name).toBe('Awa Ngo');
    expect(t.assigned_to).toBe('Awa Ngo');
  });

  it('conserve la forme francophone produite par la conversion de lead', () => {
    const t = normaliserTache({ ...base, priorite: 'haute', date_echeance: 'Sous 10 jours' });
    expect(t.priority).toBe('haute');
    expect(t.due_date).toBe('Sous 10 jours');
  });

  it('applique des valeurs par defaut quand les champs manquent', () => {
    const t = normaliserTache({ ...base });
    expect(t.priority).toBe('normale');
    expect(t.priorite).toBe('normale');
    expect(t.status).toBe('a_faire');
    expect(t.statut).toBe('a_faire');
    expect(t.due_date).toBe('');
    expect(t.date_echeance).toBe('');
    expect(t.assigned_to).toBeUndefined();
  });

  it('priorise `date_echeance` sur les autres alias d echeance', () => {
    const t = normaliserTache({
      ...base,
      date_echeance: 'Sous 5 jours',
      due_date: 'Sous 6 jours',
      echeance: 'Sous 7 jours',
      due: 'Sous 8 jours',
    });
    expect(t.due_date).toBe('Sous 5 jours');
  });
});
