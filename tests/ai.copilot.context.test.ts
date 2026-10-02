import { describe, it, expect } from 'vitest';
import {
  __extraireContact,
  __formaterDigestCopilote,
  __construireInstructionCopilote,
} from '../server';

// Le copilote inventait des noms, des montants et des actions. Le contexte
// desormais fourni par le serveur doit etre reel, et l'instruction doit
// interdire toute affirmation d'action.
describe('Copilote — contexte reel et lecture seule', () => {
  const digest = {
    counts: { leads: 22, openTasks: 17, lateTasks: 3, activeQuotes: 5 },
    caEncaisse: 3_800_000,
    leadsARelancer: [
      { nom: 'Maison Kotto', statut: 'devis_envoye', projet: 'Site', budget: '750k', pole: 'Digital', source: 'site', ageJours: 12 },
    ],
    tachesEnRetard: [
      { titre: 'Livrer maquette GESCAFE', pole: 'Creatif', priorite: 'haute', echeance: '2026-09-01', retardJours: 4, assigne: 'Awa' },
    ],
    devisActifs: [
      { ref: 'DEV-2026-014', client: 'Districash', total: 2_900_000, statut: 'envoye', ageJours: 20 },
    ],
    contactsSite: [
      { client: 'Visiteur Site Web', sujet: 'Demande de RDV', intention: 'devis', statut: 'nouveau', ageJours: 0 },
    ],
  };

  it('formate un digest vide sans inventer ni planter', () => {
    const vide = { ...digest, leadsARelancer: [], tachesEnRetard: [], devisActifs: [], contactsSite: [] };
    const texte = __formaterDigestCopilote(vide);
    expect(texte).toContain('aucun prospect en attente');
    expect(texte).toContain('aucune');
  });

  it('nomme les vrais dossiers et compteurs', () => {
    const texte = __formaterDigestCopilote(digest);
    expect(texte).toContain('Maison Kotto');
    expect(texte).toContain('Livrer maquette GESCAFE');
    expect(texte).toContain('DEV-2026-014');
    expect(texte).toContain('22');
    expect(texte).toContain('4');
  });

  it('declare le contexte indisponible quand la base ne repond pas', () => {
    expect(__formaterDigestCopilote(null)).toContain('INDISPONIBLE');
  });

  it("interdit toute action et toute affirmation d'action", () => {
    const instruction = __construireInstructionCopilote('Digital', 'admin', 'Le Boss', digest);
    expect(instruction).toContain('LECTURE SEULE');
    expect(instruction).toMatch(/ne dis jamais avoir fait/i);
    expect(instruction).toContain('Maison Kotto');
    expect(instruction).toContain('Le Boss');
    expect(instruction).toContain('Digital');
  });
});

// L'agent public ne doit persister une demande que si un vrai contact existe.
describe('Agent public — detection du contact', () => {
  it('extrait un email et un numero camerounais', () => {
    const c = __extraireContact('Bonjour, je suis Jean, joignable au +237 6 99 12 34 56 ou jean@exemple.cm');
    expect(c.email).toBe('jean@exemple.cm');
    expect(c.phone.replace(/\D/g, '').length).toBeGreaterThanOrEqual(8);
  });

  it('renvoie vide quand aucun contact n\'est present', () => {
    const c = __extraireContact('Bonjour, quels sont vos forfaits ?');
    expect(c.email).toBe('');
    expect(c.phone).toBe('');
  });

  it('ne prend pas un nombre isole trop court pour un telephone', () => {
    const c = __extraireContact('Je veux 3 sorties terrain');
    expect(c.phone).toBe('');
  });
});
