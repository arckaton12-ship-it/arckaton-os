export type Pole = 'Direction' | 'Creatif' | 'Tech' | 'Digital' | 'Client' | 'Externe';

export const POLE_COLORS: Record<Pole, { hex: string; bg: string; border: string; text: string }> = {
  Direction: { hex: '#00c97a', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  Creatif: { hex: '#a880ff', bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
  Tech: { hex: '#4d8dff', bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  Digital: { hex: '#f5a83c', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  Client: { hex: '#ff4d6a', bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' },
  Externe: { hex: '#8892a4', bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400' },
};

export type UserRole = 'admin' | 'site_editor' | 'membre';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  poste_id?: string;
  poste_titre?: string;
  pole: Pole;
}

export interface Poste {
  id: string;
  titre: string;
  pole: Pole;
  phase: 1 | 2 | 3 | 4;
  ordre: number;
  description: string;
  titulaire?: string;
  titulaire_id?: string;
  charge_estimee: string;
  statut_recrutement: 'pourvu' | 'recrutement_ouvert' | 'a_pourvoir';
}

export type TaskStatus = 'a_faire' | 'en_cours' | 'revue' | 'termine';
export type TaskPriority = 'basse' | 'normale' | 'haute' | 'urgente';

export interface Task {
  id: string;
  titre?: string;
  title?: string;
  description?: string;
  statut?: TaskStatus;
  status?: TaskStatus;
  priorite?: TaskPriority;
  priority?: TaskPriority;
  pole: Pole;
  assignee_name?: string;
  assigned_to?: string;
  assignee_id?: string;
  poste_titre?: string;
  date_echeance?: string;
  due_date?: string;
  created_at?: string;
}

export type LeadStatus = 'nouveau' | 'contacte' | 'qualifie' | 'devis_envoye' | 'converti' | 'archive' | 'perdu';

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  project_type: string;
  budget?: string;
  message: string;
  source: 'site_v2' | 'site_v2_devis' | 'site_v2_trial' | 'agent_ia' | 'direct' | 'dashboard_manual';
  statut: LeadStatus;
  notes?: string;
  pole_assigned: Pole;
  country?: string;
  created_at: string;
}

export interface AgentReport {
  id: string;
  title?: string;
  sujet?: string;
  client_name?: string;
  lead_name?: string;
  pole: Pole;
  resume?: string;
  summary?: string;
  recommendations?: string[];
  forfait_recommande?: string;
  intention?: 'devis' | 'essai' | 'information';
  contact_info?: string;
  created_at: string;
  status?: 'non_traite' | 'en_cours' | 'converti';
  messages_count?: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type?: 'lead' | 'task' | 'message' | 'system';
  read: boolean;
  link?: string;
  created_at: string;
  pole?: Pole;
  pole_target?: Pole;
  recipient?: string;
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  sender_name: string;
  sender_role: string;
  pole: Pole;
  content: string;
  created_at: string;
}

export interface ForfaitData {
  id: string;
  number: string;
  name: string;
  tagline: string;
  creation_price: string;
  creation_price_amount?: number;
  creation_features: string[];
  monthly_price: string;
  monthly_price_amount?: number;
  monthly_features: string[];
  delai: string;
  retouches: string;
  sorties_terrain: string;
  recommended?: boolean;
}

export type ThemeMode = 'dark' | 'light';
export type Currency = 'XAF' | 'EUR' | 'USD';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  event_type: 'deadline' | 'meeting' | 'launch' | 'terrain' | 'other';
  color?: string;
  pole: Pole;
  lieu?: string;
}

export interface ProjectMilestone {
  id: string;
  titre: string;
  statut: 'en_attente' | 'en_cours' | 'soumis_client' | 'valide';
  echeance?: string;
  livrable_url?: string;
  description?: string;
}

export interface FieldVisit {
  id: string;
  numero: number;
  date: string;
  lieu: string;
  objectif: string;
  intervenant: string;
  statut: 'planifiee' | 'effectuee' | 'en_montage' | 'livree';
  medias_count?: number;
}

export interface ClientFeedback {
  id: string;
  auteur: string;
  role: 'client' | 'agence';
  message: string;
  type: 'validation' | 'demande_ajustement' | 'question';
  date: string;
}

export interface Projet {
  id: string;
  client_code?: string;
  name: string;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  service: string;
  forfait?: string;
  pole: Pole;
  budget_estime: string;
  deadline: string;
  deliverables: string[];
  score: number;
  statut: 'brouillon' | 'qualifie' | 'en_cours' | 'livre' | 'annule';
  progression?: number;
  chef_de_projet?: string;
  sorties_terrain_total?: number;
  sorties_terrain_effectuees?: number;
  sorties_terrain?: FieldVisit[];
  jalons?: ProjectMilestone[];
  feedbacks?: ClientFeedback[];
  notes_internes?: string;
  created_at: string;
}

// Telemetry & Nodal Data Stream
export interface DataTransferEvent {
  id: string;
  from_member_id: string;
  from_member_name: string;
  from_role: string;
  to_member_id: string;
  to_member_name: string;
  to_role: string;
  pole: Pole;
  data_type: 'specs_tech' | 'ordre_terrain' | 'webhook_momo' | 'bat_validation' | 'rapport_perf' | 'patch_offline' | 'securite';
  payload_summary: string;
  timestamp: string;
  status: 'en_cours' | 'livre' | 'verifie';
  clearance_level: 'ALPHA-1' | 'BETA-2' | 'CONFIDENTIEL' | 'PUBLIC';
  hash: string;
}

// Field Blog & Customer Stories
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: 'terrain' | 'client' | 'tech' | 'arka';
  category_label: string;
  read_time: string;
  excerpt: string;
  content: string;
  author_name: string;
  author_role: string;
  date: string;
  image: string;
  tags: string[];
  featured?: boolean;
  client_quote?: {
    author: string;
    company: string;
    role: string;
    quote: string;
    metrics: string;
  };
  field_spec?: {
    lieu: string;
    date_mission: string;
    materiel: string;
    agents_mobilises: string[];
    livrables_generes: string;
  };
}

// Universal CMS Config
export interface SiteAnnouncementConfig {
  enabled: boolean;
  badge: string;
  text: string;
  button_text: string;
  target_url: string;
}

export interface SiteHeroConfig {
  badge: string;
  title_line_1: string;
  title_highlight: string;
  subtitle: string;
  cta_primary: string;
  cta_secondary: string;
  stat_1_val: string;
  stat_1_label: string;
  stat_2_val: string;
  stat_2_label: string;
  stat_3_val: string;
  stat_3_label: string;
}

export interface SiteAgencyContactConfig {
  whatsapp_number: string;
  whatsapp_display: string;
  phone_call: string;
  email_contact: string;
  address_yaounde: string;
  address_douala: string;
  disponibilite: string;
}

export interface UniversalSiteConfig {
  announcement: SiteAnnouncementConfig;
  hero: SiteHeroConfig;
  contact: SiteAgencyContactConfig;
}

// Case studies publics (section Réalisations) — éditables via CMS
export interface Realisation {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  forfait: string;
  description: string;
  mainMetric: string;
  mainMetricLabel: string;
  subMetric: string;
  points: string[];
  delay: string;
  badgeAccent?: string;
}

// Témoignages clients (éditables via CMS)
export interface Temoignage {
  id: string;
  author: string;
  role: string;
  company: string;
  text: string;
  metrics?: string;
}

// Membre Arckaton OS (retour API -> Supabase Auth + table members)
export type MemberPerm = 'content' | 'bat' | 'finance';

export interface MemberProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  pole: Pole;
  poste_id?: string | null;
  poste_titre?: string | null;
  permissions?: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}
