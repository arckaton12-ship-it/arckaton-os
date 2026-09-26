import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  ArrowUpRight, 
  Smartphone, 
  Calendar,
  MessageSquare,
  FileText,
  Activity,
  FolderKanban,
  RefreshCw
} from 'lucide-react';
import { POLES_INFO } from '../../data/mockData';
import { 
  MetricsRowSkeleton, 
  ProjectStripSkeleton, 
  LeadsPanelSkeleton, 
  PolesPerformanceSkeleton 
} from './DashboardSkeleton';

interface Props {
  onSelectTab: (tab: 'overview' | 'leads' | 'projects' | 'tasks' | 'copilot' | 'settings') => void;
}

export const OverviewTab: React.FC<Props> = ({ onSelectTab }) => {
  const { 
    leads, 
    tasks, 
    agentReports, 
    setMode, 
    projets, 
    openClientPortal,
    isDataFetching,
    lastSyncTime,
    refreshDashboardData 
  } = useApp();

  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.statut === 'nouveau').length;
  const inProgressLeads = leads.filter(l => l.statut === 'contacte' || l.statut === 'devis_envoye').length;
  const convertedLeads = leads.filter(l => l.statut === 'converti').length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'termine').length;
  const urgentTasks = tasks.filter(t => t.priority === 'urgente' && t.status !== 'termine').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Cockpit Banner Header */}
      <div className="bg-gradient-to-r from-[#0c1844] via-[#09122a] to-[#0c1844] border border-blue-500/20 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isDataFetching ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
              Arckaton Operating System v2.4 • Yaoundé Central
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-[11px] font-mono text-slate-400">
              Synchro : {lastSyncTime}
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            Cockpit Opérationnel & Stratégique
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
            Gestion unifiée des 6 pôles, pilotage du pipeline commercial, suivi terrain et copilote d'intelligence artificielle Gemini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Subtle Refresh Trigger */}
          <button
            onClick={() => refreshDashboardData()}
            disabled={isDataFetching}
            className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            title="Rafraîchir les flux de données (visualiser le skeleton loader)"
          >
            <span className={`w-2 h-2 rounded-full ${isDataFetching ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span>{isDataFetching ? 'Actualisation...' : 'Actualiser'}</span>
          </button>

          <button
            onClick={() => onSelectTab('projects')}
            className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-md"
          >
            <FolderKanban className="w-4 h-4 text-emerald-400" />
            <span>Suivi des {projets.length} Projets Actifs</span>
          </button>

          <button
            onClick={() => onSelectTab('copilot')}
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Générer un Rapport IA (1 clic)</span>
          </button>

          <button
            onClick={() => onSelectTab('leads')}
            className="bg-white/10 hover:bg-white/15 text-white border border-white/15 px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Gérer les {totalLeads} Leads</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Metric Cards (or Skeleton Loader during fetch) */}
      {isDataFetching ? (
        <MetricsRowSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Pipeline Leads */}
          <div className="bg-[#0a0f2e] border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Pipeline Commercial</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-serif text-3xl font-bold text-white">{totalLeads} Prospects</div>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="text-emerald-400 font-mono font-semibold">{newLeads} nouveaux</span>
                <span className="text-slate-400">•</span>
                <span className="text-amber-400 font-mono">{convertedLeads} convertis</span>
              </div>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Taux de conversion : {totalLeads ? Math.round((convertedLeads / totalLeads) * 100) : 0}%</span>
              <button onClick={() => onSelectTab('leads')} className="text-blue-400 hover:underline">Voir &rarr;</button>
            </div>
          </div>

          {/* Card 2: Flux Financier Consolidé */}
          <div className="bg-[#0a0f2e] border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Volume Facturé Consolidé</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-serif text-3xl font-bold text-emerald-400">12.8M FCFA</div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-300">
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span>Mobile Money MTN & Orange (82%)</span>
              </div>
            </div>
            <div className="pt-2 border-t border-white/5 text-[11px] font-mono text-slate-400">
              Objectif mensuel atteint à 108%
            </div>
          </div>

          {/* Card 3: Sorties Terrain Mensuelles */}
          <div className="bg-[#0a0f2e] border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Activations Terrain</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-serif text-3xl font-bold text-amber-300">7 / 9 Sorties</div>
              <div className="text-xs text-slate-300 mt-1">
                Forfaits Synergie & Architecture
              </div>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-emerald-400">
              <span>Prochaine : Demain 10h (Maison Kotto)</span>
              <button onClick={() => onSelectTab('projects')} className="text-amber-400 hover:underline">Voir &rarr;</button>
            </div>
          </div>

          {/* Card 4: Tâches & Santé Pôles */}
          <div className="bg-[#0a0f2e] border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Tâches & Pôles</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-serif text-3xl font-bold text-white">{completedTasks} / {totalTasks}</div>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="text-slate-300 font-mono">Tâches complétées</span>
                {urgentTasks > 0 && (
                  <span className="text-rose-400 font-mono text-[11px] bg-rose-500/15 px-1.5 py-0.5 rounded">
                    {urgentTasks} urgentes
                  </span>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Santé globale : Optimale</span>
              <button onClick={() => onSelectTab('tasks')} className="text-purple-400 hover:underline">Gérer &rarr;</button>
            </div>
          </div>
        </div>
      )}

      {/* Production Projects Quick Strip (or Skeleton Loader during fetch) */}
      {isDataFetching ? (
        <ProjectStripSkeleton />
      ) : (
        <div className="bg-[#0a0f2e] border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-emerald-400" />
              <h3 className="font-serif text-base font-bold text-white">
                Projets Clients en Production & Validation BAT ({projets.length})
              </h3>
            </div>
            <button
              onClick={() => onSelectTab('projects')}
              className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Ouvrir l'espace production complet</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projets.map((prj) => {
              const pct = prj.progression ?? 0;
              return (
                <div 
                  key={prj.id}
                  onClick={() => onSelectTab('projects')}
                  className="p-4 rounded-2xl bg-[#070c1e] border border-white/5 hover:border-emerald-500/40 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-white text-xs sm:text-sm">{prj.client_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{prj.client_code || prj.id} • Pôle {prj.pole}</div>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{pct}%</span>
                  </div>

                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>{prj.jalons?.length || 0} jalons contractuels</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openClientPortal(prj.client_code || prj.id);
                      }}
                      className="text-blue-400 hover:underline"
                    >
                      Portail BAT &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two Column Layout: Recent Leads & Pole Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Latest Incoming Leads */}
        <div className="lg:col-span-7">
          {isDataFetching ? (
            <LeadsPanelSkeleton />
          ) : (
            <div className="bg-[#0a0f2e] border border-white/10 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="font-serif text-lg font-bold text-white">Derniers Prospects Captés</h3>
                </div>
                <button
                  onClick={() => onSelectTab('leads')}
                  className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <span>Voir tout le CRM ({totalLeads})</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {leads.slice(0, 5).map((l) => (
                  <div
                    key={l.id}
                    className="p-4 rounded-xl bg-[#070c1e] border border-white/5 hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{l.name}</span>
                        <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                          {l.country || 'Cameroun'}
                        </span>
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                          l.statut === 'nouveau' ? 'bg-emerald-500/20 text-emerald-300' :
                          l.statut === 'contacte' ? 'bg-blue-500/20 text-blue-300' :
                          l.statut === 'converti' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {l.statut.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300">
                        {l.project_type}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Budget : {l.budget} • Pôle : {l.pole_assigned}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <a
                        href={`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${l.name}, ici l'agence Arckaton concernant votre demande (${l.project_type}).`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                        title="Ouvrir WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: The 6 Poles Activity & AI Reports preview */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Pôles Status Grid */}
          {isDataFetching ? (
            <PolesPerformanceSkeleton />
          ) : (
            <div className="bg-[#0a0f2e] border border-white/10 rounded-3xl p-6 space-y-4">
              <h3 className="font-serif text-lg font-bold text-white flex items-center justify-between">
                <span>Performance des 6 Pôles</span>
                <span className="text-xs font-mono text-slate-400 font-normal">Équipe Arckaton</span>
              </h3>

              <div className="space-y-2.5">
                {(['Direction', 'Tech', 'Creatif', 'Digital', 'Client', 'Externe'] as const).map((pole) => {
                  const info = POLES_INFO[pole];
                  const poleTasks = tasks.filter(t => t.pole === pole);
                  const doneCount = poleTasks.filter(t => t.status === 'termine').length;
                  const total = poleTasks.length;
                  const percent = total ? Math.round((doneCount / total) * 100) : 100;

                  return (
                    <div key={pole} className="p-2.5 rounded-xl bg-[#070c1e] border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{info.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">({info.manager})</span>
                        </div>
                        <span className="font-mono text-[11px] text-emerald-400">{percent}% tâches</span>
                      </div>
                      {/* Tiny Progress Bar */}
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Feature Shortcut: AI Copilot Strategic Snapshot */}
          <div className="bg-gradient-to-b from-[#0f1b4c] to-[#0a0f2e] border border-emerald-500/30 rounded-3xl p-6 space-y-3 relative overflow-hidden">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>Copilote Exclusif Arckaton OS</span>
            </div>
            <h4 className="font-serif text-xl font-bold text-white">
              Générateur d'Audit & Rapports Stratégiques
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Activez le moteur Gemini pour analyser vos marges par forfait, prioriser les leads chauds et générer la feuille de route du prochain sprint.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onSelectTab('copilot')}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Accéder au Centre Stratégique IA &rarr;</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
