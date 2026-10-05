import { describe, it, expect } from 'vitest';
import {
  __construireInstructionRapportStrategique,
  __extraireRapportStrategique,
  __construireRapportDeSecours,
} from '../server';

/**
 * Le bouton « Rapport IA (1 clic) » appelait `/api/ai/generate-report`, qui
 * ignore le contexte OS : la reponse affichee venait d'un tableau de
 * recommandations ecrit en dur dans l'interface (Forfait Synergie, Mobile Money
 * v2, Maison Kotto), donc de donnees qui n'existaient pas en base.
 *
 * Ces tests verrouillent l'inverse : tout ce qui sort de ce chemin doit
 * provenir du digest construit par le serveur, et une reponse modele
 * inexploitable doit basculer vers le repli honete au lieu d'etre completee
 * par une invention.
 */
const digest = {
  counts: { leads: 22, openTasks: 17, lateTasks: 3, activeQuotes: 5, projects: 2, members: 3 },
  caEncaisse: 3_800_000,
  leadsARelancer: [
    { nom: 'Maison Kotto', statut: 'devis_envoye', projet: 'Site', budget: '750k', pole: 'Digital', source: 'site', ageJours: 12, contact: 'tel 699000000' },
  ],
  tachesEnRetard: [
    { titre: 'Livrer maquette GESCAFE', pole: 'Creatif', priorite: 'haute', echeance: '2026-09-01', retardJours: 4, assigne: 'Awa' },
  ],
  devisActifs: [{ ref: 'DEV-2026-014', client: 'Districash', total: 2_900_000, statut: 'envoye', ageJours: 20 }],
  contactsSite: [],
  projets: [{ nom: 'Refonte Kotto', client: 'PRJ-KOTTO', pole: 'Digital', statut: 'en_cours', forfait: 'Synergie', progression: 40, deadline: '2026-10-20', chef: 'Awa' }],
  membres: [{ nom: 'Awa', role: 'admin', pole: 'Direction', poste: 'Chef d Agence' }],
} as never;

describe('Rapport strategique — prompt', () => {
  const instruction = __construireInstructionRapportStrategique('Awa', 'admin', digest);

  it('interdit explicitement l invention', () => {
    expect(instruction).toContain("N'invente aucun nom");
    expect(instruction).toContain('non renseigne');
  });

  it('interdit d executer une action', () => {
    expect(instruction).toContain("AUCUNE action a executer");
  });

  it('injecte les chiffres reels du digest', () => {
    expect(instruction).toContain('prospects : 22');
    expect(instruction).toContain('3 en retard');
    expect(instruction).toContain('3800000 FCFA');
  });

  it('cible le membre demande et impose un JSON seul', () => {
    expect(instruction).toContain("pour Awa (role admin)");
    expect(instruction).toContain('STRICTEMENT');
  });
});

describe('Rapport strategique — extraction du JSON', () => {
  it('lit une reponse JSON propre', () => {
    const rapport = __extraireRapportStrategique(
      '{"titre":"Semaine calme","resume":"22 prospects au pipeline.","recommandations":["Relancer Kotto"],"pointsCles":["3 taches en retard"],"forfait":"Synergie"}'
    );
    expect(rapport?.titre).toBe('Semaine calme');
    expect(rapport?.recommandations).toEqual(['Relancer Kotto']);
    expect(rapport?.forfait).toBe('Synergie');
  });

  it('isole le JSON entoure de texte ou de fences Markdown', () => {
    const rapport = __extraireRapportStrategique(
      'Voici le rapport :\n```json\n{"titre":"T","resume":"R","recommandations":[]}\n```\nCordialement.'
    );
    expect(rapport?.resume).toBe('R');
  });

  it('rejette une reponse sans resume exploitable', () => {
    expect(__extraireRapportStrategique('{"titre":"T"}')).toBeNull();
    expect(__extraireRapportStrategique('{"resume":"   "}')).toBeNull();
  });

  it('rejette une sortie non JSON ou tronquee', () => {
    expect(__extraireRapportStrategique('Le pipeline va bien.')).toBeNull();
    expect(__extraireRapportStrategique('{"resume":"coupe')).toBeNull();
    expect(__extraireRapportStrategique('[1,2,3]')).toBeNull();
  });

  it('ignore des champs du mauvais type plutot que de les convertir', () => {
    const rapport = __extraireRapportStrategique(
      '{"resume":"R","recommandations":"pas une liste","pointsCles":[1,null,"ok"]}'
    );
    expect(rapport?.recommandations).toEqual([]);
    expect(rapport?.pointsCles).toEqual(['ok']);
  });

  it('borne le nombre d elements', () => {
    const liste = JSON.stringify(Array.from({ length: 30 }, (_, i) => ` reco ${i} `));
    const rapport = __extraireRapportStrategique(`{"resume":"R","recommandations":${liste}}`);
    expect(rapport?.recommandations).toHaveLength(6);
  });
});

describe('Rapport strategique — repli sans IA', () => {
  const rapport = __construireRapportDeSecours(digest);

  it('ne contient que des chiffres issus du digest', () => {
    // `toLocaleString('fr-FR')` insere une espace insecable fine : on
    // normalise les espaces plutot que de dependre du runtime ICU.
    const resume = rapport.resume.replace(/\s+/g, ' ');
    expect(resume).toContain('22 prospect(s)');
    expect(resume).toContain('3 en retard');
    expect(resume).toContain('3 800 000 FCFA');
    expect(resume).not.toContain('undefined');
    expect(resume).not.toContain('NaN');
  });

  it('recommande une action concrete, jamais de forfait invente', () => {
    expect(rapport.recommandations.length).toBeGreaterThanOrEqual(2);
    expect(rapport.recommandations.join(' ')).toContain('CRM');
    expect(rapport.recommandations.join(' ')).toContain('Taches');
    expect(rapport.forfait).toBe('—');
  });

  it('survit a un OS vide sans inventer', () => {
    const vide = {
      counts: { leads: 0, openTasks: 0, lateTasks: 0, activeQuotes: 0, projects: 0, members: 0 },
      caEncaisse: 0,
      leadsARelancer: [],
      tachesEnRetard: [],
      devisActifs: [],
      contactsSite: [],
      projets: [],
      membres: [],
    } as never;
    const r = __construireRapportDeSecours(vide);
    expect(r.resume).toContain('0 prospect(s)');
    expect(r.recommandations.join(' ')).toContain('Aucun prospect en attente');
    expect(r.recommandations.join(' ')).toContain('Aucune tache en retard');
  });
});
