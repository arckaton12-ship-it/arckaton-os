import { ForfaitData, Poste, Task, Lead, AgentReport, AppNotification, ChannelMessage, CalendarEvent, Projet, UserProfile, Realisation, Temoignage } from '../types';

export const OFFICIAL_KNOWLEDGE = {
  agency: {
    name: 'Arckaton',
    tagline: 'On ne livre pas un site. On livre un système digital complet.',
    location: 'Mimboman, Yaoundé, Cameroun',
    phone: '+237 681 46 29 82',
    phoneFormatted: '+237 681 46 29 82',
    whatsappUrl: 'https://wa.me/237681462982',
    email: 'ARCKATON12@gmail.com',
    parentGroup: 'Filiale Technologique de SLOMAH SARL',
    deliveryScope: 'Livraison partout dans le monde 🌍 (100% à distance, le digital n\'a pas de frontières)',
    paymentMethods: 'FCFA, Mobile Money (MTN Money / Orange Money) ou virement bancaire. Acompte au démarrage + solde à la livraison. Budget publicitaire toujours séparé des honoraires.',
    responseTime: 'Réponse humaine garantie sous 24h',
  },

  // Mentions reprises du papier à en-tête officiel de l'agence
  // (PAPIER ENTÊTE.docx), alignées sur la structure juridique confirmée par
  // la direction :
  //   - Arckaton est une FILIALE, implantée à Yaoundé ;
  //   - le siège social et les identifiants (RC / NIU) sont ceux de la
  //     société mère, SLOMAH SARL, à Douala.
  // Le RC et le NIU ci-dessous n'appartiennent donc pas à Arckaton : les
  // afficher au nom d'Arckaton serait inexact.
  letterhead: {
    agencyName: 'AGENCE ARCKATON',
    taglineLine1: 'Développement logiciel',
    taglineLine2: 'Services Digitaux & Graphiques',
    email: 'arckaton12@gmail.com',
    // Filiale : implantation de l'agence.
    agencyLocation: 'Yaoundé, Cameroun',
    // Société mère : siège social et identifiants légaux.
    parentName: 'SLOMAH SARL',
    relationship: 'Filiale',
    parentLocation: 'Douala, Cameroun',
    rc: 'CM /DLN/2020/B/968',
    niu: 'M 0520145227521',
    // Siege repris tel quel du papier à en-tête (usage historique conservé).
    siegeSocial: 'DOUALA, CAMEROUN',
    logo: '/brand/arckaton-logo.png',
    // Couleurs relevées dans le document source, puis confrontees au logo.
    //
    // Le logo est un carre bleu nuit OPAQUE (1000x1000, sans canal alpha) :
    // son fond est #171942. Le docx ombrage ses bandeaux en #0A0F2E, ce qui
    // laisserait une couture visible autour du logo. On utilise donc la
    // couleur reelle du logo pour que celui-ci se fonde dans le bandeau.
    colors: {
      green: '#00A562',
      navy: '#0A0F2E',
      logoBackground: '#171942',
      logoMark: '#248067',
    },
  },
  stats: {
    conversionMaisonKotto: '+337%',
    consolidatedDistricash: '12 840 000 FCFA',
    referencesDistricash: '12 000 références',
    arkaInventoryTime: '12 minutes (vs 3h au cahier)',
    pmeAccompanied: '+20 PME accompagnées',
    googleRating: '4.9/5',
    freeTrialDays: '30 jours d\'essai',
  },
  poles: [
    { key: 'Direction', name: 'Direction & Stratégie', color: '#00c97a', desc: 'Gouvernance, pilotage de rentabilité et vision globale' },
    { key: 'Creatif', name: 'Studio & Créatif', color: '#a880ff', desc: 'Identité de marque, direction artistique, motion design et shooting' },
    { key: 'Tech', name: 'Tech & Architecture SaaS', color: '#4d8dff', desc: 'Développement web, ARKA-PME, intégration Mobile Money MTN/Orange' },
    { key: 'Digital', name: 'Growth & Marketing Digital', color: '#f5a83c', desc: 'SEO local, campagnes publicitaires, social media et acquisition' },
    { key: 'Client', name: 'Expérience Client & Terrain', color: '#ff4d6a', desc: 'Suivi de compte, activations terrain mensuelles et satisfaction' },
    { key: 'Externe', name: 'Partenaires & Conseil Externe', color: '#8892a4', desc: 'Juridique, expertise comptable et réseau d\'influenceurs KOL' },
  ]
};

// `manager` est vide par défaut : le responsable affiché est résolu à
// partir de l'annuaire réel (osMembers), jamais d'une liste inventée.
export const POLES_INFO: Record<string, { name: string; manager: string; color: string; desc: string }> = {
  Direction: { name: 'Direction & Stratégie', manager: '', color: '#00c97a', desc: 'Gouvernance, pilotage de rentabilité et vision globale' },
  Creatif: { name: 'Studio & Créatif', manager: '', color: '#a880ff', desc: 'Identité de marque, direction artistique, motion design et shooting' },
  Tech: { name: 'Tech & Architecture SaaS', manager: '', color: '#4d8dff', desc: 'Développement web, ARKA-PME, intégration Mobile Money MTN/Orange' },
  Digital: { name: 'Growth & Marketing Digital', manager: '', color: '#f5a83c', desc: 'SEO local, campagnes publicitaires, social media et acquisition' },
  Client: { name: 'Expérience Client & Terrain', manager: '', color: '#ff4d6a', desc: 'Suivi de compte, activations terrain mensuelles et satisfaction' },
  Externe: { name: 'Partenaires & Conseil Externe', manager: '', color: '#8892a4', desc: 'Juridique, expertise comptable et réseau de partenaires' }
};

export const FORFAITS_DATA: ForfaitData[] = [
  {
    id: 'initiation',
    number: '01',
    name: 'Initiation',
    tagline: 'L\'essentiel solide pour démarrer une présence digitale crédible et générer des premiers contacts qualifiés.',
    creation_price: '380 000 FCFA',
    creation_price_amount: 380000,
    creation_features: [
      'Logo & charte graphique simplifiée',
      'Mini-site vitrine responsive (3 à 5 pages)',
      'Kit graphique de lancement (6 visuels pro)',
      'Hébergement & nom de domaine inclus 1 an',
      'Formation prise en main 2 heures',
      'Intégration WhatsApp & formulaires'
    ],
    monthly_price: '160 000 FCFA/mois',
    monthly_price_amount: 160000,
    monthly_features: [
      '6 sorties terrain / mois avec captation',
      'Maintenance technique & sécurité',
      'Support WhatsApp réactif 6j/7',
      'Mises à jour de contenus mensuelles'
    ],
    delai: '10 à 15 jours ouvrés',
    retouches: '2 rounds de retouches inclus',
    sorties_terrain: '6 sorties terrain / mois',
    recommended: false
  },
  {
    id: 'synergie',
    number: '02',
    name: 'Synergie',
    tagline: 'Le système digital complet le plus choisi par les PME africaines et internationales pour accélérer leur chiffre d\'affaires.',
    creation_price: '750 000 FCFA',
    creation_price_amount: 750000,
    creation_features: [
      'Identité de marque complète & charte détaillée',
      'Site web sur-mesure UX/UI (5 à 8 pages)',
      'Optimisation SEO local & mobile accéléré',
      'Kit réseaux sociaux & templates éditables',
      'Hébergement haute performance 1 an inclus',
      'Formation approfondie 2 heures de l\'équipe'
    ],
    monthly_price: '350 000 FCFA/mois',
    monthly_price_amount: 350000,
    monthly_features: [
      '9 sorties terrain / mois & captations photos/vidéos',
      '2 à 3 infographies / créations par semaine',
      'Gestion et animation des campagnes d\'acquisition',
      'Rapport mensuel ROI & KPIs de conversion',
      'Support WhatsApp dédié + accès Arckaton OS'
    ],
    delai: '3 à 4 semaines',
    retouches: '3 rounds de retouches inclus',
    sorties_terrain: '9 sorties terrain / mois',
    recommended: true
  },
  {
    id: 'architecture',
    number: '03',
    name: 'Architecture',
    tagline: 'L\'infrastructure haut de gamme pour marques exigeantes avec e-commerce, Mobile Money et déploiement multi-canal.',
    creation_price: '2 900 000 FCFA',
    creation_price_amount: 2900000,
    creation_features: [
      'E-commerce complet (jusqu\'à 50 produits configurés)',
      'Paiement Mobile Money direct (MTN MoMo + Orange Money)',
      'Design immersif sur-mesure & animations fluides',
      'Système ARKA-PME connecté (stocks & ventes synchronisés)',
      'Hébergement cloud dédié 1 an & certificat SSL sécurisé',
      'Formation complète des équipes & documentations'
    ],
    monthly_price: '580 000 FCFA/mois',
    monthly_price_amount: 580000,
    monthly_features: [
      'Stratégie de contenu premium (3 vidéos / semaine)',
      'Gestion de campagnes publicitaires sponsorisées',
      'Optimisation continue du taux de conversion (CRO)',
      'Reporting hebdomadaire avec tableau de bord temps réel',
      'Support prioritaire 24/7 avec Chef de projet dédié'
    ],
    delai: '6 à 10 semaines',
    retouches: '30 jours de corrections post-lancement garantis',
    sorties_terrain: 'Accompagnement terrain illimité selon plan',
    recommended: false
  }
];

export const POSTES_DATA: Poste[] = [
  // Phase 1 : Fondation
  { id: 'p1', titre: 'Chef d\'Agence', pole: 'Direction', niveau: 0, parentId: null, phase: 1, ordre: 1, description: 'Pilotage stratégique, allocation des ressources et rentabilité des projets clients.', titulaire: '', charge_estimee: '92%', statut_recrutement: 'pourvu' },
  { id: 'p2', titre: 'Responsable Technique', pole: 'Tech', niveau: 1, parentId: 'p1', phase: 3, ordre: 2, description: 'Supervision des architectures web, intégrations APIs Mobile Money et robustesse.', titulaire: '', charge_estimee: '85%', statut_recrutement: 'pourvu' },
  { id: 'p3', titre: 'Développeur Web', pole: 'Tech', niveau: 2, parentId: 'p2', phase: 2, ordre: 3, description: 'Intégration frontend réactive, compatibilité connexion basse et CMS.', titulaire: '', charge_estimee: '78%', statut_recrutement: 'pourvu' },
  { id: 'p4', titre: 'Graphiste / Motion Designer', pole: 'Creatif', niveau: 2, parentId: 'p6', phase: 1, ordre: 4, description: 'Création d\'identités visuelles, chartes, animations et visuels réseaux sociaux.', titulaire: '', charge_estimee: '88%', statut_recrutement: 'pourvu' },
  { id: 'p5', titre: 'Chargé(e) de Compte', pole: 'Client', niveau: 2, parentId: 'p11', phase: 2, ordre: 5, description: 'Point de contact privilégié des PME clientes, suivi des validations et livrables.', titulaire: '', charge_estimee: '80%', statut_recrutement: 'pourvu' },

  // Phase 2 : Croissance
  { id: 'p6', titre: 'Directeur Créatif', pole: 'Creatif', niveau: 1, parentId: 'p1', phase: 2, ordre: 6, description: 'Direction artistique globale, tonalité de marque et standing des productions.', titulaire: '', charge_estimee: '70%', statut_recrutement: 'pourvu' },
  { id: 'p7', titre: 'Community Manager', pole: 'Digital', niveau: 2, parentId: 'p6', phase: 1, ordre: 7, description: 'Animation des communautés, modération et diffusion des contenus sur-mesure.', titulaire: '', charge_estimee: '75%', statut_recrutement: 'pourvu' },
  { id: 'p8', titre: 'Dev Full-Stack / CTO', pole: 'Tech', niveau: 2, parentId: 'p2', phase: 4, ordre: 8, description: 'Évolution du SaaS ARKA-PME, bases de données et scalabilité.', titulaire: '', charge_estimee: '90%', statut_recrutement: 'pourvu' },
  { id: 'p9', titre: 'Responsable Ads & SEO', pole: 'Digital', niveau: 2, parentId: 'p11', phase: 3, ordre: 9, description: 'Campagnes Google/Meta Ads, référencement naturel local et suivi des conversions.', titulaire: '', charge_estimee: '82%', statut_recrutement: 'pourvu' },
  { id: 'p10', titre: 'Assistante Administrative', pole: 'Client', niveau: 2, parentId: 'p11', phase: 3, ordre: 10, description: 'Facturation, conformité des devis, organisation interne et accueil.', titulaire: '', charge_estimee: '65%', statut_recrutement: 'pourvu' },

  // Phase 3 : Expansion
  { id: 'p11', titre: 'Directeur Commercial', pole: 'Direction', niveau: 1, parentId: 'p1', phase: 3, ordre: 11, description: 'Acquisition de comptes grands comptes PME, partenariats et offres sur-mesure.', titulaire: '', charge_estimee: '0%', statut_recrutement: 'recrutement_ouvert' },
  { id: 'p12', titre: 'Vidéaste / Photographe', pole: 'Creatif', niveau: 2, parentId: 'p6', phase: 2, ordre: 12, description: 'Captations terrain haute définition, interviews clients et capsules vidéos.', titulaire: '', charge_estimee: '84%', statut_recrutement: 'pourvu' },
  { id: 'p13', titre: 'Rédacteur / Copywriter', pole: 'Digital', niveau: 3, parentId: null, phase: 2, ordre: 13, description: 'Rédaction persuasive orientée conversion, articles de fond et scripts.', titulaire: '', charge_estimee: '60%', statut_recrutement: 'pourvu' },
  { id: 'p14', titre: 'Comptable / Expert Fiscal', pole: 'Direction', niveau: 3, parentId: null, phase: 3, ordre: 14, description: 'Gestion financière agence, trésorerie et conformité fiscale CEMAC.', titulaire: '', charge_estimee: '45%', statut_recrutement: 'pourvu' },

  // Phase 4 : Maturité
  { id: 'p15', titre: 'Conseiller Juridique', pole: 'Externe', niveau: 3, parentId: null, phase: 3, ordre: 15, description: 'Contrats de propriété intellectuelle, accords SaaS et protection de marque.', titulaire: '', charge_estimee: '30%', statut_recrutement: 'pourvu' },
  { id: 'p16', titre: 'Influenceur / KOL', pole: 'Externe', niveau: 3, parentId: null, phase: 2, ordre: 16, description: 'Réseau d\'ambassadeurs culturels et prescripteurs pour lancements de produits.', titulaire: '', charge_estimee: '40%', statut_recrutement: 'pourvu' },
  { id: 'p17', titre: 'Photographe Freelance', pole: 'Creatif', niveau: 3, parentId: null, phase: 1, ordre: 17, description: 'Renfort lors des pics d\'activations terrain et shootings e-commerce.', titulaire: '', charge_estimee: '50%', statut_recrutement: 'pourvu' },
];

// Aucune tache de demonstration. Les taches visibles dans le Kanban sont
// celles creees par l'utilisateur, ou recuperees du serveur.
export const INITIAL_TASKS: Task[] = [];

// Les prospects sont saisis par l'équipe ou arrivent du site public.
export const INITIAL_LEADS: Lead[] = [];

// Les rapports sont générés par le copilote.
export const INITIAL_REPORTS: AgentReport[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const INITIAL_MESSAGES: ChannelMessage[] = [];

export const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'ev-1',
    title: 'Sortie Terrain 1/9 — Shooting Maison Kotto',
    description: 'Captation visuelle des ateliers de fabrication et portraits de l\'équipe dirigeante.',
    start_date: '2026-09-14 09:00',
    end_date: '2026-09-14 14:00',
    event_type: 'terrain',
    pole: 'Creatif',
    lieu: 'Atelier Kotto, Yaoundé'
  },
  {
    id: 'ev-2',
    title: 'Livraison Définitive & Formation 2h Districash',
    description: 'Mise en ligne du portail consolidé 12 000 références et formation des chefs de rayon.',
    start_date: '2026-09-17 15:00',
    end_date: '2026-09-17 17:00',
    event_type: 'launch',
    pole: 'Tech',
    lieu: 'Visioconférence Google Meet'
  },
  {
    id: 'ev-3',
    title: 'Comité de Direction & Pilotage Hebdo',
    description: 'Analyse des leads du site web v2, état des conversions et trésorerie agence.',
    start_date: '2026-09-19 11:00',
    end_date: '2026-09-19 12:30',
    event_type: 'meeting',
    pole: 'Direction',
    lieu: 'Salle de réunion Arckaton Mimboman'
  }
];

// Les projets sont créés depuis les leads ou saisis manuellement.
export const INITIAL_PROJETS: Projet[] = [];

export const CURRENT_PROFILES: UserProfile[] = [];

export const INITIAL_REALISATIONS: Realisation[] = [
  {
    id: 'kotto',
    name: 'Maison Kotto',
    category: 'ecommerce',
    categoryLabel: 'Cosmétique & Luxe Africain',
    forfait: 'Forfait Architecture',
    description: "Refonte complète de l'identité de marque, boutique e-commerce avec encaissement Mobile Money automatisé (MTN/Orange) et 3 capsules vidéo par semaine.",
    mainMetric: '+337%',
    mainMetricLabel: 'De conversion e-commerce en 6 mois',
    subMetric: 'Paniers moyens passés de 14 000 FCFA à 38 000 FCFA',
    points: [
      'Passerelle MTN MoMo & Orange Money sans friction avec validation instantanée',
      'Shooting photo studio & direction artistique packaging à Yaoundé',
      'Suivi régulier des stocks et synchronisation multi-boutiques'
    ],
    delay: '7 semaines de déploiement'
  },
  {
    id: 'districash',
    name: 'Districash Nord',
    category: 'saas',
    categoryLabel: 'Grande Distribution & Négoce',
    forfait: 'ARKA-PME SaaS',
    description: 'Déploiement du logiciel ARKA-PME sur 4 dépôts régionaux pour synchroniser les stocks, éliminer les pertes et automatiser la facturation hors-ligne.',
    mainMetric: '12,8M FCFA',
    mainMetricLabel: 'Flux financier consolidé sans écart de caisse',
    subMetric: '12 000 références suivies en temps réel',
    points: [
      "Temps d'inventaire complet réduit de 3 heures à 12 minutes",
      'Fonctionnement 100% garanti hors connexion en cas de coupure',
      'Clôture comptable automatique par caissier et par point de vente'
    ],
    delay: 'Déployé en 10 jours'
  },
  {
    id: 'rapha',
    name: 'Clinique El Rapha',
    category: 'sante',
    categoryLabel: 'Santé & Établissement Médical',
    forfait: 'Forfait Synergie',
    description: 'Site vitrine médical haut de gamme, prise de rendez-vous en ligne, SEO local Yaoundé et 9 sorties terrain pour valoriser les spécialistes et équipements.',
    mainMetric: '4.9 / 5',
    mainMetricLabel: 'Note moyenne Google & Avis Patients',
    subMetric: '1ère position sur les requêtes spécialisées à Yaoundé',
    points: [
      'Taux de rebond réduit à 24% sur mobile avec design ergonomique',
      'Prise de rendez-vous directe synchronisée avec le secrétariat',
      'Capsules pédagogiques vidéo animées par les médecins'
    ],
    delay: '3 semaines de production'
  }
];

export const INITIAL_TEMOIGNAGES: Temoignage[] = [
  {
    id: 'temoignage-kotto',
    author: 'Mireille Kotto',
    role: 'Fondatrice & Gérante',
    company: 'Maison Kotto, Bastos',
    text: "Arckaton a résolu le cauchemar des fausses captures d'écran de transfert. Désormais, l'argent est sur notre compte avant même que le livreur ne charge le colis. C'est le jour et la nuit.",
    metrics: '+337% de conversion • 12.4M FCFA encaissés • 0 impayé'
  },
  {
    id: 'temoignage-districash',
    author: 'Direction Générale',
    role: 'Directeur des Opérations',
    company: 'Districash Nord, Douala',
    text: "Nos gérants ne perdent plus aucune vente lors des coupures de courant. L'inventaire est passé de 3 heures à 12 minutes chrono. ARKA-PME a sauvé notre rentabilité.",
    metrics: 'Inventaire en 12 min • 12 000 références • Mode hors-ligne'
  },
  {
    id: 'temoignage-rapha',
    author: 'Direction Médicale',
    role: 'Praticien Hospitalier',
    company: 'Clinique El Rapha, Yaoundé',
    text: "La fiche Google a déjà généré une hausse visible des appels pour les consultations. Les rendez-vous en ligne ont modernisé l'accueil de notre secrétariat.",
    metrics: '4.9/5 Google • +38 appels/semaine • 1ère position locales'
  }
];
