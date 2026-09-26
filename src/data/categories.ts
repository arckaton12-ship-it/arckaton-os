// Catégories de réalisations — source unique de vérité
// Utilisée par le site public (filtres) et le CMS (édition) pour rester synchronisée.

export interface RealisationCategory {
  id: string;
  label: string;
  hint: string;
}

export const REALISATION_CATEGORIES: RealisationCategory[] = [
  { id: 'ecommerce', label: 'E-commerce & Boutiques', hint: 'Boutiques en ligne, fiches produits, paiement, livraison.' },
  { id: 'saas', label: 'ARKA-PME (SaaS)', hint: 'Plateformes internes, cockpit de gestion, portails clients.' },
  { id: 'sante', label: 'Santé & Cliniques', hint: 'Cabinets, cliniques, prise de rendez-vous, dossiers patients.' },
  { id: 'service', label: 'Services & Professions libérales', hint: 'Cabinets de conseil, professions réglementées, prise de contact.' },
  { id: 'corporate', label: 'Corporate & Institutions', hint: 'Sites institutionnels, marques, groupes, événements.' },
  { id: 'industrie', label: 'Industrie & BTP', hint: 'PME industrielles, chantiers, maintenance, logistique.' },
  { id: 'agriculture', label: 'Agriculture & Agro', hint: 'Coopératives, transformation, circuits courts.' },
  { id: 'autre', label: 'Autre projet', hint: 'Secteur non listé : adaptez la catégorie.' },
];

export const getCategoryLabel = (id: string): string =>
  REALISATION_CATEGORIES.find((c) => c.id === id)?.label || 'Réalisation';
