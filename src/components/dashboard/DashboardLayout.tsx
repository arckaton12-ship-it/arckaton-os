import React, { useState } from 'react';
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
  FolderKanban
} from 'lucide-react';
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
import { LoginPanel } from '../auth/LoginPanel';

export const DashboardLayout: React.FC = () => {
  const { setMode, notifications, projets } = useApp();
  const { user, role, isSiteEditor, isAdmin, logout, isAuthenticated, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<
    | 'overview' | 'projects' | 'orgchart' | 'tasks' | 'crm' | 'messaging' | 'copilot' | 'siteadmin' | 'settings' | 'members'
  >('overview');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Session réelle : chargement, puis login requis
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070c1e] flex items-center justify-center">
        <div className="text-slate-400 text-sm font-mono flex items-center gap-2">
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

  const navItems = [
    { id: 'overview' as const, label: "Vue d'ensemble", icon: LayoutDashboard, badge: null, adminOnly: false },
    { id: 'projects' as const, label: "Projets & Production", icon: FolderKanban, badge: projets.length.toString(), adminOnly: false },
    { id: 'orgchart' as const, label: "Organigramme (17 Postes)", icon: Users, badge: "Équipe", adminOnly: false },
    { id: 'tasks' as const, label: "Tableau Kanban", icon: CheckSquare, badge: null, adminOnly: false },
    { id: 'crm' as const, label: "CRM & Devis / Ventes", icon: Briefcase, badge: "Ventes", adminOnly: false },
    { id: 'messaging' as const, label: "Messagerie Interne", icon: MessageSquare, badge: "Direct", adminOnly: false },
    { id: 'copilot' as const, label: "Copilote IA Stratégique", icon: Sparkles, badge: "Spécial", adminOnly: false },
    { id: 'siteadmin' as const, label: "Gestion Site (/site CMS)", icon: FileEdit, badge: "CMS", adminOnly: false },
    { id: 'members' as const, label: "Membres & Habilitations", icon: ShieldCheck, badge: "Boss", adminOnly: true },
    { id: 'settings' as const, label: "Paramètres & Grille", icon: Settings, badge: null, adminOnly: false },
  ].filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-[#070c1e] text-slate-100 flex flex-col md:flex-row font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Mobile Top Header */}
      <div className="md:hidden bg-[#09122a] border-b border-white/10 p-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg bg-white/5 text-slate-300 hover:text-white"
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
            onClick={() => setIsNotificationsOpen(true)}
            className="p-2 rounded-lg bg-white/5 text-slate-300 relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] text-white font-bold flex items-center justify-center">
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

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-[#09122a] border-r border-white/10 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
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
                <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Cockpit Production</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? isSpecial
                        ? 'bg-gradient-to-r from-emerald-500/25 to-blue-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : isSpecial
                      ? 'text-emerald-300/90 hover:bg-emerald-500/10 border border-emerald-500/20'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isSpecial ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                      isSpecial
                        ? 'bg-gradient-to-r from-emerald-400 to-amber-300 text-slate-950 font-bold'
                        : item.badge === 'CMS'
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: User & Public Switcher */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-[#070c1e]/80">
          
          {/* User Profile Badge */}
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white truncate">{user.name}</div>
              <span className="text-[9px] font-mono uppercase bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded">
                {role}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
              {user.poste_titre} • Pôle {user.pole}
            </div>
          </div>

          {/* Mode Switcher to Public Site */}
          <button
            onClick={() => setMode('public')}
            className="w-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Revenir au Site Public</span>
          </button>
        </div>
      </aside>

      {/* Main App Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-[#09122a]/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">
              Système de pilotage interne • Yaoundé & Rayonnement Mondial
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Session Membre */}
            <div className="flex items-center gap-2 bg-[#0a122e] border border-white/10 px-3 py-1.5 rounded-xl">
              <div className="hidden md:block text-right">
                <div className="text-xs font-semibold text-white leading-none">{user.name}</div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">{role}</div>
              </div>
              <button
                onClick={logout}
                className="text-[10px] font-mono text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                title="Se déconnecter"
              >
                Déconnexion
              </button>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="p-2 rounded-xl bg-[#070c1e] hover:bg-white/5 text-slate-300 border border-white/10 relative transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] text-white font-bold flex items-center justify-center">
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
          {activeTab === 'overview' && (
            <OverviewTab onSelectTab={(t) => {
              if (t === 'leads') setActiveTab('crm');
              else if (t === 'projects') setActiveTab('projects');
              else if (t === 'tasks') setActiveTab('tasks');
              else if (t === 'copilot') setActiveTab('copilot');
              else if (t === 'settings') setActiveTab('settings');
              else setActiveTab('overview');
            }} />
          )}
          {activeTab === 'projects' && <ProjectsProductionTab />}
          {activeTab === 'orgchart' && <OrgChart />}
          {activeTab === 'tasks' && <KanbanBoard />}
          {activeTab === 'crm' && <CrmSection />}
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
        onClose={() => setIsNotificationsOpen(false)}
      />

    </div>
  );
};
