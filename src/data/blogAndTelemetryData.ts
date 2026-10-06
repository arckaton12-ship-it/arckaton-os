import { BlogPost, DataTransferEvent, UniversalSiteConfig } from '../types';
import heroSystemCubeImg from '../assets/images/arckaton_system_cube_1789213196858.webp';
import arkaPosTerminalImg from '../assets/images/arka_pos_terminal_1789213210031.webp';
import fieldProductionCamImg from '../assets/images/field_production_cam_1789213222736.webp';
import polesNetworkHubImg from '../assets/images/poles_network_hub_1789213238339.webp';

export const DEFAULT_SITE_CONFIG: UniversalSiteConfig = {
  announcement: {
    enabled: true,
    badge: 'DÉPLOIEMENT T3 2026',
    text: 'Ouverture du pôle Grand Compte à Douala Bonanjo & Passerelles MTN MoMo v2.1 opérationnelles.',
    button_text: 'Découvrir le rapport',
    target_url: '#blog',
  },
  hero: {
    badge: 'Agence Digitale & Éditeur Logiciel • Yaoundé & Partout dans le Monde',
    title_line_1: 'On ne livre pas un site.',
    title_highlight: 'On déploie votre système.',
    subtitle: "Conception sur-mesure de plateformes e-commerce avec encaissement instantané MTN MoMo & Orange Money, activations terrain et le logiciel ARKA-PME pour piloter votre entreprise sans dépendre d'Internet.",
    cta_primary: 'Demander un devis interactif',
    cta_secondary: 'Tester ARKA-PME (30j gratuit)',
    stat_1_val: '10-14j',
    stat_1_label: 'Délai moyen de livraison contractuel',
    stat_2_val: '100%',
    stat_2_label: 'Fonctionnel hors-ligne pour ARKA-PME',
    stat_3_val: '0 FCFA',
    stat_3_label: 'Frais de licence forcée ou matériel imposé',
  },
  contact: {
    whatsapp_number: '+237681462982',
    whatsapp_display: '+237 681 46 29 82',
    phone_call: '+237 681 46 29 82',
    email_contact: 'ARCKATON12@gmail.com',
    address_yaounde: 'Quartier Bastos, Carrefour Dragages, Yaoundé, Cameroun',
    address_douala: 'Bonanjo, Face Chambre de Commerce, Douala, Cameroun',
    disponibilite: 'Support technique 24/7 sous astreinte • Bureaux 8h00 - 18h30',
  },
};

export const INITIAL_BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-1',
    title: 'Immersion Terrain : 48h au cœur des commerces de Mokolo & Mimboman avec notre équipe captation',
    slug: 'immersion-terrain-mokolo-mimboman-captation-arka',
    category: 'terrain',
    category_label: 'Opérations Terrain',
    read_time: '5 min',
    excerpt: 'Comment nos cadreurs et spécialistes UX transforment un étal physique en catalogue e-commerce haute définition sans interrompre l\'activité du commerçant.',
    content: `À 7h30 du matin au marché de Mokolo à Yaoundé, le flux de clients est déjà dense. Dans le cadre de notre Forfait Synergie, notre pôle terrain intervient directement sur site pour capturer l'essence authentique des produits.

Accompagné d'un stabilisateur DJI RS3, de micros HF cravate et d'éclairages LED autonomes sur batterie, Boris W. et Diane B. ont orchestré 3 heures de captation continue.

"Le commerçant n'a pas 15 jours à consacrer à un studio photo. Notre méthode est claire : c'est l'agence qui descend dans la poussière du terrain pour capter la réalité et l'élever aux standards internationaux."

Résultats livrés en 48 heures :
- 60 visuels produits détourés et optimisés pour le web mobile
- 4 vidéos courtes (Reels/TikTok) captant le geste artisanal
- Intégration directe dans le catalogue ARKA-PME du client.`,
    author_name: 'Boris W.',
    author_role: 'Directeur des Opérations & Terrain',
    date: '10 Septembre 2026',
    image: fieldProductionCamImg,
    tags: ['Terrain', 'Yaoundé', 'Shooting 4K', 'Mokolo', 'Commerce Local'],
    featured: true,
    field_spec: {
      lieu: 'Marché Mokolo & Mimboman, Yaoundé',
      date_mission: '08 Septembre 2026',
      materiel: 'Sony Alpha 7IV, DJI RS3, Kit Nanlite Pavotube, Bornes de test ARKA-PME',
      agents_mobilises: ['Boris W. (Chef Op)', 'Diane B. (DA)', 'Cadreur Terrain #1'],
      livrables_generes: '60 photographies RAW traitées + 4 capsules vidéo 4K + 1 catalogue digital synchronisé',
    },
  },
  {
    id: 'post-2',
    title: 'Étude de Cas : Comment Maison Kotto a quadruplé son chiffre d\'affaires digital avec MTN MoMo direct',
    slug: 'etude-de-cas-maison-kotto-ecommerce-momo-orange',
    category: 'client',
    category_label: 'Client Satisfait & ROI',
    read_time: '6 min',
    excerpt: 'Analyse d\'une transformation digitale complète : passage d\'un tunnel WhatsApp chaotique à un e-commerce sur mesure convertissant à 4.8%.',
    content: `Avant l'intervention d'Arckaton, Maison Kotto (boutique de prêt-à-porter haut de gamme à Bastos) subissait un taux d'abandon de commande de 72% sur WhatsApp. Les clients devaient négocier, demander le numéro MoMo, envoyer une capture d'écran, attendre la vérification manuelle...

Grâce au Forfait Architecture Arckaton :
1. Déploiement d'un site web à l'esthétique épurée avec chargement ultra-rapide (<1.2s sur réseau 3G/4G local).
2. Passerelle de paiement automatisée : le client clique, entre son numéro MTN ou Orange, valide son code PIN sur son téléphone, et la commande est confirmée en 4 secondes.
3. Notification instantanée par SMS et impression automatique du bordereau de livraison sur l'imprimante thermique du magasin.

En 45 jours d'exploitation :
- +337% de transactions en ligne effectives
- Zéro litige sur les preuves de virement falsifiées
- 12 400 000 FCFA d'encaissements sécurisés.`,
    author_name: 'Patrice M.',
    author_role: 'Directeur Général Arckaton',
    date: '06 Septembre 2026',
    image: heroSystemCubeImg,
    tags: ['E-commerce', 'Mobile Money', 'ROI', 'Yaoundé', 'Maison Kotto'],
    featured: true,
    client_quote: {
      author: 'Mireille Kotto',
      company: 'Maison Kotto Bastos',
      role: 'Fondatrice & Gérante',
      quote: "Arckaton a résolu le cauchemar des fausses captures d'écran de transfert. Désormais, l'argent est sur notre compte avant même que le livreur ne charge le colis. C'est le jour et la nuit.",
      metrics: '+337% de conversion • 12.4M FCFA encaissés • 0 impayé',
    },
  },
  {
    id: 'post-3',
    title: 'De 3 heures de pointage papier à 12 minutes chrono : Déploiement ARKA-PME chez Districash Nord',
    slug: 'deploiement-arka-pme-districash-nord-douala',
    category: 'arka',
    category_label: 'SaaS ARKA-PME',
    read_time: '4 min',
    excerpt: 'Retour d\'expérience chez un grossiste en matériaux à Douala : éliminer la dépendance à Internet tout en gardant une caisse infaillible.',
    content: `À Douala, les délestages électriques et les coupures de fibre sous-marine peuvent paralyser une entreprise pendant plusieurs jours. Pour Districash Nord (3 hangars de stockage, 4 800 références), utiliser un logiciel Cloud classique était une source permanente d'angoisse.

Arckaton a installé l'architecture ARKA-PME :
- Base de données SQLite chiffrée embarquée localement sur les ordinateurs et tablettes de caisse.
- Fonctionnement 100% autonome sans aucune connexion Internet requise.
- Dès que la connexion revient (même 3G via partage de connexion), les stocks se synchronisent en tâche de fond de manière invisible.

Le temps de clôture de caisse quotidien est passé de 3h15 à 12 minutes précises, avec traçabilité intégrale de chaque sortie d'entrepôt.`,
    author_name: 'Yannick K.',
    author_role: 'Tech Lead & Architecte SaaS',
    date: '01 Septembre 2026',
    image: arkaPosTerminalImg,
    tags: ['ARKA-PME', 'Offline-First', 'Douala', 'Gestion Stock', 'Logistique'],
    featured: false,
    client_quote: {
      author: 'El Hadj Ousmane',
      company: 'Districash Nord',
      role: 'Directeur Général',
      quote: "Même quand la lumière coupe et qu'Internet s'arrête, mes caissiers continuent de biper les articles et d'imprimer les tickets. C'est exactement ce dont les PME d'ici ont besoin.",
      metrics: '3h03 de gagnées chaque soir • 4 800 articles suivis en temps réel',
    },
  },
  {
    id: 'post-4',
    title: 'Coulisses R&D : Comment concevoir des architectures web résilientes face aux réalités africaines',
    slug: 'coulisses-rd-architecture-resiliente-afrique-centrale',
    category: 'tech',
    category_label: 'Ingénierie & Tech',
    read_time: '7 min',
    excerpt: 'Pourquoi nous refusons les frameworks lourds et comment notre stack technique garantit une fluidité absolue même en zone à faible couverture réseau.',
    content: `Trop d'agences importent des modèles occidentaux inadaptés au contexte camerounais : sites de 15 Mo bardés de scripts tiers, formulaires nécessitant une carte bancaire Visa internationale, hébergements lointains avec 350ms de latence...

Chez Arckaton, notre charte d'ingénierie repose sur 4 piliers stricts :
1. Poids total de la page d'accueil bridé sous les 800 Ko (compression Brotli / WebP chirurgicale).
2. PWA (Progressive Web App) avec mise en cache agressive des actifs vitaux.
3. Intégration native des Webhooks MTN MoMo v2 et Orange Money avec file d'attente résiliente (RabbitMQ / BullMQ) pour ne jamais perdre un paiement en cas de micro-coupure de l'opérateur télécom.
4. Hébergement distribué avec CDN Edge en Afrique de l'Ouest pour garantir un First Contentful Paint inférieur à 800ms.`,
    author_name: 'Arthur N.',
    author_role: 'Lead Développeur Full-Stack',
    date: '28 Août 2026',
    image: polesNetworkHubImg,
    tags: ['Architecture', 'Performance', 'Webhooks', 'MoMo API', 'Souveraineté'],
    featured: false,
  },
];

// Le flux d'activite est genere par les actions reelles de l'equipe :
// aucun echange de demonstration n'est injecte au demarrage.
export const INITIAL_DATA_TRANSFERS: DataTransferEvent[] = [];

