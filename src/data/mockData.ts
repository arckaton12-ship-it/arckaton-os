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

export const POLES_INFO: Record<string, { name: string; manager: string; color: string; desc: string }> = {
  Direction: { name: 'Direction & Stratégie', manager: 'Patrice M.', color: '#00c97a', desc: 'Gouvernance, pilotage de rentabilité et vision globale' },
  Creatif: { name: 'Studio & Créatif', manager: 'Yannick B.', color: '#a880ff', desc: 'Identité de marque, direction artistique, motion design et shooting' },
  Tech: { name: 'Tech & Architecture SaaS', manager: 'Arthur N.', color: '#4d8dff', desc: 'Développement web, ARKA-PME, intégration Mobile Money MTN/Orange' },
  Digital: { name: 'Growth & Marketing Digital', manager: 'Nadine E.', color: '#f5a83c', desc: 'SEO local, campagnes publicitaires, social media et acquisition' },
  Client: { name: 'Expérience Client & Terrain', manager: 'Amina N.', color: '#ff4d6a', desc: 'Suivi de compte, activations terrain mensuelles et satisfaction' },
  Externe: { name: 'Partenaires & Conseil Externe', manager: 'Cabinet Me Fotso', color: '#8892a4', desc: 'Juridique, expertise comptable et réseau de partenaires' }
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
  { id: 'p1', titre: 'Chef d\'Agence', pole: 'Direction', phase: 1, ordre: 1, description: 'Pilotage stratégique, allocation des ressources et rentabilité des projets clients.', titulaire: 'Patrice M.', charge_estimee: '92%', statut_recrutement: 'pourvu' },
  { id: 'p2', titre: 'Responsable Technique', pole: 'Tech', phase: 1, ordre: 2, description: 'Supervision des architectures web, intégrations APIs Mobile Money et robustesse.', titulaire: 'Samuel T.', charge_estimee: '85%', statut_recrutement: 'pourvu' },
  { id: 'p3', titre: 'Développeur Web', pole: 'Tech', phase: 1, ordre: 3, description: 'Intégration frontend réactive, compatibilité connexion basse et CMS.', titulaire: 'Élodie K.', charge_estimee: '78%', statut_recrutement: 'pourvu' },
  { id: 'p4', titre: 'Graphiste / Motion Designer', pole: 'Creatif', phase: 1, ordre: 4, description: 'Création d\'identités visuelles, chartes, animations et visuels réseaux sociaux.', titulaire: 'Yannick B.', charge_estimee: '88%', statut_recrutement: 'pourvu' },
  { id: 'p5', titre: 'Chargé(e) de Compte', pole: 'Client', phase: 1, ordre: 5, description: 'Point de contact privilégié des PME clientes, suivi des validations et livrables.', titulaire: 'Amina N.', charge_estimee: '80%', statut_recrutement: 'pourvu' },

  // Phase 2 : Croissance
  { id: 'p6', titre: 'Directeur Créatif', pole: 'Creatif', phase: 2, ordre: 6, description: 'Direction artistique globale, tonalité de marque et standing des productions.', titulaire: 'Marcelle D.', charge_estimee: '70%', statut_recrutement: 'pourvu' },
  { id: 'p7', titre: 'Community Manager', pole: 'Digital', phase: 2, ordre: 7, description: 'Animation des communautés, modération et diffusion des contenus sur-mesure.', titulaire: 'Christian F.', charge_estimee: '75%', statut_recrutement: 'pourvu' },
  { id: 'p8', titre: 'Dev Full-Stack / CTO', pole: 'Tech', phase: 2, ordre: 8, description: 'Évolution du SaaS ARKA-PME, bases de données et scalabilité.', titulaire: 'Arthur N.', charge_estimee: '90%', statut_recrutement: 'pourvu' },
  { id: 'p9', titre: 'Responsable Ads & SEO', pole: 'Digital', phase: 2, ordre: 9, description: 'Campagnes Google/Meta Ads, référencement naturel local et suivi des conversions.', titulaire: 'Nadine E.', charge_estimee: '82%', statut_recrutement: 'pourvu' },
  { id: 'p10', titre: 'Assistante Administrative', pole: 'Direction', phase: 2, ordre: 10, description: 'Facturation, conformité des devis, organisation interne et accueil.', titulaire: 'Solange M.', charge_estimee: '65%', statut_recrutement: 'pourvu' },

  // Phase 3 : Expansion
  { id: 'p11', titre: 'Directeur Commercial', pole: 'Client', phase: 3, ordre: 11, description: 'Acquisition de comptes grands comptes PME, partenariats et offres sur-mesure.', titulaire: 'Poste ouvert', charge_estimee: '0%', statut_recrutement: 'recrutement_ouvert' },
  { id: 'p12', titre: 'Vidéaste / Photographe', pole: 'Creatif', phase: 3, ordre: 12, description: 'Captations terrain haute définition, interviews clients et capsules vidéos.', titulaire: 'Boris W.', charge_estimee: '84%', statut_recrutement: 'pourvu' },
  { id: 'p13', titre: 'Rédacteur / Copywriter', pole: 'Digital', phase: 3, ordre: 13, description: 'Rédaction persuasive orientée conversion, articles de fond et scripts.', titulaire: 'Kelly O.', charge_estimee: '60%', statut_recrutement: 'pourvu' },
  { id: 'p14', titre: 'Comptable / Expert Fiscal', pole: 'Direction', phase: 3, ordre: 14, description: 'Gestion financière agence, trésorerie et conformité fiscale CEMAC.', titulaire: 'Audit Conseil SARL', charge_estimee: '45%', statut_recrutement: 'pourvu' },

  // Phase 4 : Maturité
  { id: 'p15', titre: 'Conseiller Juridique', pole: 'Externe', phase: 4, ordre: 15, description: 'Contrats de propriété intellectuelle, accords SaaS et protection de marque.', titulaire: 'Cabinet Me Fotso', charge_estimee: '30%', statut_recrutement: 'pourvu' },
  { id: 'p16', titre: 'Influenceur / KOL', pole: 'Externe', phase: 4, ordre: 16, description: 'Réseau d\'ambassadeurs culturels et prescripteurs pour lancements de produits.', titulaire: 'Réseau Partenaires', charge_estimee: '40%', statut_recrutement: 'pourvu' },
  { id: 'p17', titre: 'Photographe Freelance', pole: 'Creatif', phase: 4, ordre: 17, description: 'Renfort lors des pics d\'activations terrain et shootings e-commerce.', titulaire: 'Pool Freelances', charge_estimee: '50%', statut_recrutement: 'pourvu' },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    titre: 'Intégration passerelle Mobile Money MTN/Orange',
    description: 'Vérification du webhook de notification de paiement et tests sandbox avec devise FCFA pour le client Maison Kotto.',
    statut: 'en_cours',
    priorite: 'urgente',
    pole: 'Tech',
    assignee_name: 'Arthur N.',
    assignee_id: 'u3',
    poste_titre: 'Dev Full-Stack / CTO',
    date_echeance: '2026-09-18',
    created_at: '2026-09-10'
  },
  {
    id: 't2',
    titre: 'Shooting produits & packaging Districash',
    description: 'Captation terrain 9 sorties du mois pour renouvellement du catalogue en ligne (50 nouvelles références).',
    statut: 'a_faire',
    priorite: 'haute',
    pole: 'Creatif',
    assignee_name: 'Boris W.',
    assignee_id: 'u6',
    poste_titre: 'Vidéaste / Photographe',
    date_echeance: '2026-09-20',
    created_at: '2026-09-11'
  },
  {
    id: 't3',
    titre: 'Audit SEO & Google Business Profile Clinique El Rapha',
    description: 'Optimisation de la fiche locale Yaoundé et structure sémantique pour recherche urgences médicales.',
    statut: 'termine',
    priorite: 'normale',
    pole: 'Digital',
    assignee_name: 'Nadine E.',
    assignee_id: 'u4',
    poste_titre: 'Responsable Ads & SEO',
    date_echeance: '2026-09-12',
    created_at: '2026-09-08'
  },
  {
    id: 't4',
    titre: 'Revue budgétaire & rapport mensuel PME Forfait Synergie',
    description: 'Consolidation des KPIs de conversion (+337%) et préparation de la restitution client.',
    statut: 'en_cours',
    priorite: 'haute',
    pole: 'Direction',
    assignee_name: 'Patrice M.',
    assignee_id: 'u1',
    poste_titre: 'Chef d\'Agence',
    date_echeance: '2026-09-16',
    created_at: '2026-09-09'
  },
  {
    id: 't5',
    titre: 'Onboarding 30 jours ARKA-PME Supermarché Mimboman',
    description: 'Configuration du catalogue initial et formation 2h sur la gestion des stocks hors-ligne.',
    statut: 'a_faire',
    priorite: 'normale',
    pole: 'Client',
    assignee_name: 'Amina N.',
    assignee_id: 'u5',
    poste_titre: 'Chargé(e) de Compte',
    date_echeance: '2026-09-22',
    created_at: '2026-09-11'
  }
];

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-101',
    name: 'Mme Clarisse Mbida',
    email: 'clarisse.m@kottodistrib.cm',
    phone: '+237 677 45 12 89',
    project_type: 'E-commerce & Mobile Money',
    budget: '750 000 FCFA – 1 500 000 FCFA',
    message: 'Nous voulons digitaliser notre boutique de cosmétiques avec encaissement direct MTN et Orange Money. Besoin urgent sous 3 semaines.',
    source: 'site_v2_devis',
    statut: 'nouveau',
    notes: 'Priorité forte. Souhaite une démo d\'ARKA-PME pour synchroniser le stock de sa boutique à Douala.',
    pole_assigned: 'Tech',
    country: 'Cameroun',
    created_at: 'Aujourd\'hui à 14:20'
  },
  {
    id: 'lead-102',
    name: 'Dr. Alain Tchakounté',
    email: 'contact@clinique-etoile.com',
    phone: '+237 699 31 04 55',
    project_type: 'Site web vitrine UX/UI',
    budget: '750 000 FCFA (Forfait Synergie)',
    message: 'Refonte complète du site de notre cabinet médical à Yaoundé. Prise de rendez-vous en ligne et forte crédibilité exigée.',
    source: 'site_v2',
    statut: 'qualifie',
    notes: 'Orientation vers Forfait Synergie avec 9 sorties terrain pour photos pro de l\'équipe soignante.',
    pole_assigned: 'Digital',
    country: 'Cameroun',
    created_at: 'Hier à 18:45'
  },
  {
    id: 'lead-103',
    name: 'Stéphane Belinga',
    email: 's.belinga@africatrade.net',
    phone: '+33 6 42 18 90 23',
    project_type: 'ARKA-PME (essai 30j) — Distribution',
    budget: 'Fourchette SaaS ARKA-PME',
    message: 'Test du logiciel ARKA-PME pour 3 dépôts de quincaillerie à Bafoussam et Yaoundé. Besoin d\'inventaire rapide en 12 minutes.',
    source: 'site_v2_trial',
    statut: 'contacte',
    notes: 'Diaspora gérant des points de vente à distance. A salué le concept d\'inventaire rapide.',
    pole_assigned: 'Tech',
    country: 'France / Cameroun (Monde 🌍)',
    created_at: '10 Sept 2026'
  }
];

export const INITIAL_REPORTS: AgentReport[] = [
  {
    id: 'rep-01',
    client_name: 'M. Jean-Paul Onana',
    sujet: 'Cadrage projet e-commerce d\'artisanat d\'art camerounais',
    pole: 'Tech',
    resume: 'Le visiteur a exploré les forfaits. Il a un catalogue de 40 sculptures et masques et souhaite vendre en Europe et en Afrique centrale avec Mobile Money et carte bancaire. L\'agent lui a présenté le forfait Architecture sans donner de faux prix et l\'a orienté vers le formulaire interactif de devis.',
    intention: 'devis',
    contact_info: '+237 691 22 34 81 | jp.onana@artscameroun.cm',
    created_at: 'Il y a 2 heures',
    status: 'non_traite',
    messages_count: 6
  },
  {
    id: 'rep-02',
    client_name: 'Pharmacie du Carrefour',
    sujet: 'Demande d\'essai gratuit 30 jours logiciel ARKA-PME',
    pole: 'Tech',
    resume: 'Client très intéressé par la promesse de passer de 3h d\'inventaire à 12 minutes. Voulait savoir si le logiciel fonctionne sans connexion internet stable à Yaoundé. L\'agent a confirmé la robustesse hors-ligne et a déclenché le modal d\'essai.',
    intention: 'essai',
    contact_info: '+237 670 11 88 99 | pharmacie.mimboman@gmail.com',
    created_at: 'Aujourd\'hui à 11:15',
    status: 'en_cours',
    messages_count: 8
  }
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    title: 'Nouveau Devis Reçu !',
    message: 'Mme Clarisse Mbida a soumis une demande pour E-commerce & Mobile Money.',
    type: 'lead',
    read: false,
    created_at: 'Il y a 25 min',
    link: '/leads',
    pole: 'Tech'
  },
  {
    id: 'n2',
    title: 'Rapport IA transmis au Dashboard',
    message: 'L\'Agent du site a qualifié le projet de M. Jean-Paul Onana pour le pôle Tech.',
    type: 'system',
    read: false,
    created_at: 'Il y a 2 heures',
    link: '/reports',
    pole: 'Direction'
  },
  {
    id: 'n3',
    title: 'Rappel Sortie Terrain',
    message: 'Shooting photo pour Districash Nord prévu demain à 09h30.',
    type: 'task',
    read: true,
    created_at: 'Il y a 5 heures',
    link: '/calendar',
    pole: 'Creatif'
  }
];

export const INITIAL_MESSAGES: ChannelMessage[] = [
  {
    id: 'm1',
    channel_id: 'general',
    sender_name: 'Patrice M.',
    sender_role: 'Chef d\'Agence',
    pole: 'Direction',
    content: 'Bienvenue à tous sur Arckaton OS ! Rappel : notre mission est de livrer un système digital complet, pas de simples maquettes. Objectif cette semaine : finaliser la livraison Maison Kotto (+337% de conversion confirmés).',
    created_at: '09:00'
  },
  {
    id: 'm2',
    channel_id: 'general',
    sender_name: 'Arthur N.',
    sender_role: 'Dev Full-Stack / CTO',
    pole: 'Tech',
    content: 'Côté ARKA-PME, la synchronisation avec les terminaux Orange Money et MTN MoMo est 100% opérationnelle en mode connexion faible.',
    created_at: '09:24'
  },
  {
    id: 'm3',
    channel_id: 'general',
    sender_name: 'Amina N.',
    sender_role: 'Chargée de Compte',
    pole: 'Client',
    content: 'Superbe ! Les retours clients sur le support WhatsApp sous 24h sont excellents, note moyenne 4.9/5.',
    created_at: '10:05'
  }
];

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

export const INITIAL_PROJETS: Projet[] = [
  {
    id: 'prj-1',
    client_code: 'PRJ-KOTTO',
    name: 'Système E-commerce & Mobile Money',
    client_name: 'Maison Kotto',
    client_phone: '+237 699 44 22 11',
    client_email: 'direction@maisonkotto.cm',
    service: 'Boutique E-commerce & Mobile Money',
    forfait: 'Forfait Architecture (2 900 000 FCFA)',
    pole: 'Tech',
    budget_estime: '2 900 000 FCFA',
    deadline: '2026-10-15',
    progression: 75,
    chef_de_projet: 'Patrice M. (Chef d\'Agence)',
    sorties_terrain_total: 9,
    sorties_terrain_effectuees: 6,
    statut: 'en_cours',
    score: 95,
    notes_internes: 'Paiement MTN MoMo et Orange testés en sandbox avec succès. Reste la session de formation des 4 vendeurs et les 3 dernières captations terrain.',
    deliverables: ['Boutique en ligne 50 produits', 'Passerelle Mobile Money MTN/Orange', 'Formation 2h', '3 vidéos / semaine'],
    jalons: [
      { id: 'j1', titre: 'Cadrage stratégique & Charte graphique de marque', statut: 'valide', echeance: '2026-08-25', description: 'Palette couleurs, typographies et guidelines standing international' },
      { id: 'j2', titre: 'Maquettes interactives UX/UI Figma (Mobile-First)', statut: 'valide', echeance: '2026-09-02', description: 'Parcours d\'achat ultra-rapide optimisé pour smartphones' },
      { id: 'j3', titre: 'Intégration technique & Passerelle Mobile Money MTN/Orange', statut: 'en_cours', echeance: '2026-09-20', description: 'Gestion des paiements directs en FCFA et reçus automatiques' },
      { id: 'j4', titre: 'Recette finale, Formation équipe & Déploiement en ligne', statut: 'en_attente', echeance: '2026-10-10', description: 'Mise en production sécurisée sur domaine officiel et formation 2h' },
    ],
    sorties_terrain: [
      { id: 'sv1', numero: 1, date: '2026-08-28', lieu: 'Atelier Kotto, Bonanjo Douala', objectif: 'Prise de vue des artisans au travail', intervenant: 'Boris W. (Vidéaste)', statut: 'livree', medias_count: 34 },
      { id: 'sv2', numero: 2, date: '2026-09-02', lieu: 'Boutique Kotto, Akwa Douala', objectif: 'Shooting photo haute définition des 50 articles', intervenant: 'Boris W. (Vidéaste)', statut: 'livree', medias_count: 85 },
      { id: 'sv3', numero: 3, date: '2026-09-05', lieu: 'Yaoundé Hilton', objectif: 'Interview de la créatrice et capsule vidéo teaser', intervenant: 'Yannick B. + Boris W.', statut: 'livree', medias_count: 12 },
      { id: 'sv4', numero: 4, date: '2026-09-08', lieu: 'Showroom Kotto Douala', objectif: 'Reels Instagram & TikTok pour le lancement', intervenant: 'Christian F. (CM)', statut: 'livree', medias_count: 18 },
      { id: 'sv5', numero: 5, date: '2026-09-12', lieu: 'Atelier Kotto, Bonanjo', objectif: 'Détails des finitions tissus & packaging', intervenant: 'Boris W.', statut: 'livree', medias_count: 42 },
      { id: 'sv6', numero: 6, date: '2026-09-14', lieu: 'Showroom Yaoundé', objectif: 'Témoignage client VIP et captation ambiance', intervenant: 'Boris W.', statut: 'en_montage', medias_count: 26 },
      { id: 'sv7', numero: 7, date: '2026-09-22', lieu: 'Boutique Akwa', objectif: 'Shooting collection capsule de fin d\'année', intervenant: 'Pool Freelances', statut: 'planifiee' },
      { id: 'sv8', numero: 8, date: '2026-09-29', lieu: 'Centre-ville Douala', objectif: 'Clip de campagne publicitaire sponsorisée', intervenant: 'Boris W.', statut: 'planifiee' },
      { id: 'sv9', numero: 9, date: '2026-10-06', lieu: 'Soirée de lancement officiel', objectif: 'Couverture événementielle complète', intervenant: 'Équipe Arckaton complète', statut: 'planifiee' },
    ],
    feedbacks: [
      { id: 'fb1', auteur: 'Maison Kotto', role: 'client', message: 'Les maquettes Figma sont magnifiques, la navigation sur smartphone est d\'une fluidité incroyable !', type: 'validation', date: '02 Sept 2026' },
      { id: 'fb2', auteur: 'Patrice M.', role: 'agence', message: 'Merci pour votre retour. Nous avons validé le BAT et démarré l\'implémentation de la passerelle Mobile Money.', type: 'validation', date: '03 Sept 2026' },
      { id: 'fb3', auteur: 'Maison Kotto', role: 'client', message: 'Est-il possible de recevoir un SMS de confirmation automatique pour le client après un paiement Orange Money ?', type: 'question', date: '11 Sept 2026' },
    ],
    created_at: '2026-08-20'
  },
  {
    id: 'prj-2',
    client_code: 'PRJ-RAPHA',
    name: 'Refonte Vitrine Médicale & Prise de RDV',
    client_name: 'Clinique El Rapha',
    client_phone: '+237 677 33 55 99',
    client_email: 'contact@clinique-elrapha.cm',
    service: 'Site Vitrine sur-mesure & Référencement Local',
    forfait: 'Forfait Synergie (750 000 FCFA)',
    pole: 'Digital',
    budget_estime: '750 000 FCFA',
    deadline: '2026-09-30',
    progression: 45,
    chef_de_projet: 'Amina N. (Chargée de Compte)',
    sorties_terrain_total: 9,
    sorties_terrain_effectuees: 4,
    statut: 'en_cours',
    score: 88,
    notes_internes: 'Charte médicale approuvée par la direction. Fiche Google Business optimisée (déjà +38 appels cette semaine). En attente des photos des blocs opératoires rénovés.',
    deliverables: ['Site vitrine 7 pages UX/UI', 'Fiche Google Business 4.9/5', 'Charte médicale', 'Module de prise de RDV WhatsApp'],
    jalons: [
      { id: 'rj1', titre: 'Audit de visibilité & Stratégie de référencement local Yaoundé', statut: 'valide', echeance: '2026-09-05', description: 'Positionnement sur "clinique urgence Yaoundé"' },
      { id: 'rj2', titre: 'Design de l\'interface de prise de rendez-vous médical', statut: 'valide', echeance: '2026-09-12', description: 'Formulaire rapide connecté au secrétariat médical' },
      { id: 'rj3', titre: 'Intégration du site responsive & optimisation vitesse de chargement', statut: 'en_cours', echeance: '2026-09-24', description: 'Chargement en moins de 1.8 seconde sur connexion 3G/4G' },
      { id: 'rj4', titre: 'Livraison finale & Campagne de lancement Google Ads', statut: 'en_attente', echeance: '2026-09-30', description: 'Lancement des annonces de proximité' },
    ],
    sorties_terrain: [
      { id: 'rsv1', numero: 1, date: '2026-09-03', lieu: 'Clinique El Rapha, Bastos Yaoundé', objectif: 'Portraits du corps médical et spécialistes', intervenant: 'Boris W.', statut: 'livree', medias_count: 28 },
      { id: 'rsv2', numero: 2, date: '2026-09-07', lieu: 'Clinique El Rapha, Bastos', objectif: 'Visite guidée des chambres et plateaux techniques', intervenant: 'Boris W.', statut: 'livree', medias_count: 32 },
      { id: 'rsv3', numero: 3, date: '2026-09-10', lieu: 'Accueil & Urgences', objectif: 'Capsule vidéo : "Votre prise en charge en 10 minutes"', intervenant: 'Boris W. + Kelly O.', statut: 'livree', medias_count: 15 },
      { id: 'rsv4', numero: 4, date: '2026-09-12', lieu: 'Laboratoire d\'analyses', objectif: 'Shooting équipements d\'imagerie de pointe', intervenant: 'Boris W.', statut: 'en_montage', medias_count: 19 },
    ],
    feedbacks: [
      { id: 'rfb1', auteur: 'Clinique El Rapha', role: 'client', message: 'La fiche Google a déjà généré une hausse visible des appels pour les consultations pédiatriques !', type: 'validation', date: '08 Sept 2026' },
    ],
    created_at: '2026-09-01'
  },
  {
    id: 'prj-3',
    client_code: 'PRJ-DISTR',
    name: 'Consolidation Multi-dépôts ARKA-PME',
    client_name: 'Districash Nord',
    client_phone: '+237 691 12 88 00',
    client_email: 'direction@districash-nord.cm',
    service: 'Déploiement SaaS ARKA-PME',
    forfait: 'Déploiement SaaS ARKA-PME (1 200 000 FCFA)',
    pole: 'Tech',
    budget_estime: '1 200 000 FCFA',
    deadline: '2026-09-25',
    progression: 100,
    chef_de_projet: 'Arthur N. (Dev Full-Stack / CTO)',
    sorties_terrain_total: 3,
    sorties_terrain_effectuees: 3,
    statut: 'livre',
    score: 98,
    notes_internes: '12 000 références intégrées avec succès. Inventaire passé de 3h à 12 minutes. Client ravi et souscripteur abonnement annuel support.',
    deliverables: ['12 000 références intégrées', 'Inventaire en 12 min', 'Mode hors-ligne synchronisé', 'Formation des 8 gérants de dépôt'],
    jalons: [
      { id: 'dj1', titre: 'Importation et nettoyage des 12 000 articles Excel/cahiers', statut: 'valide', echeance: '2026-08-10', description: 'Normalisation des codes-barres et tarifs' },
      { id: 'dj2', titre: 'Installation du logiciel ARKA-PME sur les 3 dépôts', statut: 'valide', echeance: '2026-08-18', description: 'Configuration du mode hors-ligne résistant aux coupures' },
      { id: 'dj3', titre: 'Test d\'inventaire contradictoire (12 min chronométrées)', statut: 'valide', echeance: '2026-08-25', description: 'Validation opérationnelle avec les directeurs de magasins' },
      { id: 'dj4', titre: 'Mise en exploitation définitive & Cérémonie de remise', statut: 'valide', echeance: '2026-09-05', description: 'Passage officiel en production' },
    ],
    feedbacks: [
      { id: 'dfb1', auteur: 'Districash Nord', role: 'client', message: 'Nos gérants ne perdent plus aucune vente lors des coupures de courant à Maroua et Garoua. ARKA-PME a sauvé notre rentabilité !', type: 'validation', date: '05 Sept 2026' }
    ],
    created_at: '2026-08-05'
  }
];

export const CURRENT_PROFILES: UserProfile[] = [
  { id: 'u1', name: 'Patrice M.', email: 'admin@arckaton.com', role: 'admin', pole: 'Direction', poste_id: 'p1', poste_titre: 'Chef d\'Agence', phone: '+237 681 46 29 82' },
  { id: 'u2', name: 'Yannick B.', email: 'crea@arckaton.com', role: 'site_editor', pole: 'Creatif', poste_id: 'p4', poste_titre: 'Graphiste / Motion Designer', phone: '+237 670 12 34 56' },
  { id: 'u3', name: 'Arthur N.', email: 'tech@arckaton.com', role: 'membre', pole: 'Tech', poste_id: 'p8', poste_titre: 'Dev Full-Stack / CTO', phone: '+237 690 98 76 54' },
  { id: 'u4', name: 'Nadine E.', email: 'growth@arckaton.com', role: 'membre', pole: 'Digital', poste_id: 'p9', poste_titre: 'Responsable Ads & SEO', phone: '+237 671 22 33 44' },
  { id: 'u5', name: 'Amina N.', email: 'client@arckaton.com', role: 'membre', pole: 'Client', poste_id: 'p5', poste_titre: 'Chargée de Compte', phone: '+237 695 55 66 77' },
];

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
