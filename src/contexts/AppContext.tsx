import React, { createContext, useContext, useState, useEffect } from 'react';
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
  ProjectMilestone,
  FieldVisit,
  ClientFeedback,
  ThemeMode,
  Currency,
  ForfaitData,
  BlogPost,
  DataTransferEvent,
  UniversalSiteConfig,
} from '../types';
import {
  INITIAL_LEADS,
  INITIAL_REPORTS,
  INITIAL_TASKS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_PROJETS,
  CURRENT_PROFILES,
  FORFAITS_DATA,
} from '../data/mockData';
import {
  DEFAULT_SITE_CONFIG,
  INITIAL_BLOG_POSTS,
  INITIAL_DATA_TRANSFERS,
} from '../data/blogAndTelemetryData';

// Helpers de synchronisation serveur (persistance Supabase côté Express)
const recipientPhonesForPole = (pole: Pole): string[] => {
  const member = CURRENT_PROFILES.find((p) => p.pole === pole);
  return member?.phone ? [member.phone] : [];
};

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

  // Messages
  messages: ChannelMessage[];
  sendMessage: (channelId: string, content: string) => void;

  // Notifications
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;

  // Projects
  projets: Projet[];
  updateProjectProgression: (id: string, progression: number) => void;
  updateProjectMilestone: (projectId: string, milestoneId: string, status: ProjectMilestone['statut']) => void;
  addProjectMilestone: (projectId: string, milestone: Omit<ProjectMilestone, 'id'>) => void;
  addProjectFeedback: (projectId: string, feedback: Omit<ClientFeedback, 'id' | 'date'>) => void;
  addProjectFieldVisit: (projectId: string, visit: Omit<FieldVisit, 'id'>) => void;
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
  triggerDataTransfer: (fromMemberId: string, toMemberId: string, dataType: DataTransferEvent['data_type'], summary: string) => DataTransferEvent;

  // Blueprint & Doctrine Modal
  isBlueprintModalOpen: boolean;
  setIsBlueprintModalOpen: (open: boolean) => void;

  // Data Fetching & Sync State for Skeleton Loaders
  isDataFetching: boolean;
  lastSyncTime: string;
  refreshDashboardData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'public' | 'dashboard'>('public');
  const [dashboardTab, setDashboardTab] = useState<string>('home');
  const [currentUser, setCurrentUser] = useState<UserProfile>(CURRENT_PROFILES[0]); // Patrice M. Admin

  // Data states with localStorage persistence
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('arckaton_leads');
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });

  const [reports, setReports] = useState<AgentReport[]>(() => {
    const saved = localStorage.getItem('arckaton_reports');
    return saved ? JSON.parse(saved) : INITIAL_REPORTS;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('arckaton_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [messages, setMessages] = useState<ChannelMessage[]>(() => {
    const saved = localStorage.getItem('arckaton_messages');
    return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('arckaton_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [projets, setProjets] = useState<Projet[]>(() => {
    const saved = localStorage.getItem('arckaton_projets');
    return saved ? JSON.parse(saved) : INITIAL_PROJETS;
  });

  // Modals & Client Portal
  const [isClientPortalOpen, setIsClientPortalOpen] = useState(false);
  const [activeClientProjectCode, setActiveClientProjectCode] = useState<string | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [activeAgentPole, setActiveAgentPole] = useState<Pole>('Direction');
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);

  // Theme & Currency States
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('arckaton_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
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
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => {
    const saved = localStorage.getItem('arckaton_cms_blog_posts');
    return saved ? JSON.parse(saved) : INITIAL_BLOG_POSTS;
  });
  const [activeBlogPost, setActiveBlogPost] = useState<BlogPost | null>(null);

  // Nodal Command Center Data Transfers
  const [dataTransfers, setDataTransfers] = useState<DataTransferEvent[]>(() => {
    const saved = localStorage.getItem('arckaton_data_transfers');
    return saved ? JSON.parse(saved) : INITIAL_DATA_TRANSFERS;
  });

  const updateSiteConfig = (newConfig: Partial<UniversalSiteConfig>) => {
    setSiteConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem('arckaton_site_config', JSON.stringify(updated));
      return updated;
    });
  };

  const updateHeroConfig = (hero: Partial<UniversalSiteConfig['hero']>) => {
    setSiteConfig((prev) => {
      const updated = { ...prev, hero: { ...prev.hero, ...hero } };
      localStorage.setItem('arckaton_site_config', JSON.stringify(updated));
      return updated;
    });
  };

  const updateAnnouncementConfig = (announcement: Partial<UniversalSiteConfig['announcement']>) => {
    setSiteConfig((prev) => {
      const updated = { ...prev, announcement: { ...prev.announcement, ...announcement } };
      localStorage.setItem('arckaton_site_config', JSON.stringify(updated));
      return updated;
    });
  };

  const updateContactConfig = (contact: Partial<UniversalSiteConfig['contact']>) => {
    setSiteConfig((prev) => {
      const updated = { ...prev, contact: { ...prev.contact, ...contact } };
      localStorage.setItem('arckaton_site_config', JSON.stringify(updated));
      return updated;
    });
  };

  const updateForfait = (id: string, data: Partial<ForfaitData>) => {
    setForfaits((prev) => {
      const updated = prev.map((f) => (f.id === id ? { ...f, ...data } : f));
      localStorage.setItem('arckaton_cms_forfaits', JSON.stringify(updated));
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
      return updated;
    });
  };

  const updateBlogPost = (id: string, post: Partial<BlogPost>) => {
    setBlogPosts((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...post } : p));
      localStorage.setItem('arckaton_cms_blog_posts', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteBlogPost = (id: string) => {
    setBlogPosts((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem('arckaton_cms_blog_posts', JSON.stringify(updated));
      return updated;
    });
  };

  const triggerDataTransfer = (
    fromMemberId: string,
    toMemberId: string,
    dataType: DataTransferEvent['data_type'],
    summary: string
  ): DataTransferEvent => {
    const sender = CURRENT_PROFILES.find((p) => p.id === fromMemberId) || CURRENT_PROFILES[0];
    const receiver = CURRENT_PROFILES.find((p) => p.id === toMemberId) || CURRENT_PROFILES[1];

    const randomHash = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newEvent: DataTransferEvent = {
      id: `dt-${Date.now()}`,
      from_member_id: sender.id,
      from_member_name: sender.name,
      from_role: sender.poste_titre || sender.role,
      to_member_id: receiver.id,
      to_member_name: receiver.name,
      to_role: receiver.poste_titre || receiver.role,
      pole: receiver.pole,
      data_type: dataType,
      payload_summary: summary,
      timestamp: "À l'instant",
      status: 'verifie',
      clearance_level: 'ALPHA-1',
      hash: `sha256:${randomHash}...${randomHash.slice(0, 4)}`,
    };

    setDataTransfers((prev) => {
      const updated = [newEvent, ...prev.slice(0, 19)];
      localStorage.setItem('arckaton_data_transfers', JSON.stringify(updated));
      return updated;
    });

    return newEvent;
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    localStorage.setItem('arckaton_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.classList.remove('theme-light');
    }
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
      // Synchronisation réelle avec le serveur (Supabase si configurée)
      const [leadsRes, reportsRes] = await Promise.all([
        fetch('/api/leads').then((r) => r.json()).catch(() => null),
        fetch('/api/reports').then((r) => r.json()).catch(() => null),
      ]);

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

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('arckaton_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('arckaton_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('arckaton_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('arckaton_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('arckaton_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('arckaton_projets', JSON.stringify(projets));
  }, [projets]);

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
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, statut } : l)));
  };

  const updateLeadNotes = (id: string, notes: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, notes } : l)));
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

    const newProject: Projet = {
      id: `prj-${Date.now()}`,
      client_code: clientCode,
      name: `Déploiement ${lead.project_type}`,
      client_name: lead.name,
      client_phone: lead.phone,
      client_email: lead.email,
      service: lead.project_type,
      forfait: lead.budget || 'Forfait Synergie (750 000 FCFA)',
      pole,
      budget_estime: lead.budget || '750 000 FCFA (Forfait Synergie)',
      deadline: 'Sous 4 semaines',
      deliverables: ['Cadrage & Charte', 'Intégration Web & Mobile Money', 'Formation 2h', 'Support garanti'],
      score: 60,
      progression: 20,
      chef_de_projet: 'Patrice M. (Chef d\'Agence)',
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
        { id: `st-${Date.now()}-1`, numero: 1, date: 'À planifier sous 7j', lieu: lead.country || 'Yaoundé / Douala', objectif: 'Prise de vue initiale et interview du dirigeant', intervenant: 'Boris W. (Vidéaste)', statut: 'planifiee' }
      ],
      feedbacks: [
        { id: `fb-${Date.now()}`, auteur: 'Système Arckaton', role: 'agence', message: `Bienvenue ! Le projet ${clientCode} a été initialisé avec succès. Votre Chef de Projet dédié est Patrice M.`, type: 'validation', date: 'Aujourd\'hui' }
      ],
      created_at: 'Aujourd\'hui',
    };

    setProjets((prev) => [newProject, ...prev]);

    // Automatically seed actionable tasks in Kanban for the team
    const initialTasks: Task[] = [
      {
        id: `task-${Date.now()}-1`,
        titre: `[${clientCode}] Cadrage & Devis définitif pour ${lead.name}`,
        description: `Organiser l'appel de cadrage avec ${lead.name} (${lead.phone}) pour valider les spécifications techniques.`,
        statut: 'en_cours',
        priorite: 'urgente',
        pole: 'Direction',
        assignee_name: 'Patrice M.',
        poste_titre: 'Chef d\'Agence',
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
        assignee_name: 'Yannick B.',
        poste_titre: 'Graphiste / Motion Designer',
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
        assignee_name: 'Arthur N.',
        poste_titre: 'Dev Full-Stack / CTO',
        date_echeance: 'Sous 15 jours',
        created_at: 'Aujourd\'hui',
      }
    ];

    setTasks((prev) => [...initialTasks, ...prev]);

    // Update lead status to converted
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, statut: 'converti' as const, notes: (l.notes ? l.notes + ' | ' : '') + `Converti en projet ${clientCode}` } : l))
    );

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
  const updateProjectProgression = (id: string, progression: number) => {
    setProjets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, progression: Math.min(100, Math.max(0, progression)) } : p))
    );
  };

  const updateProjectMilestone = (projectId: string, milestoneId: string, status: ProjectMilestone['statut']) => {
    setProjets((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const currentMilestones = p.jalons || [];
        const updated = currentMilestones.map((m) => (m.id === milestoneId ? { ...m, statut: status } : m));
        
        // Auto-recalculate progress
        const validCount = updated.filter((m) => m.statut === 'valide').length;
        const newProgression = Math.round((validCount / Math.max(1, updated.length)) * 100);

        return {
          ...p,
          jalons: updated,
          progression: newProgression,
        };
      })
    );
  };

  const addProjectMilestone = (projectId: string, milestone: Omit<ProjectMilestone, 'id'>) => {
    const newM: ProjectMilestone = {
      ...milestone,
      id: `j-${Date.now()}`,
    };
    setProjets((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, jalons: [...(p.jalons || []), newM] } : p))
    );
  };

  const addProjectFeedback = (projectId: string, feedback: Omit<ClientFeedback, 'id' | 'date'>) => {
    const newFb: ClientFeedback = {
      ...feedback,
      id: `fb-${Date.now()}`,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };

    setProjets((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          feedbacks: [...(p.feedbacks || []), newFb],
        };
      })
    );

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
      };
      setNotifications((prev) => [notif, ...prev]);
    }
  };

  const addProjectFieldVisit = (projectId: string, visit: Omit<FieldVisit, 'id'>) => {
    const newV: FieldVisit = {
      ...visit,
      id: `v-${Date.now()}`,
    };
    setProjets((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const visits = [...(p.sorties_terrain || []), newV];
        const effectuees = visits.filter((v) => v.statut === 'effectuee' || v.statut === 'livree').length;
        return {
          ...p,
          sorties_terrain: visits,
          sorties_terrain_effectuees: effectuees,
        };
      })
    );
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

  // Task Handler
  const addTask = (taskData: Omit<Task, 'id' | 'created_at'>) => {
    const newTask: Task = {
      ...taskData,
      id: `t-${Date.now()}`,
      created_at: 'Aujourd\'hui',
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const updateTaskStatus = (id: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, statut: status } : t)));
  };

  // Message Handler
  const sendMessage = (channelId: string, content: string) => {
    const newMsg: ChannelMessage = {
      id: `m-${Date.now()}`,
      channel_id: channelId,
      sender_name: currentUser.name,
      sender_role: currentUser.poste_titre || 'Membre Agence',
      pole: currentUser.pole,
      content,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
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

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode,
        dashboardTab,
        setDashboardTab,
        currentUser,
        setCurrentUser,
        allProfiles: CURRENT_PROFILES,
        leads,
        addLead,
        updateLeadStatus,
        updateLeadNotes,
        convertLeadToProject,
        reports,
        agentReports: reports,
        addReport,
        addAgentReport,
        updateReportStatus,
        tasks,
        addTask,
        updateTaskStatus,
        messages,
        sendMessage,
        notifications,
        markNotificationRead,
        markNotificationAsRead: markNotificationRead,
        clearNotifications,
        projets,
        updateProjectProgression,
        updateProjectMilestone,
        addProjectMilestone,
        addProjectFeedback,
        addProjectFieldVisit,
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
        triggerDataTransfer,
        isBlueprintModalOpen,
        setIsBlueprintModalOpen,
        isDataFetching,
        lastSyncTime,
        refreshDashboardData,
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
