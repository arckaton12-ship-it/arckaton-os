import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Sparkles, 
  Settings, 
  Globe, 
  Bell, 
  Menu, 
  X, 
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  FileEdit,
  ShieldCheck,
  Briefcase,
  FolderKanban,
  Search,
  LogOut,
  CalendarDays
} from 'lucide-react';
import { CommandPalette, type PaletteItem } from './CommandPalette';
import { OverviewTab } from './OverviewTab';
import { ProjectsProductionTab } from './ProjectsProductionTab';
import { OrgChart } from '../orgchart/OrgChart';
import { KanbanBoard } from '../tasks/KanbanBoard';
import { CrmSection } from '../crm/CrmSection';
import { InternalChat } from '../messaging/InternalChat';
import { CopilotTab } from './CopilotTab';
import { SiteAdmin } from '../siteadmin/SiteAdmin';
import { SettingsTab } from './SettingsTab';
import { NotificationsDrawer } from './NotificationsDrawer';
import { MembersTab } from './MembersTab';
import { PoleDashboard } from './PoleDashboard';
import { AgendaTab } from './AgendaTab';
import { LoginPanel } from '../auth/LoginPanel';

export const DashboardLayout: React.FC = () => {
  const { setMode, notifications, projets } = useApp();
  const { user, role, isSiteEditor, isAdmin, logout, isAuthenticated, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<
    | 'overview' | 'projects' | 'orgchart' | 'tasks' | 'crm' | 'agenda' | 'messaging' | 'copilot' | 'siteadmin' | 'settings' | 'members'
  >('overview');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Sections repliables de la barre laterale : l'utilisateur peut masquer
  // celles qu'il n'utilise pas. L'etat est memorise ; par defaut tout est
  // ouvert pour ne jamais cacher une entree par surprise.
  const [sectionsOuvertes, setSectionsOuvertes] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('arckaton_sidebar_sections') || '{}');
    } catch {
      return {};
    }
  });

  const basculerSection = (id: string) => {
    setSectionsOuvertes((prev) => {
      const suivant = { ...prev, [id]: !(prev[id] ?? true) };
      try {
        localStorage.setItem('arckaton_sidebar_sections', JSON.stringify(suivant));
      } catch {
        // Stockage indisponible : le repli restera valable pour la session.
      }
      return suivant;
    });
  };

  // Raccourci universel de la palette de commandes (Ctrl/Cmd + K).
  useEffect(() => {
    const surRaccourci = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', surRaccourci);
    return () => window.removeEventListener('keydown', surRaccourci);
  }, []);

  // Navigation centralisee : sidebar, notifications, vue d'ensemble. Les
  // liens internes serveur arrivent parfois sous forme d'URL (`/os?onglet=agenda`)
  // : on extrait alors le nom de l'onglet cible.
  const goToTab = (t: string) => {
    const cible = t.includes('?') ? t.split('?')[1].replace('onglet=', '') : t;
    const alias: Record<string, typeof activeTab> = {
      leads: 'crm',
      crm: 'crm',
      agenda: 'agenda',
      rdv: 'agenda',
      projects: 'projects',
      tasks: 'tasks',
      kanban: 'tasks',
      copilot: 'copilot',
      settings: 'settings',
      messaging: 'messaging',
      members: 'members',
      orgchart: 'orgchart',
      siteadmin: 'siteadmin',
      overview: 'overview',
    };
    setActiveTab(alias[cible] || 'overview');
    setIsSidebarOpen(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Session réelle : chargement, puis login requis
  if (loading) {
    return (
      <div className="min-h-dvh bg-rk-bg flex items-center justify-center">
        <div className="text-rk-muted text-sm font-mono flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          Arckaton OS — Vérification de la session…
        </div>
      </div>
    );
  }

  // Accès OS réservé aux membres habilités (login requis)
  if (!isAuthenticated) {
    return <LoginPanel />;
  }

  // Les membres (non-admin / non-gestionnaire contenu) pilotent leur pôle uniquement
  if (!isSiteEditor) {
    return <PoleDashboard />;
  }

  // Badges volontairement sobres : seul le compteur de projets est dynamique
  // et utile. Les mentions decoratives (« Ventes », « Boss »...) alourdissaient
  // la barre sans rien apprendre.
  const navItems = [
    { id: 'overview' as const, label: "Vue d'ensemble", icon: LayoutDashboard, badge: null, adminOnly: false },
    { id: 'projects' as const, label: "Projets & Production", icon: FolderKanban, badge: projets.length ? projets.length.toString() : null, adminOnly: false },
    { id: 'orgchart' as const, label: "Organigramme (17 Postes)", icon: Users, badge: null, adminOnly: false },
    { id: 'tasks' as const, label: "Tableau Kanban", icon: CheckSquare, badge: null, adminOnly: false },
    { id: 'crm' as const, label: "CRM & Devis / Ventes", icon: Briefcase, badge: null, adminOnly: false },
    { id: 'agenda' as const, label: "Agenda & RDV", icon: CalendarDays, badge: null, adminOnly: false },
    { id: 'messaging' as const, label: "Messagerie Interne", icon: MessageSquare, badge: null, adminOnly: false },
    { id: 'copilot' as const, label: "Copilote IA Stratégique", icon: Sparkles, badge: null, adminOnly: false },
    { id: 'siteadmin' as const, label: "Gestion Site (/site CMS)", icon: FileEdit, badge: null, adminOnly: false },
    { id: 'members' as const, label: "Membres & Habilitations", icon: ShieldCheck, badge: null, adminOnly: true },
    { id: 'settings' as const, label: "Paramètres & Grille", icon: Settings, badge: null, adminOnly: false },
  ].filter((item) => !item.adminOnly || isAdmin);

  const currentLabel = navItems.find((item) => item.id === activeTab)?.label ?? "Vue d'ensemble";

  // Regroupement thematique de la navigation : moins de bruit, entrees
  // repliables. Une section vide (droits insuffisants) est omit.
  const sections: { id: string; label: string; items: typeof navItems }[] = (
    [
      { id: 'pilotage', label: 'Pilotage', ids: ['overview', 'projects', 'tasks', 'copilot'] },
      { id: 'clients', label: 'Clients', ids: ['crm', 'agenda', 'messaging'] },
      { id: 'organisation', label: 'Organisation', ids: ['orgchart', 'members'] },
      { id: 'configuration', label: 'Configuration', ids: ['siteadmin', 'settings'] },
    ] as { id: string; label: string; ids: string[] }[]
  )
    .map((section) => ({
      id: section.id,
      label: section.label,
      items: navItems.filter((item) => section.ids.includes(item.id)),
    }))
    .filter((section) => section.items.length > 0);

  const breadcrumb = (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-xs font-mono">
      {activeTab === 'overview' ? (
        <span className="text-rk-text-secondary">Cockpit</span>
      ) : (
        <>
          <button
            type="button"
            onClick={() => goToTab('overview')}
            className="flex items-center gap-1.5 text-rk-text hover:text-white bg-white/5 hover:bg-white/10 border border-rk-line px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retour au Cockpit</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-rk-muted" aria-hidden="true" />
          <span className="text-white font-semibold truncate max-w-[220px]" aria-current="page">
            {currentLabel}
          </span>
        </>
      )}
    </nav>
  );

  // Commandes de la palette : navigation entre sections + actions rapides.
  const paletteItems: PaletteItem[] = [
    ...navItems.map((item) => ({
      id: `nav-${item.id}`,
      label: item.label,
      group: 'Navigation',
      icon: item.icon,
      run: () => goToTab(item.id),
    })),
    {
      id: 'action-public',
      label: 'Voir le site public',
      group: 'Actions',
      icon: Globe,
      run: () => setMode('public'),
    },
    {
      id: 'action-notifications',
      label: 'Ouvrir les notifications',
      group: 'Actions',
      icon: Bell,
      run: () => setIsNotificationsOpen(true),
    },
    {
      id: 'action-logout',
      label: 'Se déconnecter',
      group: 'Actions',
      icon: LogOut,
      run: () => logout(),
    },
  ];

  return (
    <div className="min-h-dvh bg-rk-bg text-rk-text flex flex-col md:flex-row font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Mobile Top Header */}
      <div className="md:hidden bg-rk-chrome border-b border-rk-line p-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isSidebarOpen}
            className="p-2 rounded-lg bg-white/5 text-rk-text-secondary hover:text-white"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-serif text-sm font-bold text-white">
              A
            </div>
            <span className="font-serif font-bold text-lg text-white">
              Arckaton <span className="text-blue-400 font-mono text-xs">OS</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaletteOpen(true)}
            aria-label="Ouvrir la palette de commandes"
            className="p-2 rounded-lg bg-white/5 text-rk-text-secondary"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            onClick={() => setIsNotificationsOpen(true)}
            aria-label={unreadCount > 0 ? `Ouvrir les notifications (${unreadCount} non lues)` : 'Ouvrir les notifications'}
            className="p-2 rounded-lg bg-white/5 text-rk-text-secondary relative"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-xs text-white font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMode('public')}
            className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-medium"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Site</span>
          </button>
        </div>
      </div>

      {/* Fond assombri derrière la barre latérale sur mobile : un clic
          n'importe où ferme le menu. */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-dvh w-64 bg-rk-chrome border-r border-rk-line flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Logo & Identity */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-serif text-lg font-bold text-white shadow-lg shadow-blue-500/20">
                A
              </div>
              <div>
                <div className="font-serif text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span>arckaton</span>
                  <span className="text-blue-400 text-xs font-mono px-1.5 py-0.2 rounded bg-blue-500/20 border border-blue-500/30">
                    OS
                  </span>
                </div>
                <div className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Cockpit Production</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Fermer le menu"
              className="md:hidden text-rk-muted hover:text-white"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation Links groupées en sections repliables */}
          <nav className="space-y-3" aria-label="Sections du cockpit">
            {sections.map((section) => {
              const ouverte = sectionsOuvertes[section.id] ?? true;
              const contientActif = section.items.some((item) => item.id === activeTab);

              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() => basculerSection(section.id)}
                    aria-expanded={ouverte}
                    className={`w-full flex items-center justify-between px-2 py-1 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                      contientActif ? 'text-rk-text-secondary' : 'text-rk-muted hover:text-rk-text-secondary'
                    }`}
                  >
                    <span>{section.label}</span>
                    <ChevronRight
                      aria-hidden="true"
                      className={`w-3 h-3 transition-transform ${ouverte ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {ouverte && (
                    <div className="space-y-1 mt-1.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        const isSpecial = item.id === 'copilot';

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              setIsSidebarOpen(false);
                            }}
                            aria-current={isActive ? 'page' : undefined}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                              isActive
                                ? isSpecial
                                  ? 'bg-gradient-to-r from-emerald-500/25 to-blue-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                                  : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                : isSpecial
                                ? 'text-emerald-300/90 hover:bg-emerald-500/10 border border-emerald-500/20'
                                : 'text-rk-text-secondary hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon aria-hidden="true" className={`w-4 h-4 ${isActive ? 'text-white' : isSpecial ? 'text-emerald-400' : 'text-rk-muted'}`} />
                              <span>{item.label}</span>
                            </div>

                            {item.badge && (
                              <span className={`text-xs font-mono px-1.5 py-0.2 rounded-md ${
                                isActive ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-300'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: User & Public Switcher */}
        <div className="p-4 border-t border-rk-line space-y-3 bg-rk-bg/80">
          
          {/* User Profile Badge */}
          <div className="p-2.5 rounded-xl bg-white/5 border border-rk-line-soft">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white truncate">{user.name}</div>
              <span className="text-xs font-mono uppercase bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded">
                {role}
              </span>
            </div>
            <div className="text-xs font-mono text-rk-muted truncate mt-0.5">
              {user.poste_titre} • Pôle {user.pole}
            </div>
          </div>

          {/* Mode Switcher to Public Site */}
          <button
            onClick={() => setMode('public')}
            className="w-full bg-white/5 hover:bg-white/10 text-rk-text-secondary hover:text-white border border-rk-line py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Revenir au Site Public</span>
          </button>
        </div>
      </aside>

      {/* Main App Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-rk-chrome/95 backdrop-blur-md border-b border-rk-line sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {breadcrumb}
            <span className="hidden lg:inline text-xs font-mono text-rk-muted">
              • Yaoundé & Rayonnement Mondial
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Palette de commandes */}
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="hidden lg:flex items-center gap-2 bg-rk-panel border border-rk-line px-3 py-1.5 rounded-xl text-xs text-rk-muted hover:text-white transition-colors cursor-pointer"
              aria-label="Ouvrir la palette de commandes (Ctrl ou Cmd + K)"
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Rechercher</span>
              <kbd className="font-mono text-xs border border-rk-line-soft rounded px-1.5 py-0.5">⌘K</kbd>
            </button>

            {/* Session Membre */}
            <div className="flex items-center gap-2 bg-rk-panel border border-rk-line px-3 py-1.5 rounded-xl">
              <div className="hidden md:block text-right">
                <div className="text-xs font-semibold text-white leading-none">{user.name}</div>
                <div className="text-xs font-mono text-rk-muted mt-0.5">{role}</div>
              </div>
              <button
                onClick={logout}
                className="text-xs font-mono text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                title="Se déconnecter"
              >
                Déconnexion
              </button>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="p-2 rounded-xl bg-rk-bg hover:bg-white/5 text-rk-text-secondary border border-rk-line relative transition-colors cursor-pointer"
              title="Notifications"
              aria-label={unreadCount > 0 ? `Ouvrir les notifications (${unreadCount} non lues)` : 'Ouvrir les notifications'}
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-xs text-white font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Switch to Public Site */}
            <button
              onClick={() => setMode('public')}
              className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-2 font-medium transition-all cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Voir le Site Public</span>
            </button>
          </div>
        </header>

        {/* Tab Content Rendering */}
        <div className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <div className="md:hidden mb-4">{breadcrumb}</div>
          {activeTab === 'overview' && (
            <OverviewTab onSelectTab={(t) => goToTab(t)} />
          )}
          {activeTab === 'projects' && <ProjectsProductionTab />}
          {activeTab === 'orgchart' && <OrgChart />}
          {activeTab === 'tasks' && <KanbanBoard />}
          {activeTab === 'crm' && <CrmSection />}
          {activeTab === 'agenda' && <AgendaTab />}
          {activeTab === 'messaging' && <InternalChat />}
          {activeTab === 'copilot' && <CopilotTab />}
          {activeTab === 'siteadmin' && <SiteAdmin />}
          {activeTab === 'members' && <MembersTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onNavigate={goToTab}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        items={paletteItems}
      />

    </div>
  );
};
