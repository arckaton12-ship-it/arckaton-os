// La machine à états du parcours conseiller : chaque parcours arrive jusqu'à
// sa sortie (lead pour devis/contact, rendez-vous de cadrage pour
// essai/réservation) sans jamais postuler de pole ni de statut.
import { describe, it, expect } from 'vitest';
import type { EtatWizard } from '../src/wizard/engine';
import {
  etatInitial,
  reducer,
  peutPasser,
  prochaineEtape,
  etapePrecedente,
  fautDemanderCreneaux,
  fautEnvoyer,
  validerBesoin,
  validerTelephone,
  validerEmail,
  validerCoordonnees,
  estParcoursCadrage,
} from '../src/wizard/engine';

const COORDONNEES = {
  prenomNom: 'Jean Mbarga',
  telephone: '+237 691 23 45 67',
  email: 'jean@exemple.cm',
};

function coordonnees(etat: ReturnType<typeof etatInitial>) {
  return reducer(
    etat,
    { type: 'renseigner_coordonnees', ...COORDONNEES }
  );
}

function consent(etat: ReturnType<typeof etatInitial>) {
  return reducer(etat, { type: 'basculer_consentement', accorde: true });
}

describe('démarrage', () => {
  it('repart de zéro sur demarrer', () => {
    const etat = etatInitial('devis');
    const apres = reducer(etat, { type: 'demarrer', mode: 'essai' });
    expect(apres.mode).toBe('essai');
    expect(apres.etape).toBe('besoin');
    expect(apres.creneauChoisi).toBeNull();
    expect(apres.envoi).toBe('repos');
    expect(apres.resultat).toBeNull();
  });

  it('demarrer_avec prefille le besoin exprimé par le CTA', () => {
    const apres = reducer(etatInitial('devis'), {
      type: 'demarrer_avec',
      mode: 'devis',
      besoinInitial: 'E-commerce & Mobile Money',
    });
    expect(apres.besoin).toBe('E-commerce & Mobile Money');
    expect(apres.etape).toBe('besoin');
  });
});

describe('parcours devis (sortie lead)', () => {
  it('enchaîne besoin -> coordonnees -> confirmation sans créneaux', () => {
    let etat = etatInitial('devis');
    expect(estParcoursCadrage('devis')).toBe(false);

    etat = reducer(etat, { type: 'renseigner_besoin', valeur: 'Site e-commerce' });
    expect(peutPasser(etat)).toBe(true);
    expect(prochaineEtape(etat)).toBe('coordonnees'); // skip créneaux !

    etat = { ...etat, etape: 'coordonnees' };
    etat = coordonnees(etat);
    etat = consent(etat);
    expect(peutPasser(etat)).toBe(true);
    expect(prochaineEtape(etat)).toBe('confirmation');

    etat = reducer(etat, {
      type: 'envoi_reussi',
      resultat: { saved: true, whatsappLink: 'https://wa.me/237681462982' },
    });
    expect(etat.etape).toBe('confirmation');
    expect(etat.envoi).toBe('fini');
    expect(etat.resultat?.saved).toBe(true);
  });

  it('le bouton suivant reste inactif sans besoin valide', () => {
    const etat = etatInitial('devis');
    expect(peutPasser(etat)).toBe(false);
    expect(reducer(etat, { type: 'renseigner_besoin', valeur: 'x' }).envoi === 'repos').toBe(true);
    expect(validerBesoin('x')).toBe(false);
    expect(validerBesoin('Site')).toBe(true);
  });
});

describe('parcours essai (sortie cadrage)', () => {
  it('passe par les créneaux, tire le pole du serveur, puis envoie le RDV', () => {
    let etat = etatInitial('essai');
    expect(estParcoursCadrage('essai')).toBe(true);

    etat = reducer(etat, { type: 'renseigner_besoin', valeur: 'ARKA-PME essai' });
    etat = { ...etat, etape: 'creneaux' };
    expect(fautDemanderCreneaux(etat)).toBe(true);
    expect(prochaineEtape(etat)).toBeNull(); // créneaux pas encore chargés

    etat = reducer(etat, { type: 'demander_creneaux' });
    expect(etat.chargement).toBe('enCours');
    expect(fautDemanderCreneaux(etat)).toBe(false);

    const creneaux = ['2026-10-16T08:00:00.000Z', '2026-10-16T08:30:00.000Z'];
    etat = reducer(etat, { type: 'creneaux_chargees', pole: 'Tech', creneaux });
    expect(etat.pole).toBe('Tech');
    expect(etat.chargement).toBe('ok');
    expect(peutPasser(etat)).toBe(false); // aucun créneau choisi

    etat = reducer(etat, { type: 'choisir_creneau', iso: creneaux[1] });
    expect(etat.creneauChoisi).toBe(creneaux[1]);
    expect(peutPasser(etat)).toBe(true);
    expect(prochaineEtape(etat)).toBe('coordonnees');

    etat = { ...etat, etape: 'coordonnees' };
    etat = coordonnees(etat);
    etat = consent(etat);
    expect(peutPasser(etat)).toBe(true);
    expect(fautEnvoyer(etat)).toBe(true);

    etat = reducer(etat, {
      type: 'envoi_reussi',
      resultat: {
        saved: true,
        whatsappLink: 'https://wa.me/237681462982',
        rdvRef: 'rdv-1234',
        creneauIso: creneaux[1],
        pole: 'Tech',
      },
    });
    expect(etat.resultat?.rdvRef).toBe('rdv-1234');
    expect(etat.etape).toBe('confirmation');
  });

  it('refuse un créneau hors liste et signale un échec de chargement', () => {
    let etat = etatInitial('reservation');
    etat = reducer(etat, { type: 'renseigner_besoin', valeur: 'Reco digital complet' });
    etat = { ...etat, etape: 'creneaux' };
    etat = reducer(etat, { type: 'demander_creneaux' });
    etat = reducer(etat, { type: 'creneaux_chargees', pole: 'Digital', creneaux: ['a', 'b'] });

    const avant = reducer(etat, { type: 'choisir_creneau', iso: 'pirates' });
    expect(avant.creneauChoisi).toBeNull();

    const echec = reducer(
      { ...etatInitial('essai') },
      { type: 'creneaux_echec', message: 'Le calendrier est indisponible' }
    );
    expect(echec.chargement).toBe('repos'); // pas en étape créneaux : ignoré
  });
});

describe('coordonnées et consentement', () => {
  it('exige un nom, un téléphone à 8+ chiffres et un email bien formé', () => {
    expect(validerTelephone('+237 691 23 45 67')).toBe(true);
    expect(validerTelephone('691 23')).toBe(false);
    expect(validerTelephone('+237912345')).toBe(true);
    expect(validerEmail('jean@exemple.cm')).toBe(true);
    expect(validerEmail('jean@exemple')).toBe(false);
    expect(validerEmail('')).toBe(true); // facultatif
    expect(validerCoordonnees('Jean', '+237691234567', 'jean@exemple.cm')).toBe(true);
    expect(validerCoordonnees('J', '+237691234567', 'jean@exemple.cm')).toBe(false);
    expect(validerCoordonnees('Jean', '12', 'jean@exemple.cm')).toBe(false);
  });

  it('bloque le bouton tant que le consentement n est pas donné', () => {
    let etat: EtatWizard = { ...etatInitial('contact'), etape: 'coordonnees' };
    etat = coordonnees(etat);
    expect(peutPasser(etat)).toBe(false);
    etat = consent(etat);
    expect(fautEnvoyer(etat)).toBe(true);
    etat = reducer(etat, { type: 'envoi_demarre' });
    expect(etat.envoi).toBe('enCours');
    expect(peutPasser(etat)).toBe(false); // bouton verrouille pendant l envoi
  });
});

describe('navigation', () => {
  it('valide une étape seulement quand elle est remplie', () => {
    let etat = etatInitial('essai');
    etat = reducer(etat, { type: 'valider_etape' });
    expect(etat.etape).toBe('besoin'); // besoin vide : refus

    etat = reducer(etat, { type: 'renseigner_besoin', valeur: 'ARKA-PME' });
    etat = reducer(etat, { type: 'valider_etape' });
    expect(etat.etape).toBe('creneaux');

    etat = reducer(etat, { type: 'revenir_etape' });
    expect(etat.etape).toBe('besoin');
  });

  it('retourne en arrière selon le parcours', () => {
    expect(etapePrecedente({ ...etatInitial('devis'), etape: 'coordonnees' as const })).toBe('besoin');
    expect(etapePrecedente({ ...etatInitial('essai'), etape: 'coordonnees' as const })).toBe('creneaux');
    expect(etapePrecedente({ ...etatInitial('essai'), etape: 'creneaux' as const })).toBe('besoin');
    expect(etapePrecedente({ ...etatInitial('devis'), etape: 'besoin' as const })).toBeNull();
    expect(etapePrecedente({ ...etatInitial('devis'), etape: 'confirmation' as const })).toBeNull();
  });

  it('recommencer remet le parcours à zéro', () => {
    let etat: EtatWizard = { ...etatInitial('essai'), etape: 'coordonnees', consentement: true };
    etat = reducer(etat, { type: 'recommencer' });
    expect(etat.etape).toBe('besoin');
    expect(etat.consentement).toBe(false);
  });

  it('retour_creneaux relance une liste fraiche après un 409', () => {
    let etat: EtatWizard = {
      ...etatInitial('reservation'),
      etape: 'coordonnees',
      besoin: 'Reco complet',
      pole: 'Digital',
      creneauChoisi: 'a',
      envoi: 'erreur',
    };
    etat = reducer(etat, { type: 'retour_creneaux' });
    expect(etat.etape).toBe('creneaux');
    expect(etat.chargement).toBe('repos');
    expect(etat.creneauChoisi).toBeNull();
    expect(fautDemanderCreneaux(etat)).toBe(true);
  });

  it('retour_creneaux est ignoré hors étape coordonnees', () => {
    const etat = reducer(etatInitial('essai'), { type: 'retour_creneaux' });
    expect(etat.etape).toBe('besoin');
  });

  it('rejette les actions hors contexte', () => {
    let etat = etatInitial('devis');
    expect(reducer(etat, { type: 'renseigner_besoin', valeur: 'x' }).envoi).toBe('repos');
    etat = { ...etat, etape: 'besoin' };
    const ignore = reducer(etat, { type: 'choisir_creneau', iso: 'a' });
    expect(ignore.creneauChoisi).toBeNull();
    const ignore2 = reducer(etat, { type: 'creneaux_echec', message: 'x' });
    expect(ignore2.erreur).toBeNull();
    expect(fautEnvoyer(etatInitial('devis'))).toBe(false);
  });
});