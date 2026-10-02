import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Lead,
  AgentReport,
  Task,
  ChannelMessage,
  AppNotification,
  UserProfile,
  Projet,
  Pole,
  TaskStatus,
  TaskPriority,
  ProjectMilestone,
  FieldVisit,
  ClientFeedback,
  ThemeMode,
  Currency,
  ForfaitData,
  BlogPost,
  DataTransferEvent,
  UniversalSiteConfig,
  Realisation,
  Temoignage,
} from '../types';
import {
  INITIAL_LEADS,
  INITIAL_REPORTS,
  INITIAL_TASKS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_PROJETS,
  FORFAITS_DATA,
  INITIAL_REALISATIONS,
  INITIAL_TEMOIGNAGES,
} from '../data/mockData';
import {
  DEFAULT_SITE_CONFIG,
  INITIAL_BLOG_POSTS,
  INITIAL_DATA_TRANSFERS,
} from '../data/blogAndTelemetryData';
import { useAuth } from './AuthContext';
import { apiRequest } from '../utils/api';
import { normaliserTache, TacheServeur } from '../utils/tasks';

// Helpers de synchronisation serveur (persistance Supabase côté Express)

const mapServerLead = (row: any): Lead => ({
  id: row.id,
  name: row.name,
  email: row.email || undefined,
  phone: row.phone,
  project_type: row.project_type || '',
  budget: row.budget || undefined,
  message: row.message || '',
  source: (row.source as Lead['source']) || 'site_v2_devis',
  statut: (row.statut as Lead['statut']) || 'nouveau',
  notes: row.notes || undefined,
  pole_assigned: (row.pole_assigned as Pole) || 'Direction',
  country: row.country || undefined,
  created_at: row.created_at || new Date().toISOString(),
});

const mapServerReport = (row: any): AgentReport => ({
  id: row.id,
  title: `${row.sujet || 'Rapport IA'} — Pôle ${row.pole || 'Direction'}`,
  sujet: row.sujet || '',
  client_name: row.client_name || row.lead_name || 'Prospect Site Web',
  lead_name: row.lead_name || row.client_name || 'Prospect Site Web',
  pole: (row.pole as Pole) || 'Direction',
  resume: row.resume || '',
  summary: row.resume || '',
  recommendations: row.recommendations || [],
  forfait_recommande: row.forfait_recommande || '',
  intention: (row.intention as AgentReport['intention']) || 'information',
  contact_info: row.contact_info || '',
  created_at: row.created_at || new Date().toISOString(),
  status: (row.status as AgentReport['status']) || 'non_traite',
  messages_count: row.messages_count ?? 1,
});

const mapServerProject = (row: any): Projet => ({
  id: row.project_ref || row.id,
  client_code: row.client_code || undefined,
  name: row.client_name || 'Projet',
  client_name: row.client_name || 'Client',
  client_phone: row.client_phone || undefined,
  client_email: row.client_email || undefined,
  service: row.service || '',
  forfait: row.forfait || undefined,
  pole: (row.pole as Pole) || 'Direction',
  budget_estime: row.budget_estime || '',
  deadline: row.deadline || '',
  deliverables: Array.isArray(row.deliverables) ? row.deliverables : [],
  score: Number(row.score || 0),
  statut: (row.statut as Projet['statut']) || 'en_cours',
  progression: Number(row.progression || 0),
  chef_de_projet: row.chef_de_projet || undefined,
  sorties_terrain_total: Number(row.sorties_terrain_total || 0),
  sorties_terrain_effectuees: Number(row.sorties_terrain_effectuees || 0),
  sorties_terrain: Array.isArray(row.sorties_terrain) ? row.sorties_terrain : [],
  jalons: Array.isArray(row.jalons) ? row.jalons : [],
  feedbacks: Array.isArray(row.feedbacks) ? row.feedbacks : [],
  notes_internes: row.notes_internes || row.notes || undefined,
  created_at: row.created_at || new Date().toISOString(),
});

// Un devis ou une facture tel qu'enregistré par le serveur. Le montant est
// un entier en FCFA. `type` distingue une proposition d'une facture : seul
// un document de type facture compte dans le chiffre d'affaires.
interface QuoteRow {
  id: string;
  quote_ref: string;
  type: 'devis' | 'facture';
  client_name: string;
  total: number;
  deposit: number;
  balance: number;
  status: string;
  created_at?: string;
}

// Profil utilisé tant que la session réelle n'est pas chargée. Il ne
// représente personne : l'identité affichée provient de l'annuaire serveur
// (membre connecté) ou de `osMembers`.
const PLACEHOLDER_PROFILE: UserProfile = {
  id: '',
  name: 'Utilisateur',
  email: '',
  role: 'membre',
  pole: 'Direction',
};

interface AppContextType {
  // Navigation Mode
  mode: 'public' | 'dashboard';
  setMode: (mode: 'public' | 'dashboard') => void;
  dashboardTab: string;
  setDashboardTab: (tab: string) => void;

  // Auth / Role Simulation
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  allProfiles: UserProfile[];

  // Leads & CRM
  leads: Lead[];
  addLead: (lead: Omit<Lead, 'id' | 'created_at'>) => { lead: Lead; whatsappLink: string };
  updateLeadStatus: (id: string, statut: Lead['statut']) => void;
  updateLeadNotes: (id: string, notes: string) => void;
  convertLeadToProject: (id: string) => { projet: Projet; message: string };

  // AI Reports
  reports: AgentReport[];
  agentReports: AgentReport[];
  addReport: (report: Omit<AgentReport, 'id' | 'created_at'>) => void;
  addAgentReport: (report: Partial<AgentReport>) => void;
  updateReportStatus: (id: string, status: AgentReport['status']) => void;

  // Tasks
  tasks: Task[];
  addTask: (task: any) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  remindTask: (id: string) => void;
  osMembers: Array<{ id: string; name: string; role: string; pole: Pole; poste_titre?: string | null; email?: string; phone?: string }>;
  /** Recharge l'annuaire réel depuis le serveur. */
  refreshOsMembers: () => Promise<void>;
  sendMessageAs: (
    author: { id?: string; name: string; role?: string; pole?: Pole },
    channelId: string,
    content: string
  ) => void;
  simulateExchange: (
    participants: Array<{ id?: string; name: string; role?: string; pole?: Pole }>,
    channelId: string,
    steps: string[]
  ) => number;

  // Messages
  messages: ChannelMessage[];
  sendMessage: (channelId: string, content: string) => void;
  deleteMessage: (id: string) => Promise<void>;
  // Canal affiché : la messagerie le signale pour que le rafraîchissement
  // automatique suive le canal que le membre regarde.
  activeChannel: string;
  setActiveChannel: (canal: string) => void;

  // Notifications
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  pushNotification: (n: Omit<AppNotification, 'id' | 'read'>) => void;

  // Projects
  projets: Projet[];

  // Devis & factures enregistrés (source unique du chiffre d'affaires)
  quotes: QuoteRow[];
  /** Somme des factures reais, en FCFA. Vaut 0 tant qu'aucune facture n'existe. */
  chiffreAffairesReel: number;
  refreshQuotes: () => Promise<void>;
  updateProjectProgression: (id: string, progression: number) => void;
  createProject: (projectData: Omit<Projet, 'id' | 'created_at'>) => Projet;
  updateProjectMilestone: (projectId: string, milestoneId: string, status: ProjectMilestone['statut']) => void;
  addProjectMilestone: (projectId: string, milestone: Omit<ProjectMilestone, 'id'>) => void;
  addProjectFeedback: (projectId: string, feedback: Omit<ClientFeedback, 'id' | 'date'>) => void;
  addProjectFieldVisit: (projectId: string, visit: Omit<FieldVisit, 'id'>) => void;
  updateProjectFieldVisit: (projectId: string, visitId: string, patch: Partial<FieldVisit>) => void;
  updateProjectNotes: (projectId: string, notes: string) => void;

  // Public Modals & Client Portal
  isClientPortalOpen: boolean;
  setIsClientPortalOpen: (open: boolean) => void;
  activeClientProjectCode: string | null;
  setActiveClientProjectCode: (code: string | null) => void;
  openClientPortal: (code?: string) => void;
  isQuoteModalOpen: boolean;
  setIsQuoteModalOpen: (open: boolean) => void;
  isTrialModalOpen: boolean;
  setIsTrialModalOpen: (open: boolean) => void;
  isAgentModalOpen: boolean;
  setIsAgentModalOpen: (open: boolean) => void;
  activeAgentPole: Pole;
  setActiveAgentPole: (pole: Pole) => void;
  selectedPole: Pole;
  setSelectedPole: (pole: Pole) => void;
  openAgentWithPole: (pole: Pole) => void;

  // Theme & Currency Customization
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;

  // Universal CMS & Modifiable Site Config
  siteConfig: UniversalSiteConfig;
  updateSiteConfig: (newConfig: Partial<UniversalSiteConfig>) => void;
  updateHeroConfig: (hero: Partial<UniversalSiteConfig['hero']>) => void;
  updateAnnouncementConfig: (announcement: Partial<UniversalSiteConfig['announcement']>) => void;
  updateContactConfig: (contact: Partial<UniversalSiteConfig['contact']>) => void;

  // Forfaits Management
  forfaits: ForfaitData[];
  updateForfait: (id: string, data: Partial<ForfaitData>) => void;

  // Blog & Field Stories
  blogPosts: BlogPost[];
  addBlogPost: (post: Omit<BlogPost, 'id' | 'date'>) => void;
  updateBlogPost: (id: string, post: Partial<BlogPost>) => void;
  deleteBlogPost: (id: string) => void;
  activeBlogPost: BlogPost | null;
  setActiveBlogPost: (post: BlogPost | null) => void;

  // Nodal Command Center & Telemetry Stream
  dataTransfers: DataTransferEvent[];

  // Blueprint & Méthode Modal
  isBlueprintModalOpen: boolean;
  setIsBlueprintModalOpen: (open: boolean) => void;
  isLegalModalOpen: boolean;
  setIsLegalModalOpen: (open: boolean) => void;

  // Data Fetching & Sync State for Skeleton Loaders
  isDataFetching: boolean;
  lastSyncTime: string;
  refreshDashboardData: () => Promise<void>;

  // CMS Contenu temps réel (supabase via serveur)
  realisations: Realisation[];
  updateRealisation: (id: string, data: Partial<Realisation>) => void;
  addRealisation: (data: Omit<Realisation, 'id'>) => void;
  deleteRealisation: (id: string) => void;
  temoignages: Temoignage[];
  updateTemoignage: (id: string, data: Partial<Temoignage>) => void;
  addTemoignage: (data: Omit<Temoignage, 'id'>) => void;
  deleteTemoignage: (id: string) => void;
  contentStatus: 'live' | 'local' | 'saving' | 'error';
  persistContent: (kind: string, slug: string, data: any, opts?: { published?: boolean; title?: string }) => Promise<void>;
  importSeedContent: () => Promise<number>;
  refreshContent: () => Promise<void>;
  isRealDataMode: boolean;
  purgeDemoData: () => void;
  restoreDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ---- Mode « données réelles » : purge des données de démonstration ----
const REAL_DATA_KEY = 'arckaton_real_data';
let purgeInProgress = false;

/**
 * Empreinte SHA-256 réelle d'un flux.
 *
 * L'interface annonçait « SHA-256 actif » alors que la valeur générée était
 * une suite de caractères au hasard. Une empreinte calculée pour de vrai
 * permet au moins de détecter qu'un enregistrement a été modifié ; ce
 * n'est pas un chiffrement, et le libellé le dit désormais.
 */
const sha256Hex = async (valeur: string): Promise<string> => {
  try {
    const donnees = new TextEncoder().encode(valeur);
    const empreinte = await crypto.subtle.digest('SHA-256', donnees);
    return Array.from(new Uint8Array(empreinte))
      .map((o) => o.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // Contexte sans Web Crypto : on le signale plutôt que d'inventer.
    return 'indisponible';
  }
};

const isRealDataMode = (): boolean => localStorage.getItem(REAL_DATA_KEY) === '1';

// Lecture d'un jeu de données : localStorage > (mode réel ? vide : seeds de démo)
const readSeeds = <T,>(storageKey: string, demoSeeds: T[]): T[] => {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // donnée corrompue : on repart des seeds / du mode réel
    }
  }
  return isRealDataMode() ? ([] as T[]) : demoSeeds;
};

// ---- Nettoyage unique des données d'équipe fictives ---------------------
// Les versions précédentes embarquaient une équipe imaginaire (Patrice M.,
// Arthur N., Boris W., ...) et leur attribuaient tâches, messages et
// notifications. Tout cela est retiré du navigateur au premier chargement de
// cette version.
//
// Règle : on ne supprime que les fixtures, jamais la saisie de l'utilisateur.
//   - tâches   : fixtures « t1 »…« t5 » ; une tâche créée par l'utilisateur
//                porte « t-<timestamp> » (avec tiret) → conservée ;
//   - messages : fixtures « m1 », « m2 », « m3 » → retirées ;
//   - notifs   : fixtures « n1 »…« n3 » → retirées.
// Identifiants des jeux de démonstration retirés du code. Ils sont
// listés explicitement, et non effacés en bloc : un visiteur qui a
// réellement créé un lead ou un projet après la démonstration conserve
// ses données, seules les fixtures d'origine partent.
const DEMO_SEED_IDS: Record<string, string[]> = {
  arckaton_tasks: ['t1', 't2', 't3', 't4', 't5'],
  arckaton_messages: ['m1', 'm2', 'm3'],
  arckaton_notifications: ['n1', 'n2', 'n3'],
  arckaton_leads: ['lead-101', 'lead-102', 'lead-103'],
  arckaton_projets: ['prj-1', 'prj-2', 'prj-3'],
  arckaton_reports: ['rep-01', 'rep-02'],
};

// v2 : la v1 ne nettoyait que les tâches, messages et notifications. Les
// leads, projets et rapports de démonstration sont traités dans cette
// version ; le numéro change pour que le nettoyage s'exécute une fois de
// plus chez les visiteurs qui sont déjà passés par la v1.
const LEGACY_TEAM_CLEANUP_KEY = 'arckaton_legacy_team_cleanup_v2';
let legacyTeamCleanupDone = false;

// Retire d'un tableau local tous les éléments dont l'identifiant figure dans
// la liste des fixtures. Renvoie le nombre d'éléments retirés.
const stripSeedItems = (storageKey: string, seedIds: string[]): number => {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return 0;
  const ids = new Set(seedIds);
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return 0;
    const kept = parsed.filter((item) => !ids.has(String(item?.id ?? '')));
    if (kept.length === parsed.length) return 0;
    localStorage.setItem(storageKey, JSON.stringify(kept));
    return parsed.length - kept.length;
  } catch {
    localStorage.removeItem(storageKey);
    return 1;
  }
};

const cleanupLegacyDemoTeam = () => {
  if (legacyTeamCleanupDone) return;
  legacyTeamCleanupDone = true;
  try {
    if (localStorage.getItem(LEGACY_TEAM_CLEANUP_KEY) === '1') return;
    Object.entries(DEMO_SEED_IDS).forEach(([key, ids]) => stripSeedItems(key, ids));
    localStorage.setItem(LEGACY_TEAM_CLEANUP_KEY, '1');
  } catch {
    /* stockage indisponible : l'application fonctionne sans ce nettoyage */
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Doit s'exécuter avant les useState ci-dessous, qui lisent localStorage.
  cleanupLegacyDemoTeam();

  // Annuaire réel, chargé depuis /api/members. Déclaré ici parce que les
  // helpers plus bas (relais WhatsApp par pôle) en dépendent.
  const memberDirectory = useRef<
    Array<{ id: string; name: string; role: string; pole: Pole; poste_titre?: string | null; phone?: string }>
  >([]);

  // Numéro WhatsApp du membre d'un pôle. Les profils de démonstration ayant
  // été retirés, on interroge l'annuaire réel : sans membre trouvé, aucun
  // numéro n'est envoyé, et l'appel WhatsApp est tout simplement ignoré.
  const recipientPhonesForPole = useCallback((pole: Pole): string[] => {
    const found = memberDirectory.current.find((p) => p.pole === pole && p.phone);
    return found?.phone ? [found.phone] : [];
  }, []);

  const [mode, setMode] = useState<'public' | 'dashboard'>('public');
  const [dashboardTab, setDashboardTab] = useState<string>('home');
  const [currentUser, setCurrentUser] = useState<UserProfile>(PLACEHOLDER_PROFILE);

  // Data states with localStorage persistence
  const [leads, setLeads] = useState<Lead[]>(() => readSeeds<Lead>('arckaton_leads', INITIAL_LEADS));

  const [reports, setReports] = useState<AgentReport[]>(() => readSeeds<AgentReport>('arckaton_reports', INITIAL_REPORTS));

  const [tasks, setTasks] = useState<Task[]>(() => readSeeds<Task>('arckaton_tasks', INITIAL_TASKS));

  const [messages, setMessages] = useState<ChannelMessage[]>(() => readSeeds<ChannelMessage>('arckaton_messages', INITIAL_MESSAGES));

  const [notifications, setNotifications] = useState<AppNotification[]>(() => readSeeds<AppNotification>('arckaton_notifications', INITIAL_NOTIFICATIONS));

  const [projets, setProjets] = useState<Projet[]>(() => readSeeds<Projet>('arckaton_projets', INITIAL_PROJETS));

  // Devis et factures enregistrés. Volontairement sans valeur de départ :
  // un chiffre d'affaires ne doit jamais exister sans facture derrière lui.
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  // Modals & Client Portal
  const [isClientPortalOpen, setIsClientPortalOpen] = useState(false);
  const [activeClientProjectCode, setActiveClientProjectCode] = useState<string | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [activeAgentPole, setActiveAgentPole] = useState<Pole>('Direction');
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  // Theme & Currency States
  // Le mode jour est le thème principal. Le mode sombre n'est actif que si
  // l'utilisateur l'a explicitement choisi et conservé.
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('arckaton_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [currency, setCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('arckaton_currency');
    return (saved === 'EUR' || saved === 'USD' || saved === 'XAF') ? saved : 'XAF';
  });

  // Universal CMS & Modifiable Site Config
  const [siteConfig, setSiteConfig] = useState<UniversalSiteConfig>(() => {
    const saved = localStorage.getItem('arckaton_site_config');
    return saved ? JSON.parse(saved) : DEFAULT_SITE_CONFIG;
  });

  // Forfaits editable list
  const [forfaits, setForfaits] = useState<ForfaitData[]>(() => {
    const saved = localStorage.getItem('arckaton_cms_forfaits');
    return saved ? JSON.parse(saved) : FORFAITS_DATA;
  });

  // Blog posts editable list
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => readSeeds<BlogPost>('arckaton_cms_blog_posts', INITIAL_BLOG_POSTS));
  const [activeBlogPost, setActiveBlogPost] = useState<BlogPost | null>(null);

  // Réalisations & Témoignages publics (édition CMS)
  const [realisations, setRealisations] = useState<Realisation[]>(() => readSeeds<Realisation>('arckaton_cms_realisations', INITIAL_REALISATIONS));

  const [temoignages, setTemoignages] = useState<Temoignage[]>(() => readSeeds<Temoignage>('arckaton_cms_temoignages', INITIAL_TEMOIGNAGES));

  const [contentStatus, setContentStatus] = useState<'live' | 'local' | 'saving' | 'error'>('local');

  // Nodal Command Center Data Transfers
  const [dataTransfers, setDataTransfers] = useState<DataTransferEvent[]>(() => readSeeds<DataTransferEvent>('arckaton_data_transfers', INITIAL_DATA_TRANSFERS));

  // ---- Persistance serveur du CMS ----
  // Ecrire dans localStorage ne partage rien : la modif faite par le
  // responsable du site restait invisible pour les autres membres et pour les
  // visiteurs. localStorage ne sert plus que de cache de lecture rapide ; la
  // source de verite est la table content_items, via /api/content.
  //
  // Volontairement sans refreshContent() apres l'ecriture : le state vient
  // d etre mis a jour localement, un rafraichissement le remplacerait sous
  // les doigts de l utilisateur pendant qu il tape.
  const writeContent = async (kind: string, slug: string, data: any, title?: string) => {
    setContentStatus('saving');
    try {
      const res = await fetch(`/api/content/${kind}/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...bearerHeaders() },
        body: JSON.stringify({ data, title, published: true }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({} as any));
        throw new Error(detail?.error || 'HTTP ' + res.status);
      }
      setContentStatus('live');
      return true;
    } catch (err) {
      console.warn(`Contenu ${kind}/${slug} non enregistre sur le serveur:`, err);
      setContentStatus('local');
      return false;
    }
  };

  const removeContent = async (kind: string, slug: string) => {
    setContentStatus('saving');
    try {
      const res = await fetch(`/api/content/${kind}/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
        headers: bearerHeaders(),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setContentStatus('live');
      return true;
    } catch (err) {
      console.warn(`Suppression ${kind}/${slug} non enregistree:`, err);
      setContentStatus('local');
      return false;
    }
  };

  // La config du site est une ligne unique : kind "config", slug "site".
  const saveSiteConfig = (updated: UniversalSiteConfig) => {
    localStorage.setItem('arckaton_site_config', JSON.stringify(updated));
    void writeContent('config', 'site', updated, 'Configuration du site');
  };

  const updateSiteConfig = (newConfig: Partial<UniversalSiteConfig>) => {
    setSiteConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      saveSiteConfig(updated);
      return updated;
    });
  };

  const updateHeroConfig = (hero: Partial<UniversalSiteConfig['hero']>) => {
    setSiteConfig((prev) => {
      const updated = { ...prev, hero: { ...prev.hero, ...hero } };
      saveSiteConfig(updated);
      return updated;
    });
  };

  const updateAnnouncementConfig = (announcement: Partial<UniversalSiteConfig['announcement']>) => {
    setSiteConfig((prev) => {
      const updated = { ...prev, announcement: { ...prev.announcement, ...announcement } };
      saveSiteConfig(updated);
      return updated;
    });
  };

  const updateContactConfig = (contact: Partial<UniversalSiteConfig['contact']>) => {
    setSiteConfig((prev) => {
      const updated = { ...prev, contact: { ...prev.contact, ...contact } };
      saveSiteConfig(updated);
      return updated;
    });
  };

  const updateForfait = (id: string, data: Partial<ForfaitData>) => {
    setForfaits((prev) => {
      const updated = prev.map((f) => (f.id === id ? { ...f, ...data } : f));
      localStorage.setItem('arckaton_cms_forfaits', JSON.stringify(updated));
      const cible = updated.find((f) => f.id === id);
      if (cible) void writeContent('forfait', cible.id, cible, cible.name);
      return updated;
    });
  };

  const addBlogPost = (post: Omit<BlogPost, 'id' | 'date'>) => {
    const newPost: BlogPost = {
      ...post,
      id: `post-${Date.now()}`,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
    };
    setBlogPosts((prev) => {
      const updated = [newPost, ...prev];
      localStorage.setItem('arckaton_cms_blog_posts', JSON.stringify(updated));
      void writeContent('blog', newPost.slug || newPost.id, newPost, newPost.title);
      return updated;
    });
  };

  const updateBlogPost = (id: string, post: Partial<BlogPost>) => {
    setBlogPosts((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...post } : p));
      localStorage.setItem('arckaton_cms_blog_posts', JSON.stringify(updated));
      const cible = updated.find((p) => p.id === id);
      if (cible) void writeContent('blog', cible.slug || cible.id, cible, cible.title);
      return updated;
    });
  };

  const deleteBlogPost = (id: string) => {
    setBlogPosts((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem('arckaton_cms_blog_posts', JSON.stringify(updated));
      const cible = prev.find((p) => p.id === id);
      if (cible) void removeContent('blog', cible.slug || cible.id);
      return updated;
    });
  };

  // ---- Contenu CMS (Réalisations & Témoignages) ----
  const saveRealisations = (next: Realisation[]) => {
    setRealisations(next);
    localStorage.setItem('arckaton_cms_realisations', JSON.stringify(next));
  };
  const updateRealisation = (id: string, data: Partial<Realisation>) => {
    const cible = realisations.find((r) => r.id === id);
    if (!cible) return;
    const next = { ...cible, ...data };
    saveRealisations(realisations.map((r) => (r.id === id ? next : r)));
    void writeContent('realisation', next.id, next, next.name);
  };
  const addRealisation = (data: Omit<Realisation, 'id'>) => {
    const created = { ...data, id: `real-${Date.now()}` };
    saveRealisations([created, ...realisations]);
    void writeContent('realisation', created.id, created, created.name);
  };
  const deleteRealisation = (id: string) => {
    saveRealisations(realisations.filter((r) => r.id !== id));
    void removeContent('realisation', id);
  };

  const saveTemoignages = (next: Temoignage[]) => {
    setTemoignages(next);
    localStorage.setItem('arckaton_cms_temoignages', JSON.stringify(next));
  };
  const updateTemoignage = (id: string, data: Partial<Temoignage>) => {
    const cible = temoignages.find((t) => t.id === id);
    if (!cible) return;
    const next = { ...cible, ...data };
    saveTemoignages(temoignages.map((t) => (t.id === id ? next : t)));
    void writeContent('temoignage', next.id, next, next.author);
  };
  const addTemoignage = (data: Omit<Temoignage, 'id'>) => {
    const created = { ...data, id: `tem-${Date.now()}` };
    saveTemoignages([created, ...temoignages]);
    void writeContent('temoignage', created.id, created, created.author);
  };
  const deleteTemoignage = (id: string) => {
    saveTemoignages(temoignages.filter((t) => t.id !== id));
    void removeContent('temoignage', id);
  };

  const bearerHeaders = () => {
    const t = localStorage.getItem('arckaton_os_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  // ---- Synchronisation temps réel du contenu (supabase via serveur) ----
  const refreshContent = async () => {
    try {
      // P0 — le jeton doit voyager avec la requete.
      //
      // `/api/content` sert deux publics : le site vitrine, qui ne doit voir
      // que le publie, et le back-office du CMS, qui doit voir ses propres
      // brouillons pour pouvoir les modifier. Le serveur distingue les deux
      // sur la presence d'un jeton valide ET de la permission `content`.
      //
      // Sans en-tete d'autorisation, la reponse arrivait toujours en mode
      // public : le CMS n'affichait plus que du contenu publie, et le
      // « Journal de Bord » vidait ses brouillons a chaque relecture. Pire,
      // `persistContent` appelle cette fonction juste apres avoir enregistre
      // un brouillon : celui-ci etait ecrase dans le state et dans le
      // localStorage, donc disparaissait de l'editeur.
      const res = await fetch('/api/content', { headers: bearerHeaders() });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const hasLive =
        Boolean(data.config) ||
        (Array.isArray(data.forfaits) && data.forfaits.length > 0) ||
        (Array.isArray(data.blog) && data.blog.length > 0) ||
        (Array.isArray(data.realisations) && data.realisations.length > 0);
      setContentStatus(hasLive ? 'live' : 'local');
      if (data.config && typeof data.config === 'object') {
        setSiteConfig((prev) => {
          const updated = { ...prev, ...data.config };
          localStorage.setItem('arckaton_site_config', JSON.stringify(updated));
          return updated;
        });
      }
      if (Array.isArray(data.forfaits) && data.forfaits.length > 0) {
        const updated = data.forfaits;
        localStorage.setItem('arckaton_cms_forfaits', JSON.stringify(updated));
        setForfaits(updated);
      }
      if (Array.isArray(data.blog) && data.blog.length > 0) {
        const mapped = data.blog.map((b: any) => (b.id ? b : { ...b, id: `post-${b.slug}` }));
        localStorage.setItem('arckaton_cms_blog_posts', JSON.stringify(mapped));
        setBlogPosts(mapped);
      }
      if (Array.isArray(data.realisations) && data.realisations.length > 0) {
        localStorage.setItem('arckaton_cms_realisations', JSON.stringify(data.realisations));
        setRealisations(data.realisations);
      }
      if (Array.isArray(data.temoignages) && data.temoignages.length > 0) {
        localStorage.setItem('arckaton_cms_temoignages', JSON.stringify(data.temoignages));
        setTemoignages(data.temoignages);
      }
    } catch (err) {
      console.warn('Sync contenu indisponible, seeds locales conservées:', err);
      setContentStatus('local');
    }
  };

  const persistContent = async (
    kind: string,
    slug: string,
    data: any,
    opts?: { published?: boolean; title?: string }
  ) => {
    setContentStatus('saving');
    try {
      const res = await fetch(`/api/content/${kind}/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...bearerHeaders() },
        body: JSON.stringify({ data, published: opts?.published, title: opts?.title }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      await refreshContent();
    } catch (err) {
      setContentStatus('local');
      throw err;
    }
  };

  const importSeedContent = async () => {
    const items = [
      { kind: 'config', slug: 'site', title: 'Configuration du site', data: siteConfig },
      ...forfaits.map((f) => ({ kind: 'forfait' as const, slug: f.id, title: f.name, data: f })),
      ...realisations.map((r) => ({ kind: 'realisation' as const, slug: r.id, title: r.name, data: r })),
      ...temoignages.map((t) => ({ kind: 'temoignage' as const, slug: t.id, title: t.author, data: t })),
      ...blogPosts.map((b) => ({ kind: 'blog' as const, slug: b.slug || b.id, title: b.title, data: b })),
    ];
    setContentStatus('saving');
    try {
      const res = await fetch('/api/content/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...bearerHeaders() },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      await refreshContent();
      return json.imported || items.length;
    } catch (err) {
      setContentStatus('local');
      throw err;
    }
  };

  // Polling temps réel ~45s (plan free : pas de websockets)
  useEffect(() => {
    let stopped = false;
    refreshContent();
    const id = setInterval(() => {
      if (!stopped) refreshContent();
    }, 45000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Identité des messages/actions du dashboard calquée sur la session réelle
  const { member } = useAuth();
  useEffect(() => {
    if (member) {
      setCurrentUser({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        phone: member.phone || undefined,
        poste_id: member.poste_id || undefined,
        poste_titre: member.poste_titre || undefined,
        pole: member.pole,
      });
    }
  }, [member]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Application unique et coherente du theme : les quatre classes attendues
  // par la CSS (`light`/`theme-light` et `dark`/`theme-dark`) sont posees a la
  // fois sur <html> et <body>. Auparavant deux effets differents (ici et dans
  // App.tsx) posaient des classes divergentes, ce qui laissait des fonds
  // incoherents selon le chemin de navigation.
  useEffect(() => {
    localStorage.setItem('arckaton_theme', theme);
    const isLight = theme === 'light';
    const targets = [document.documentElement, document.body];
    targets.forEach((el) => {
      el.classList.toggle('light', isLight);
      el.classList.toggle('theme-light', isLight);
      el.classList.toggle('dark', !isLight);
      el.classList.toggle('theme-dark', !isLight);
    });
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('arckaton_currency', currency);
  }, [currency]);

  // Data fetching & synchronization state
  const [isDataFetching, setIsDataFetching] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('En direct');

  const refreshDashboardData = async () => {
    setIsDataFetching(true);
    try {
      // Ces quatre routes exigent une session valide. Elles passent par
      // apiRequest pour deux raisons : le jeton expiré est renouvelé
      // automatiquement, et une 401 remonte une erreur explicite au lieu
      // d'être avalée par un .catch(() => null). Avant, un jeton périmé
      // laissait tous les tableaux vides, comme si l'entreprise n'avait
      // plus aucune donnée.
      const [leadsRes, reportsRes, projectsRes, quotesRes] = await Promise.all([
        apiRequest<any>('/api/leads').catch(() => null),
        apiRequest<any>('/api/reports').catch(() => null),
        apiRequest<any>('/api/projects').catch(() => null),
        apiRequest<any>('/api/quotes').catch(() => null),
      ]);

      // Devis et factures : le serveur fait foi, sans exception. C'est la
      // seule source du chiffre d'affaires affiche, pour ne jamais montrer
      // un montant qui ne correspond a aucune facture reelle.
      if (quotesRes && Array.isArray(quotesRes.quotes)) {
        setQuotes(quotesRes.quotes);
      }

      if (leadsRes && Array.isArray(leadsRes.leads)) {
        const serverLeads = leadsRes.leads.map(mapServerLead);
        const serverIds = new Set(serverLeads.map((l) => l.id));
        const serverRefs = new Set((leadsRes.leads as any[]).map((r) => r.client_ref));
        setLeads((prev) => [
          ...serverLeads,
          ...prev.filter((l) => !serverIds.has(l.id) && !serverRefs.has(l.id)),
        ]);
      }

      if (reportsRes && Array.isArray(reportsRes.reports)) {
        const serverReports = reportsRes.reports.map(mapServerReport);
        const serverIds = new Set(serverReports.map((r) => r.id));
        const serverRefs = new Set((reportsRes.reports as any[]).map((r) => r.client_ref));
        setReports((prev) => [
          ...serverReports,
          ...prev.filter((r) => !serverIds.has(r.id) && !serverRefs.has(r.id)),
        ]);
      }

      // Projets : le serveur fait foi. En mode données réelles, la liste
      // locale est remplacée (plus de projets de démonstration fantômes).
      if (projectsRes && Array.isArray(projectsRes.projects)) {
        const serverProjects = projectsRes.projects.map(mapServerProject);
        if (isRealDataMode()) {
          setProjets(serverProjects);
        } else {
          const serverIds = new Set(serverProjects.map((p) => p.id));
          setProjets((prev) => [...serverProjects, ...prev.filter((p) => !serverIds.has(p.id))]);
        }
      }
    } catch (err) {
      console.warn('Synchronisation dashboard échouée, données locales conservées:', err);
    } finally {
      const now = new Date();
      const formatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      setLastSyncTime(formatted);
      setIsDataFetching(false);
    }
  };

  const openClientPortal = (code?: string) => {
    if (code) {
      setActiveClientProjectCode(code);
    }
    setIsClientPortalOpen(true);
  };

  // Persistence effects (suspendus pendant une purge pour ne pas réécrire les seeds)
  useEffect(() => {
    if (purgeInProgress) return;
    localStorage.setItem('arckaton_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    if (purgeInProgress) return;
    localStorage.setItem('arckaton_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    if (purgeInProgress) return;
    localStorage.setItem('arckaton_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (purgeInProgress) return;
    localStorage.setItem('arckaton_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (purgeInProgress) return;
    localStorage.setItem('arckaton_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (purgeInProgress) return;
    localStorage.setItem('arckaton_projets', JSON.stringify(projets));
  }, [projets]);

  // ---- Persistance serveur des projets (source de vérité du portail BAT) ----
  // En mode données réelles, chaque création / modification de projet est
  // poussée vers Supabase. Le localStorage ne sert plus que de cache offline.
  const projectsSyncTimer = useRef<number | null>(null);
  const isFirstProjectsSync = useRef(true);

  useEffect(() => {
    if (purgeInProgress || !isRealDataMode()) return;
    // Le premier passage correspond à l'hydratation depuis le serveur : on ne renvoie rien.
    if (isFirstProjectsSync.current) {
      isFirstProjectsSync.current = false;
      return;
    }
    if (projectsSyncTimer.current) window.clearTimeout(projectsSyncTimer.current);
    projectsSyncTimer.current = window.setTimeout(() => {
      const token = localStorage.getItem('arckaton_os_token');
      if (!token) return; // non connecté : cache local uniquement
      for (const p of projets) {
        fetch(`/api/projects/${encodeURIComponent(p.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(p),
        }).catch(() => undefined);
      }
    }, 1500);
    return () => {
      if (projectsSyncTimer.current) window.clearTimeout(projectsSyncTimer.current);
    };
  }, [projets, isRealDataMode]);

  // ---- Nettoyage des données de démonstration (passage en données réelles) ----
  const PERSISTED_KEEP = [
    REAL_DATA_KEY,
    'arckaton_theme',
    'arckaton_currency',
    'arckaton_site_config',
    'arckaton_cms_forfaits',
    'arckaton_os_token',
    'arckaton_os_member',
  ];

  const purgeDemoData = () => {
    purgeInProgress = true;
    Object.keys(localStorage)
      .filter((k) => k.startsWith('arckaton_') && !PERSISTED_KEEP.includes(k))
      .forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(REAL_DATA_KEY, '1');
    window.location.reload();
  };

  const restoreDemoData = () => {
    localStorage.removeItem(REAL_DATA_KEY);
    ['arckaton_leads', 'arckaton_reports', 'arckaton_tasks', 'arckaton_messages', 'arckaton_notifications', 'arckaton_projets', 'arckaton_data_transfers', 'arckaton_cms_blog_posts', 'arckaton_cms_realisations', 'arckaton_cms_temoignages'].forEach(
      (k) => localStorage.removeItem(k)
    );
    window.location.reload();
  };

  // Lead Handler
  const addLead = (leadData: Omit<Lead, 'id' | 'created_at'>) => {
    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now()}`,
      created_at: 'À l\'instant',
    };

    setLeads((prev) => [newLead, ...prev]);

    // Send internal notifications
    const newNotifBoss: AppNotification = {
      id: `notif-${Date.now()}-boss`,
      title: 'Nouveau Lead Entrant !',
      message: `${newLead.name} (${newLead.project_type}) a soumis une demande. Contact : ${newLead.phone}`,
      type: 'lead',
      read: false,
      created_at: 'À l\'instant',
      link: '/leads',
      pole: 'Direction',
    };

    const newNotifPole: AppNotification = {
      id: `notif-${Date.now()}-pole`,
      title: `Attribution Pôle ${newLead.pole_assigned}`,
      message: `Nouveau dossier assigné : ${newLead.project_type} pour ${newLead.name}.`,
      type: 'lead',
      read: false,
      created_at: 'À l\'instant',
      link: '/leads',
      pole: newLead.pole_assigned,
    };

    setNotifications((prev) => [newNotifBoss, newNotifPole, ...prev]);

    // Construct WhatsApp pre-filled link
    const waText = encodeURIComponent(
      `Bonjour l'équipe Arckaton ! Je suis ${newLead.name}. J'ai configuré mon projet sur votre site : ${newLead.project_type}. Mon numéro WhatsApp est le ${newLead.phone}. Pouvons-nous échanger ?`
    );
    const whatsappLink = `https://wa.me/237681462982?text=${waText}`;

    // Persistance durable : envoi au serveur Express (-> Supabase si configuré)
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newLead.name,
        email: newLead.email || '',
        phone: newLead.phone,
        project_type: newLead.project_type,
        budget: newLead.budget,
        message: newLead.message,
        source: newLead.source,
        statut: newLead.statut,
        pole_assigned: newLead.pole_assigned,
        country: newLead.country,
        client_ref: newLead.id,
        to_numbers: recipientPhonesForPole(newLead.pole_assigned),
      }),
    }).catch(() => {});

    return { lead: newLead, whatsappLink };
  };

  const updateLeadStatus = (id: string, statut: Lead['statut']) => {
    const avant = leads;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, statut } : l)));
    // Sans enregistrement serveur, le statut choisi disparaissait au
    // rechargement et un lead deja converti pouvait l'etre a nouveau.
    if (isRealDataMode()) {
      apiRequest(`/api/leads/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ statut }),
      }).catch((err) => {
        console.error('Statut de lead non enregistre, retour a l\'etat precedent:', err);
        setLeads(avant);
      });
    }
  };

  const updateLeadNotes = (id: string, notes: string) => {
    const avant = leads;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, notes } : l)));
    if (isRealDataMode()) {
      apiRequest(`/api/leads/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      }).catch((err) => {
        console.error('Notes de lead non enregistrees, retour a l\'etat precedent:', err);
        setLeads(avant);
      });
    }
  };

  // Convert Lead to Project + Quote (as required by section 3.5 & 4)
  const convertLeadToProject = (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) {
      throw new Error('Lead introuvable');
    }

    // Mapping project_type -> pole
    let pole: Pole = lead.pole_assigned || 'Direction';
    const pt = lead.project_type.toLowerCase();
    if (pt.includes('e-commerce') || pt.includes('arka')) pole = 'Tech';
    else if (pt.includes('logo') || pt.includes('identité')) pole = 'Creatif';
    else if (pt.includes('vitrine') || pt.includes('seo') || pt.includes('marketing')) pole = 'Digital';
    else if (pt.includes('terrain') || pt.includes('compte')) pole = 'Client';

    const clientCode = `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;

    // Le chef de projet et les affectations utilisent l'équipe réellement
    // enregistrée. Aucune personne fictive n'est inventée : tant qu'un pôle
    // n'a pas de membre, la tâche est créée sans responsable.
    const auteurReel =
      memberDirectory.current.find((m) => m.name === currentUser?.name) ||
      memberDirectory.current.find((m) => m.pole === 'Direction') ||
      memberDirectory.current[0];
    const nomAuteur = auteurReel?.name || 'À définir';
    const posteAuteur = auteurReel?.poste_titre || undefined;
    const membreDuPole = (p: Pole) => memberDirectory.current.find((m) => m.pole === p);
    // La première sortie terrain est confiée au pôle créatif s'il a un
    // membre enregistré ; sinon elle reste « à définir » plutôt que
    // d'inventer un intervenant.
    const intervenantTerrain = membreDuPole('Creatif')?.name || 'À définir';

    const newProject: Projet = {
      id: `prj-${Date.now()}`,
      client_code: clientCode,
      name: `Déploiement ${lead.project_type}`,
      client_name: lead.name,
      client_phone: lead.phone,
      client_email: lead.email,
      service: lead.project_type,
      forfait: lead.budget || 'À définir',
      pole,
      budget_estime: lead.budget || 'À définir',
      deadline: 'Sous 4 semaines',
      deliverables: ['Cadrage & Charte', 'Intégration Web & Mobile Money', 'Formation 2h', 'Support garanti'],
      score: 60,
      progression: 20,
      chef_de_projet: nomAuteur,
      sorties_terrain_total: pt.includes('architecture') ? 9 : 6,
      sorties_terrain_effectuees: 0,
      statut: 'en_cours',
      notes_internes: `Projet issu du lead #${lead.id}. Téléphone client : ${lead.phone}. Message d'origine : "${lead.message.slice(0, 120)}..."`,
      jalons: [
        { id: `j-${Date.now()}-1`, titre: 'Cadrage stratégique & Rédaction du cahier des charges', statut: 'en_cours', echeance: 'Sous 5 jours', description: 'Alignement sur les objectifs business et validation' },
        { id: `j-${Date.now()}-2`, titre: 'Conception des maquettes UX/UI Figma & Charte visuelle', statut: 'en_attente', echeance: 'Sous 12 jours', description: 'Design mobile-first à soumettre pour validation BAT' },
        { id: `j-${Date.now()}-3`, titre: 'Intégration technique & Configuration Mobile Money MTN/Orange', statut: 'en_attente', echeance: 'Sous 20 jours', description: 'Développement du système et tests d\'encaissement' },
        { id: `j-${Date.now()}-4`, titre: 'Formation des équipes (2h), Recette finale & Mise en ligne', statut: 'en_attente', echeance: 'Sous 28 jours', description: 'Déploiement sur domaine officiel et livraison finale' },
      ],
      sorties_terrain: [
        { id: `st-${Date.now()}-1`, numero: 1, date: 'À planifier sous 7j', lieu: lead.country || 'Yaoundé', objectif: 'Prise de vue initiale et interview du dirigeant', intervenant: intervenantTerrain, statut: 'planifiee' }
      ],
      feedbacks: [
        { id: `fb-${Date.now()}`, auteur: 'Système Arckaton', role: 'agence', message: `Bienvenue ! Le projet ${clientCode} a été initialisé avec succès. Votre Chef de Projet dédié est ${nomAuteur}.`, type: 'validation', date: 'Aujourd\'hui' }
      ],
      created_at: 'Aujourd\'hui',
    };

    setProjets((prev) => [newProject, ...prev]);

    // Automatically seed actionable tasks in Kanban for the team.
    // Elles sont assignées à un membre réel du pôle concerné ; si le pôle
    // n'a encore personne, la tâche reste « à affecter ».
    const direction = membreDuPole('Direction') || auteurReel;
    const creatif = membreDuPole('Creatif');
    const tech = membreDuPole('Tech');
    const assignation = (m?: { id: string; name: string; poste_titre?: string | null }) => ({
      assignee_name: m?.name,
      assignee_id: m?.id,
      poste_titre: m?.poste_titre || undefined,
    });

    const initialTasks: Task[] = [
      {
        id: `task-${Date.now()}-1`,
        titre: `[${clientCode}] Cadrage & Devis définitif pour ${lead.name}`,
        description: `Organiser l'appel de cadrage avec ${lead.name} (${lead.phone}) pour valider les spécifications techniques.`,
        statut: 'en_cours',
        priorite: 'urgente',
        pole: 'Direction',
        project_id: newProject.id,
        project_name: newProject.client_name,
        ...assignation(direction),
        date_echeance: 'Sous 3 jours',
        created_at: 'Aujourd\'hui',
      },
      {
        id: `task-${Date.now()}-2`,
        titre: `[${clientCode}] Maquettes UX/UI pour ${lead.name}`,
        description: `Créer les maquettes Figma mobile-first pour le service "${lead.project_type}".`,
        statut: 'a_faire',
        priorite: 'haute',
        pole: 'Creatif',
        project_id: newProject.id,
        project_name: newProject.client_name,
        ...assignation(creatif),
        date_echeance: 'Sous 10 jours',
        created_at: 'Aujourd\'hui',
      },
      {
        id: `task-${Date.now()}-3`,
        titre: `[${clientCode}] Architecture technique & Webhook MoMo`,
        description: `Préparer le socle applicatif et la configuration des endpoints Mobile Money MTN / Orange.`,
        statut: 'a_faire',
        priorite: 'haute',
        pole: 'Tech',
        project_id: newProject.id,
        project_name: newProject.client_name,
        ...assignation(tech),
        date_echeance: 'Sous 15 jours',
        created_at: 'Aujourd\'hui',
      }
    ];

    // Persistance via le canal normal des taches (POST /api/tasks). Avant,
    // `setTasks` n'ecrivait qu'en local : les 3 taches de cadrage
    // disparaissaient des que l'agent rechargeait la page ou changeait de
    // poste. `addTask` gere l'enregistrement serveur et le suivi d'activite.
    initialTasks.forEach((t) => addTask(t));

    // Update lead status to converted
    const notesConverti = (lead.notes ? lead.notes + ' | ' : '') + `Converti en projet ${clientCode}`;
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, statut: 'converti' as const, notes: notesConverti } : l))
    );

    // Le projet et le nouveau statut du lead sont pousses vers le serveur.
    if (isRealDataMode()) {
      apiRequest('/api/projects', { method: 'POST', body: JSON.stringify(newProject) })
        .catch((err) => console.error('Projet non enregistre cote serveur:', err));
      apiRequest(`/api/leads/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ statut: 'converti', notes: notesConverti }),
      }).catch((err) => console.error('Statut de lead non enregistre:', err));
    }

    // Notification
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'Projet Qualifié Créé !',
      message: `Le lead ${lead.name} a été converti en projet ${newProject.name} (Code: ${clientCode}). 3 tâches Kanban ont été automatiquement assignées.`,
      type: 'system',
      read: false,
      created_at: 'À l\'instant',
      pole,
    };
    setNotifications((prev) => [notif, ...prev]);

    return { 
      projet: newProject, 
      message: `Lead converti avec succès en projet ${newProject.name} (Réf : ${clientCode}) ! 3 tâches Kanban ont été générées pour l'équipe.` 
    };
  };

  // Project Management Actions
  const createProject = (projectData: Omit<Projet, 'id' | 'created_at'>) => {
    const ref = `prj-${Date.now()}`;
    const newProject: Projet = {
      ...projectData,
      id: ref,
      client_code: projectData.client_code || `PRJ-${ref.replace(/^prj-/, '')}`,
      created_at: new Date().toISOString(),
    };
    setProjets((prev) => [newProject, ...prev]);

    // Création immédiate côté serveur : le portail BAT doit voir le projet
    // même si l'agent se déconnecte juste après.
    if (isRealDataMode()) {
      const token = localStorage.getItem('arckaton_os_token');
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(newProject),
      }).catch(() => undefined);
    }

    logExchange(
      { name: newProject.chef_de_projet || 'Chef de Projet', pole: newProject.pole },
      'specs_tech',
      `Ouverture du projet ${newProject.client_name} (${newProject.client_code}) — ${newProject.service}`
    );
    return newProject;
  };

  // Synchronise les champs de production (jalons, avancement, retours client,
  // sorties terrain) vers le serveur. Avant, ces mutations n'existaient qu'en
  // local : une validation BAT disparaissait au rechargement et le portail
  // client, qui lit le serveur, ne voyait jamais rien. L'appel est ignore
  // sans session (portail public) pour ne pas partir en 401 inutile.
  const persistProjectPatch = (ref: string, patch: Record<string, unknown>) => {
    if (!localStorage.getItem('arckaton_os_token')) return;
    apiRequest(`/api/projects/${encodeURIComponent(ref)}`, { method: 'PATCH', body: patch })
      .catch((err) => console.warn('Projet non synchronisé côté serveur:', err));
  };

  const progressionDepuisJalons = (jalons: ProjectMilestone[]): number => {
    const validCount = jalons.filter((m) => m.statut === 'valide').length;
    return Math.round((validCount / Math.max(1, jalons.length)) * 100);
  };

  const updateProjectProgression = (id: string, progression: number) => {
    const borne = Math.min(100, Math.max(0, progression));
    setProjets((prev) => prev.map((p) => (p.id === id ? { ...p, progression: borne } : p)));
    persistProjectPatch(id, { progression: borne });
  };

  const updateProjectMilestone = (projectId: string, milestoneId: string, status: ProjectMilestone['statut']) => {
    const proj = projets.find((p) => p.id === projectId);
    if (!proj) return;
    const updated = (proj.jalons || []).map((m) => (m.id === milestoneId ? { ...m, statut: status } : m));
    const newProgression = progressionDepuisJalons(updated);
    setProjets((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, jalons: updated, progression: newProgression } : p))
    );
    persistProjectPatch(projectId, { jalons: updated, progression: newProgression });
  };

  const addProjectMilestone = (projectId: string, milestone: Omit<ProjectMilestone, 'id'>) => {
    const proj = projets.find((p) => p.id === projectId);
    if (!proj) return;
    const newM: ProjectMilestone = {
      ...milestone,
      id: `j-${Date.now()}`,
    };
    // Ajouter un jalon recalcule l'avancement, comme la mise a jour d'un
    // statut : sinon le pourcentage restait fige et le nouveau livrable
    // « en attente » n'etait pas compte dans la feuille de route.
    const updated = [...(proj.jalons || []), newM];
    const newProgression = progressionDepuisJalons(updated);
    setProjets((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, jalons: updated, progression: newProgression } : p))
    );
    persistProjectPatch(projectId, { jalons: updated, progression: newProgression });
  };

  const addProjectFeedback = (projectId: string, feedback: Omit<ClientFeedback, 'id' | 'date'>) => {
    const proj = projets.find((p) => p.id === projectId);
    if (!proj) return;
    const newFb: ClientFeedback = {
      ...feedback,
      id: `fb-${Date.now()}`,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };

    const feedbacks = [...(proj.feedbacks || []), newFb];
    setProjets((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, feedbacks } : p))
    );
    persistProjectPatch(projectId, { feedbacks });

    // If submitted by client, send high priority notification to team!
    if (feedback.role === 'client') {
      const notif: AppNotification = {
        id: `notif-fb-${Date.now()}`,
        title: `Retour Client Reçu (${feedback.type === 'validation' ? 'BAT Validé ✅' : 'Ajustement Demandé ⚠️'})`,
        message: `${feedback.auteur} : "${feedback.message.slice(0, 90)}..."`,
        type: 'message',
        read: false,
        created_at: 'À l\'instant',
        pole: 'Client',
        link: '/projects',
      };
      setNotifications((prev) => [notif, ...prev]);
    }
  };

  const addProjectFieldVisit = (projectId: string, visit: Omit<FieldVisit, 'id'>) => {
    const proj = projets.find((p) => p.id === projectId);
    if (!proj) return;
    const newV: FieldVisit = {
      ...visit,
      id: `v-${Date.now()}`,
    };
    const visits = [...(proj.sorties_terrain || []), newV];
    const effectuees = visits.filter((v) => v.statut === 'effectuee' || v.statut === 'livree').length;
    setProjets((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, sorties_terrain: visits, sorties_terrain_effectuees: effectuees } : p))
    );
    persistProjectPatch(projectId, { sorties_terrain: visits, sorties_terrain_effectuees: effectuees });
  };

  // Avancement d'une sortie terrain : planifiee -> effectuee -> en_montage -> livree
  const updateProjectFieldVisit = (
    projectId: string,
    visitId: string,
    patch: Partial<FieldVisit>
  ) => {
    const proj = projets.find((p) => p.id === projectId);
    if (!proj) return;
    const cible = (proj.sorties_terrain || []).find((v) => v.id === visitId);
    const visits = (proj.sorties_terrain || []).map((v) => (v.id === visitId ? { ...v, ...patch } : v));
    const effectuees = visits.filter((v) => v.statut === 'effectuee' || v.statut === 'en_montage' || v.statut === 'livree').length;

    setProjets((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, sorties_terrain: visits, sorties_terrain_effectuees: effectuees } : p))
    );
    persistProjectPatch(projectId, { sorties_terrain: visits, sorties_terrain_effectuees: effectuees });

    if (patch.statut) {
      const labels: Record<string, string> = {
        effectuee: 'Sortie terrain réalisée',
        en_montage: 'Reportage en montage',
        livree: 'Livraison des médias au client',
      };
      logExchange(
        { name: 'Terrain', pole: 'Client' },
        'ordre_terrain',
        `${labels[patch.statut] || 'Sortie terrain mise à jour'} : « ${cible?.objectif || ''} »${proj.client_name ? ` - projet ${proj.client_name}` : ''}`
      );
    }
  };

  const updateProjectNotes = (projectId: string, notes_internes: string) => {
    setProjets((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, notes_internes } : p))
    );
  };

  // AI Report Handler
  const addReport = (reportData: Omit<AgentReport, 'id' | 'created_at'>) => {
    const newRep: AgentReport = {
      ...reportData,
      id: `rep-${Date.now()}`,
      created_at: 'À l\'instant',
    };
    setReports((prev) => [newRep, ...prev]);

    // Persistance durable du rapport IA
    fetch('/api/ai/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: newRep.client_name,
        leadName: newRep.lead_name,
        pole: newRep.pole,
        contactInfo: newRep.contact_info || '',
        client_ref: newRep.id,
        summary: newRep.summary || newRep.resume || '',
        recommendations: newRep.recommendations || [],
        intention: newRep.intention || 'information',
        to_numbers: recipientPhonesForPole(newRep.pole),
      }),
    }).catch(() => {});

    // Create notification in dashboard
    const notif: AppNotification = {
      id: `notif-rep-${Date.now()}`,
      title: `Rapport IA Reçu (${newRep.intention.toUpperCase()})`,
      message: `${newRep.client_name} a échangé avec l'agent du site. Assigné au pôle ${newRep.pole}.`,
      type: 'system',
      read: false,
      created_at: 'À l\'instant',
      pole: newRep.pole,
      link: '/reports',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const updateReportStatus = (id: string, status: AgentReport['status']) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  // ---- Journal automatique des échanges (fil d'activité) ----
  // Chaque action impliquant 2 personnes (tâche, message, jalon, retour client)
  // crée une entrée de flux consultable par la direction. Plus de bouton "injecter".
  const [osMembers, setOsMembers] = useState<Array<{ id: string; name: string; role: string; pole: Pole; poste_titre?: string | null; email?: string; phone?: string }>>([]);

  // Recharge l'annuaire réel. Appelé après chaque ajout, modification ou
  // suppression de membre pour que les listes de sélection (Kanban, projets,
  // messagerie) reflètent immédiatement l'équipe réelle.
  const refreshOsMembers = useCallback(async () => {
    const t = localStorage.getItem('arckaton_os_token');
    if (!t) return;
    try {
      const res = await fetch('/api/members/directory', { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) return;
      const json = await res.json();
      const list = Array.isArray(json.members) ? json.members : [];
      memberDirectory.current = list.map((m: any) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        pole: m.pole,
        poste_titre: m.poste_titre,
      }));
      setOsMembers(
        list.map((m: any) => ({
          id: m.id,
          name: m.name,
          role: m.role,
          pole: m.pole,
          poste_titre: m.poste_titre,
          email: m.email,
          phone: m.phone,
        }))
      );
    } catch {
      /* annuaire indisponible : les flux restent créés avec le nom de l'auteur */
    }
  }, []);

  useEffect(() => {
    refreshOsMembers();
  }, [refreshOsMembers]);

  // Cree une entree de flux a partir de l'auteur reel et d'un destinataire
  const logExchange = (
    toMember: { id?: string; name: string; role?: string; pole?: Pole } | undefined,
    dataType: DataTransferEvent['data_type'],
    summary: string
  ): DataTransferEvent | null => {
    if (purgeInProgress) return null;
    const author = currentUser;
    // Pas de fil si l'auteur se renvoie a lui-meme
    if (toMember && toMember.id && toMember.id === author.id) return null;

    const target = toMember || {
      id: undefined,
      name: 'Direction',
      role: 'Direction',
      pole: author.pole,
    };

    const base = {
      id: `dt-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      from_member_id: author.id,
      from_member_name: author.name,
      from_role: author.poste_titre || author.role,
      to_member_id: target.id || 'direction',
      to_member_name: target.name,
      to_role: target.role || 'Membre',
      pole: target.pole || author.pole,
      data_type: dataType,
      payload_summary: summary,
      timestamp: new Date().toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      status: 'livre' as const,
      clearance_level: 'ALPHA-1' as const,
      hash: '',
    };

    const entry: DataTransferEvent = { ...base };

    const enregistrer = (flux: DataTransferEvent) => {
      setDataTransfers((prev) => {
        const dejaLa = prev.some((f) => f.id === flux.id);
        const suivant = dejaLa ? prev.map((f) => (f.id === flux.id ? flux : f)) : [flux, ...prev];
        const plafonne = suivant.slice(0, 60);
        localStorage.setItem('arckaton_data_transfers', JSON.stringify(plafonne));
        return plafonne;
      });
    };

    enregistrer(entry);

    // L'empreinte est calculée pour de vrai, puis réinjectée dans le flux.
    void sha256Hex(
      [base.from_member_id, base.to_member_id, base.data_type, base.payload_summary, base.timestamp].join('|')
    ).then((empreinte) => {
      enregistrer({ ...entry, hash: empreinte ? `sha256:${empreinte.slice(0, 16)}` : 'indisponible' });
    });

    return entry;
  };

  const findMemberByName = (name: string) =>
    memberDirectory.current.find((m) => m.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]));

  // ── Tâches et messagerie : partagées via l'API ────────────────
  // Ces deux listes vivaient uniquement dans le localStorage : une tâche
  // créée par un membre n'existait que dans son navigateur, le directeur
  // trouvait un tableau vide sur son téléphone. Le serveur est désormais la
  // source de vérité, le localStorage ne sert plus que de cache hors ligne.
  //
  // On applique d'abord l'état localement pour que l'interface reste
  // instantanée, puis on renvoie au serveur. En cas d'échec on restaure
  // l'état précédent : l'interface ne peut pas montrer une tâche que
  // personne d'autre ne verra.
  const [colisTaches, setColisTaches] = useState<Task[]>([]);
  const [colisMessages, setColisMessages] = useState<ChannelMessage[]>([]);
  // Canal par defaut : MUST etre l'identifiant de l'interface (c-general).
  // Avec "general", le serveur repondait 400 a chaque chargement de page
  // connectee, avant que la messagerie ne signale le canal qu elle affiche.
  const [activeChannel, setActiveChannel] = useState<string>('c-general');

  // Notification interne, sans passer par les appelants qui construisent
  // eux-mêmes l'objet complet.
  const pushNotification = (n: Omit<AppNotification, 'id' | 'read'>) => {
    setNotifications((prev) => [{ ...n, id: `notif-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, read: false }, ...prev]);
  };

  const refreshTasks = useCallback(async () => {
    try {
      const data = await apiRequest<Task[]>('/api/tasks');
      const taches = (data || []).map((t) => normaliserTache(t as TacheServeur));
      setTasks(taches);
      setColisTaches(taches);
    } catch (err) {
      // Hors ligne : on garde le cache et on ne casse pas l'écran.
      console.warn('Tâches non rafraîchies, cache local conservé:', err);
    }
  }, []);

  const refreshMessages = useCallback(async (canal: string) => {
    try {
      const data = await apiRequest<ChannelMessage[]>(`/api/messages?canal=${encodeURIComponent(canal)}`);
      setColisMessages(data || []);
      setMessages(data || []);
    } catch (err) {
      console.warn('Messages non rafraîchis, cache local conservé:', err);
    }
  }, []);

  // Retirer un message envoye par erreur. Le serveur refuse si l auteur
  // n est pas le membre connecte et n est pas de la direction ; on retire
  // donc localement d abord, et on restaure si le serveur dit non.
  const deleteMessage = useCallback(async (id: string) => {
    const avant = messages;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setColisMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      await apiRequest(`/api/messages/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (err) {
      setMessages(avant);
      setColisMessages((prev) => [avant.find((m) => m.id === id) as ChannelMessage, ...prev].filter(Boolean));
      pushNotification({
        title: 'Message non supprimé',
        message: 'Le serveur a refusé la suppression. Ce message ne vous appartient pas.',
        type: 'message',
        created_at: new Date().toISOString(),
      });
    }
  }, [messages]);

  // Rafraîchissement périodique : c'est ce qui fait qu'une tâche posée par
  // un membre apparaît chez les autres sans recharger la page.
  useEffect(() => {
    if (!member) return;
    refreshTasks();
    const minuteur = setInterval(refreshTasks, 30_000);
    return () => clearInterval(minuteur);
  }, [member, refreshTasks]);

  useEffect(() => {
    if (!member || !activeChannel) return;
    // On rafraichit aussi au retour sur l'onglet : un membre qui revient
    // sur l'OS apres plusieurs minutes voyait sinon l'etat d'il y a 20 s
    // au mieux, et devait recharger la page pour lire les messages recus.
    const rafraichir = () => {
      if (document.visibilityState === 'visible') refreshMessages(activeChannel);
    };
    refreshMessages(activeChannel);
    const minuteur = setInterval(rafraichir, 20_000);
    window.addEventListener('focus', rafraichir);
    document.addEventListener('visibilitychange', rafraichir);
    return () => {
      clearInterval(minuteur);
      window.removeEventListener('focus', rafraichir);
      document.removeEventListener('visibilitychange', rafraichir);
    };
  }, [member, activeChannel, refreshMessages]);

  // Task Handler
  const addTask = (taskData: Omit<Task, 'id' | 'created_at'>) => {
    // Une tache creee est toujours "a faire" et le doit etre dans les deux
    // champs, sinon elle n'apparait dans aucune colonne du Kanban.
    const initialStatus: TaskStatus = taskData.status || taskData.statut || 'a_faire';
    // Priorite et echeance existent en double (FR/EN) dans l'interface : on
    // lit les deux ecritures et on les renseigne toutes les deux. Sans cela,
    // une tache issue de la conversion d'un lead (qui fournit
    // `priorite`/`date_echeance`) partait au serveur sans urgence ni deadline.
    const priorite: TaskPriority = taskData.priority || taskData.priorite || 'normale';
    const echeance = taskData.due_date || taskData.date_echeance || '';
    const newTask: Task = {
      ...taskData,
      statut: initialStatus,
      status: initialStatus,
      priorite,
      priority: priorite,
      date_echeance: echeance,
      due_date: echeance,
      // Suffixe aleatoire : plusieurs taches creees dans la meme
      // milliseconde (conversion d'un lead) doivent avoir des identifiants
      // distincts, sinon elles se confondent au retour du serveur.
      id: `t-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      created_at: 'Aujourd\'hui',
      relances: 0,
    };
    setTasks((prev) => [newTask, ...prev]);

    // Envoi au serveur. En cas d'échec, la tâche locale est retirée :
    // une tâche que personne d'autre ne voit vaut mieux pas exister.
    apiRequest<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        titre: taskData.title || taskData.titre,
        description: taskData.description || '',
        statut: initialStatus,
        priorite,
        pole: taskData.pole || currentUser.pole,
        assigne_nom: taskData.assigned_to || taskData.assignee_name || null,
        echeance,
      }),
    })
      .then((server) => {
        const normalisee = normaliserTache(server as TacheServeur);
        setTasks((prev) => prev.map((t) => (t.id === newTask.id ? { ...t, ...normalisee } : t)));
      })
      .catch((err) => {
        console.error('Création de tâche refusée par le serveur:', err);
        setTasks((prev) => prev.filter((t) => t.id !== newTask.id));
        pushNotification({
          title: 'Tâche non enregistrée',
          message: 'Le serveur a refusé la création. Vérifiez votre connexion.',
          type: 'task',
          created_at: new Date().toISOString(),
        });
      });

    // Fil automatique : la tâche est transmise au membre assigné, rattachée au projet
    const assigneeName = taskData.assigned_to || taskData.assignee_name;
    const project = taskData.project_id ? projets.find((p) => p.id === taskData.project_id) : undefined;
    if (assigneeName) {
      const target = findMemberByName(assigneeName);
      logExchange(
        target ? { id: target.id, name: target.name, role: target.poste_titre || target.role, pole: target.pole } : { name: assigneeName },
        'specs_tech',
        `Tâche transmise : « ${taskData.title || taskData.titre} » → ${assigneeName}${project ? ` (projet ${project.client_name})` : ''}`
      );
    }
  };

  const updateTaskStatus = (id: string, status: TaskStatus) => {
    const avant = tasks;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          // `statut` et `status` coexistent dans l'UI historique (filtres, cartes,
          // Kanban) : on ecrit les deux sinon l'interface ne se met pas a jour.
          ? {
              ...t,
              statut: status,
              status,
              completed_at: status === 'termine' ? new Date().toISOString() : t.completed_at,
            }
          : t
      )
    );
    apiRequest(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ statut: status }) })
      .then((server) => {
        const normalisee = normaliserTache(server as TacheServeur);
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...normalisee } : t)));
      })
      .catch((err) => {
        console.error('Changement de statut refusé, retour à l\'état précédent:', err);
        setTasks(avant);
        pushNotification({
          title: 'Statut non enregistré',
          message: 'Le serveur a refusé la modification.',
          type: 'task',
          created_at: new Date().toISOString(),
        });
      });
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const label = task.title || task.titre || 'tâche';
    if (status === 'termine') {
      logExchange(
        undefined,
        'rapport_perf',
        `Tâche achevée : « ${label} »${task.project_name ? ` — projet ${task.project_name}` : ''}`
      );
    } else if (status === 'en_cours') {
      logExchange(undefined, 'ordre_terrain', `Prise en charge : « ${label} »${task.assignee_name ? ` par ${task.assignee_name}` : ''}`);
    }
  };

  // Relance d'une tâche en retard (notification + fil d'activité)
  const remindTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const label = task.title || task.titre || 'tâche';
    // Le compteur de relances est incrémenté par le serveur, sinon deux
    // navigateurs repartent de la même valeur et le total est faux.
    apiRequest(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ relancer: true }) })
      .then((server) => {
        const normalisee = normaliserTache(server as TacheServeur);
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...normalisee } : t)));
      })
      .catch((err) => console.error('Relance refusée par le serveur:', err));
    setNotifications((prev) => [
      {
        id: `notif-relance-${Date.now()}`,
        title: `Relance envoyée — ${label}`,
        message: `${task.assignee_name || 'Le membre assigné'} a été relancé${task.project_name ? ` pour le projet ${task.project_name}` : ''}.`,
        type: 'task',
        read: false,
        created_at: 'À l\'instant',
        pole: task.pole,
        link: '/tasks',
      },
      ...prev,
    ]);
    logExchange(undefined, 'securite', `Relance n°${(task.relances || 0) + 1} : « ${label} » → ${task.assignee_name || 'membre assigné'}`);
  };

  // Message Handler
  const sendMessage = (channelId: string, content: string) => {
    sendMessageAs(
      { id: currentUser.id, name: currentUser.name, role: currentUser.poste_titre || 'Membre Agence', pole: currentUser.pole },
      channelId,
      content
    );
  };

  // Envoi au nom d'un membre (simulation multi-membres / relais de pôles)
  const sendMessageAs = (
    author: { id?: string; name: string; role?: string; pole?: Pole },
    channelId: string,
    content: string
  ) => {
    const now = new Date();
    const newMsg: ChannelMessage = {
      id: `m-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      channel_id: channelId,
      sender_name: author.name,
      sender_role: author.role || 'Membre Agence',
      pole: author.pole || currentUser.pole,
      content,
      created_at: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);

    // Le message part au serveur, sinon il ne reste que dans ce navigateur.
    // `simule` marque les scénarios de démonstration pour les distinguer
    // d'un vrai message d'équipe.
    const estSimulation = author.id !== currentUser.id;
    apiRequest<ChannelMessage>('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        canal: channelId,
        contenu: content,
        simule: estSimulation,
      }),
    })
      .then((server) => setMessages((prev) => prev.map((m) => (m.id === newMsg.id ? { ...m, ...server } : m))))
      .catch((err) => {
        console.error('Message non envoyé au serveur, retrait local:', err);
        setMessages((prev) => prev.filter((m) => m.id !== newMsg.id));
      });

    // Fil automatique : tout échange de message est tracé
    logExchange(
      author.id ? { id: author.id, name: author.name, role: author.role, pole: author.pole } : { name: 'Direction' },
      'securite',
      `Message (${channelId}) — ${author.name} : « ${content.slice(0, 120)}${content.length > 120 ? '…' : ''} »`
    );
  };

  // Simulation d'un échange entre plusieurs membres (test du flux inter-pôles)
  const simulateExchange = (
    participants: Array<{ id?: string; name: string; role?: string; pole?: Pole }>,
    channelId: string,
    steps: string[]
  ) => {
    if (participants.length < 2 || steps.length === 0) return 0;
    let sent = 0;
    steps.forEach((text, i) => {
      const author = participants[i % participants.length];
      setTimeout(() => {
        sendMessageAs(author, channelId, text);
        sent++;
      }, i * 350);
    });
    return steps.length;
  };

  // Notification Handler
  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const addAgentReport = (reportData: Partial<AgentReport>) => {
    const newRep: AgentReport = {
      id: reportData.id || `rep-${Date.now()}`,
      title: reportData.title || 'Rapport Stratégique IA',
      client_name: reportData.client_name || reportData.lead_name || 'Prospect Qualifié',
      lead_name: reportData.lead_name || reportData.client_name || 'Prospect Qualifié',
      sujet: reportData.sujet || 'Audit & Recommandation',
      pole: reportData.pole || 'Direction',
      resume: reportData.resume || reportData.summary || '',
      summary: reportData.summary || reportData.resume || '',
      recommendations: reportData.recommendations || [],
      forfait_recommande: reportData.forfait_recommande || 'Synergie (750k FCFA)',
      intention: reportData.intention || 'devis',
      contact_info: reportData.contact_info || '',
      created_at: new Date().toISOString(),
      status: reportData.status || 'non_traite',
      messages_count: reportData.messages_count || 1
    };
    setReports((prev) => [newRep, ...prev]);

    fetch('/api/ai/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: newRep.client_name,
        leadName: newRep.lead_name,
        pole: newRep.pole,
        contactInfo: newRep.contact_info || '',
        client_ref: newRep.id,
        summary: newRep.summary || newRep.resume || '',
        recommendations: newRep.recommendations || [],
        intention: newRep.intention || 'information',
        to_numbers: recipientPhonesForPole(newRep.pole),
      }),
    }).catch(() => {});
  };

  const openAgentWithPole = (pole: Pole) => {
    setActiveAgentPole(pole);
    setIsAgentModalOpen(true);
  };

  // ── Cloisonnement par pôle ────────────────────────────────────────────
  // La direction voit tout. Tout autre membre, y compris s'il peut éditer
  // le site, ne voit que son pôle. Le filtrage est appliqué ici, à la
  // source, et non dans chaque onglet : un nouvel écran ne peut pas
  // l'oublier par inadvertance.
  const isDirection = member?.role === 'admin';
  const scopePole: Pole | null = isDirection ? null : member?.pole || null;

  const scopeByPole = <T extends { pole: Pole }>(rows: T[]): T[] =>
    scopePole ? rows.filter((r) => r.pole === scopePole) : rows;

  const scopedProjets = scopeByPole(projets);
  const scopedTasks = scopeByPole(tasks);
  // La messagerie se scope sur le CANAL, pas sur le pole de l expediteur.
  // Filtre par expediteur, le message ecrit par Tech disparaissait du canal
  // vu par le Creatif, alors que le scenario prevu par l OS est justement
  // "Tech transmet la maquette au Creatif puis au Client".
  const scopedMessages = scopePole
    ? messages.filter((m) => m.channel_id === scopePole)
    : messages;
  // Les leads sont rangés par `pole_assigned` et non `pole`.
  const scopedLeads = scopePole ? leads.filter((l) => l.pole_assigned === scopePole) : leads;
  const scopedReports = scopePole ? reports.filter((r) => !r.pole || r.pole === scopePole) : reports;
  const scopedNotifications = scopePole
    ? notifications.filter((n) => !n.pole || n.pole === scopePole)
    : notifications;

  // ── Chiffre d'affaires ───────────────────────────────────────────────
  // Somme des factures réellement enregistrées. Un devis n'est pas une
  // facture : il n'entre pas dans le total. Tant qu'aucune facture n'existe,
  // le résultat vaut 0 — jamais un montant de démonstration.
  //
  // Un brouillon n'est pas encore une dette et une facture refusée ne doit
  // jamais être comptée : les deux sont exclus. Sans cette exclusion, un
  // devis en préparation gonflait le chiffre d'affaires affiché.
  const chiffreAffairesReel = useMemo(
    () =>
      quotes
        .filter(
          (q) =>
            q.type === 'facture' &&
            q.status !== 'brouillon' &&
            q.status !== 'refuse'
        )
        .reduce((sum, q) => sum + (Number(q.total) || 0), 0),
    [quotes]
  );

  const refreshQuotes = useCallback(async () => {
    const authToken = localStorage.getItem('arckaton_os_token');
    if (!authToken) return;
    try {
      const res = await fetch('/api/quotes', { headers: { Authorization: `Bearer ${authToken}` } });
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json.quotes)) setQuotes(json.quotes);
    } catch (err) {
      console.warn('Lecture des devis impossible:', err);
    }
  }, []);

  // Annuaire réel des membres. Un membre non-admin ne voit que son pôle,
  // comme pour les autres collections.
  const scopedOsMembers = isDirection ? osMembers : osMembers.filter((m) => m.pole === scopePole);

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode,
        dashboardTab,
        setDashboardTab,
        currentUser,
        setCurrentUser,
        allProfiles: scopedOsMembers,
        leads: scopedLeads,
        addLead,
        updateLeadStatus,
        updateLeadNotes,
        convertLeadToProject,
        reports: scopedReports,
        agentReports: scopedReports,
        addReport,
        addAgentReport,
        updateReportStatus,
        tasks: scopedTasks,
    addTask,
    updateTaskStatus,
    remindTask,
        osMembers: scopedOsMembers,
        refreshOsMembers,
    sendMessageAs,
    simulateExchange,
        messages: scopedMessages,
        sendMessage,
        deleteMessage,
        activeChannel,
        setActiveChannel,
        notifications: scopedNotifications,
        markNotificationRead,
        markNotificationAsRead: markNotificationRead,
        clearNotifications,
        pushNotification,
        projets: scopedProjets,
        quotes,
        chiffreAffairesReel,
        refreshQuotes,
        updateProjectProgression,
  createProject,
        updateProjectMilestone,
        addProjectMilestone,
        addProjectFeedback,
        addProjectFieldVisit,
  updateProjectFieldVisit,
        updateProjectNotes,
        isClientPortalOpen,
        setIsClientPortalOpen,
        activeClientProjectCode,
        setActiveClientProjectCode,
        openClientPortal,
        isQuoteModalOpen,
        setIsQuoteModalOpen,
        isTrialModalOpen,
        setIsTrialModalOpen,
        isAgentModalOpen,
        setIsAgentModalOpen,
        activeAgentPole,
        setActiveAgentPole,
        selectedPole: activeAgentPole,
        setSelectedPole: setActiveAgentPole,
        openAgentWithPole,
        theme,
        setTheme,
        toggleTheme,
        currency,
        setCurrency,
        siteConfig,
        updateSiteConfig,
        updateHeroConfig,
        updateAnnouncementConfig,
        updateContactConfig,
        forfaits,
        updateForfait,
        blogPosts,
        addBlogPost,
        updateBlogPost,
        deleteBlogPost,
        activeBlogPost,
        setActiveBlogPost,
        dataTransfers,
    isBlueprintModalOpen,
    setIsBlueprintModalOpen,
    isLegalModalOpen,
    setIsLegalModalOpen,
        isDataFetching,
        lastSyncTime,
        refreshDashboardData,
        realisations,
        updateRealisation,
        addRealisation,
        deleteRealisation,
        temoignages,
        updateTemoignage,
        addTemoignage,
        deleteTemoignage,
        contentStatus,
        persistContent,
        importSeedContent,
        refreshContent,
        isRealDataMode: isRealDataMode(),
        purgeDemoData,
        restoreDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
