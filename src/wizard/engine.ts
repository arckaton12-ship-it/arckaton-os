// Machine à états du parcours conseiller, partagée par les quatre parcours
// publics (Devis, Essai, Réservation, Contact) et par le site public.
//
// Pur : aucun appel réseau, aucune dépendance React. L'UI émet des actions,
// le reduceur rend un nouvel état, et les seules sorties sont l'appel
// d'envoi (lead ou rendez-vous) déclenché par l'UI quand `peutEnvoyer`
// rendez-vous vrai, puis `envoi_reussi`/`envoi_echec`.
//
// Deux familles de parcours :
//  - `devis`, `contact`  -> sortie `lead` : POST /api/leads ;
//  - `essai`, `reservation` -> sortie `cadrage` : POST /api/appointments
//    (créneaux proposés par GET /api/appointments/creneaux avant celle-là).
//
// Le serveur reste la seule autorité : le pôle vient de GET
// /api/appointments/creneaux, jamais du client.

export type ModeWizard = 'devis' | 'essai' | 'reservation' | 'contact';

// Etat d'ouverture partage par AppContext : le mode choisi par le CTA et le
// besoin qu'il portait (ex. « E-commerce & Mobile Money » sur la carte devis).
export interface WizardDlg {
  ouvert: boolean;
  mode: ModeWizard;
  besoinInitial: string;
}

export type EtapeWizard = 'besoin' | 'creneaux' | 'coordonnees' | 'confirmation';

export type EtatChargement = 'repos' | 'enCours' | 'ok' | 'erreur';

export type EtatEnvoi = 'repos' | 'enCours' | 'fini' | 'erreur';

export interface ResultatWizard {
  saved: boolean;
  whatsappLink: string;
  // Sortie rendevous de cadrage uniquement :
  rdvRef?: string;
  creneauIso?: string;
  pole?: string;
}

export interface EtatWizard {
  mode: ModeWizard;
  etape: EtapeWizard;
  besoin: string;
  message: string;
  pole: string | null;
  creneaux: readonly string[];
  chargement: EtatChargement;
  creneauChoisi: string | null;
  prenomNom: string;
  telephone: string;
  email: string;
  consentement: boolean;
  envoi: EtatEnvoi;
  erreur: string | null;
  resultat: ResultatWizard | null;
}

export type ActionWizard =
  | { type: 'demarrer'; mode: ModeWizard }
  | { type: 'demarrer_avec'; mode: ModeWizard; besoinInitial: string }
  | { type: 'renseigner_besoin'; valeur: string; message?: string }
  | { type: 'valider_etape' }
  | { type: 'revenir_etape' }
  | { type: 'demander_creneaux' }
  | { type: 'creneaux_chargees'; pole: string; creneaux: readonly string[] }
  | { type: 'creneaux_echec'; message: string }
  | { type: 'choisir_creneau'; iso: string }
  | { type: 'retour_creneaux' }
  | { type: 'renseigner_coordonnees'; prenomNom: string; telephone: string; email: string }
  | { type: 'basculer_consentement'; accorde: boolean }
  | { type: 'envoi_demarre' }
  | { type: 'envoi_reussi'; resultat: ResultatWizard }
  | { type: 'envoi_echec'; message: string }
  | { type: 'recommencer' };

export function estParcoursCadrage(mode: ModeWizard): boolean {
  return mode === 'essai' || mode === 'reservation';
}

export function validerBesoin(besoin: string): boolean {
  return besoin.trim().length >= 2;
}

// Conserve des chiffres tout en laissant passer préfixes et espaces utiles ;
// la contrainte forte (>= 8 chiffres) couvre +237 6XXXXXXXX comme un numéro
// de portable local sans indicatif. C'est un garde-fou d'UI, pas une
// autorité : le serveur rejette lui-même (validerDemandeRdv).
export function validerTelephone(telephone: string): boolean {
  const chiffres = telephone.replace(/\D/g, '');
  return chiffres.length >= 8 && chiffres.length <= 15;
}

export function validerEmail(email: string): boolean {
  if (!email.trim()) return true; // l'email reste facultatif côté public
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validerCoordonnees(prenomNom: string, telephone: string, email: string): boolean {
  return prenomNom.trim().length >= 2 && validerTelephone(telephone) && validerEmail(email);
}

export function etatInitial(mode: ModeWizard): EtatWizard {
  return {
    mode,
    etape: 'besoin',
    besoin: '',
    message: '',
    pole: null,
    creneaux: [],
    chargement: 'repos',
    creneauChoisi: null,
    prenomNom: '',
    telephone: '',
    email: '',
    consentement: false,
    envoi: 'repos',
    erreur: null,
    resultat: null,
  };
}

// Le bouton « Suivant » de l'étape courante est-il actif ?
export function peutPasser(etat: EtatWizard): boolean {
  switch (etat.etape) {
    case 'besoin':
      return validerBesoin(etat.besoin);
    case 'creneaux':
      return etat.chargement === 'ok' && etat.creneauChoisi !== null;
    case 'coordonnees':
      return (
        validerCoordonnees(etat.prenomNom, etat.telephone, etat.email) &&
        etat.consentement &&
        etat.envoi !== 'enCours'
      );
    case 'confirmation':
      return false;
  }
}

// Étape atteinte quand on valide l'étape courante (null = fin de parcours).
export function prochaineEtape(etat: EtatWizard): EtapeWizard | null {
  if (!peutPasser(etat)) return null;
  switch (etat.etape) {
    case 'besoin':
      return estParcoursCadrage(etat.mode) ? 'creneaux' : 'coordonnees';
    case 'creneaux':
      return 'coordonnees';
    case 'coordonnees':
      return 'confirmation';
    case 'confirmation':
      return null;
  }
}

export function etapePrecedente(etat: EtatWizard): EtapeWizard | null {
  switch (etat.etape) {
    case 'creneaux':
      return 'besoin';
    case 'coordonnees':
      return estParcoursCadrage(etat.mode) ? 'creneaux' : 'besoin';
    case 'confirmation':
      return null; // « Recommencer » remet tout à zéro ; pas de retour arrière.
    case 'besoin':
      return null;
  }
}

// Vrai quand l'UI doit déclencher GET /api/appointments/creneaux (au premier
// rendu de l'étape créneaux, jamais avant que le besoin soit valide).
export function fautDemanderCreneaux(etat: EtatWizard): boolean {
  return etat.etape === 'creneaux' && etat.chargement === 'repos' && validerBesoin(etat.besoin);
}

// Vrai quand l'UI doit déclencher l'envoi (lead ou rendez-vous) et que la
// machine attend son issue.
export function fautEnvoyer(etat: EtatWizard): boolean {
  return etat.etape === 'coordonnees' && peutPasser(etat) && etat.envoi === 'repos';
}

export function reducer(etat: EtatWizard, action: ActionWizard): EtatWizard {
  switch (action.type) {
    case 'demarrer':
      return etatInitial(action.mode);

    case 'demarrer_avec':
      return {
        ...etatInitial(action.mode),
        besoin: action.besoinInitial,
      };

    case 'renseigner_besoin':
      if (etat.etape !== 'besoin') return etat;
      return {
        ...etat,
        besoin: action.valeur,
        message: action.message ?? etat.message,
        erreur: null,
      };

    case 'valider_etape': {
      const suivante = prochaineEtape(etat);
      if (!suivante) return etat;
      return { ...etat, etape: suivante, erreur: null };
    }

    case 'revenir_etape': {
      const precedente = etapePrecedente(etat);
      if (!precedente) return etat;
      return { ...etat, etape: precedente, erreur: null };
    }

    case 'demander_creneaux':
      if (!estParcoursCadrage(etat.mode) || etat.etape !== 'creneaux' || !validerBesoin(etat.besoin)) {
        return etat;
      }
      return { ...etat, chargement: 'enCours', erreur: null };

    case 'creneaux_chargees':
      if (etat.etape !== 'creneaux' || etat.chargement !== 'enCours') return etat;
      return {
        ...etat,
        pole: action.pole,
        creneaux: action.creneaux,
        chargement: 'ok',
        creneauChoisi: null,
        erreur: null,
      };

    case 'creneaux_echec':
      if (etat.etape !== 'creneaux') return etat;
      return { ...etat, chargement: 'erreur', erreur: action.message };

    case 'choisir_creneau':
      if (etat.etape !== 'creneaux' || etat.chargement !== 'ok' || !etat.creneaux.includes(action.iso)) {
        return etat;
      }
      return { ...etat, creneauChoisi: action.iso };

    case 'retour_creneaux':
      // Rejeu d'un créneau pris (409) : on redemande une liste fraiche en
      // gardant le besoin et les coordonnees deja renseignes.
      if (etat.etape !== 'coordonnees') return etat;
      return {
        ...etat,
        etape: 'creneaux',
        chargement: 'repos',
        creneauChoisi: null,
        envoi: 'repos',
        erreur: null,
      };

    case 'renseigner_coordonnees':
      if (etat.etape !== 'coordonnees') return etat;
      return { ...etat, prenomNom: action.prenomNom, telephone: action.telephone, email: action.email };

    case 'basculer_consentement':
      return { ...etat, consentement: action.accorde };

    case 'envoi_demarre':
      if (etat.etape !== 'coordonnees' || !peutPasser(etat)) return etat;
      return { ...etat, envoi: 'enCours', erreur: null };

    case 'envoi_reussi':
      if (etat.etape !== 'coordonnees') return etat;
      return {
        ...etat,
        envoi: 'fini',
        resultat: action.resultat,
        erreur: null,
        etape: 'confirmation',
      };

    case 'envoi_echec':
      if (etat.etape !== 'coordonnees') return etat;
      return { ...etat, envoi: 'erreur', erreur: action.message };

    case 'recommencer':
      return etatInitial(etat.mode);
  }
}