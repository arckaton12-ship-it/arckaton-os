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
    refreshDashboardData,
    requestCopilotTask,
    quotes,
    chiffreAffairesReel,
    osMembers
  } = useApp();

  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.statut === 'nouveau').length;
  const inProgressLeads = leads.filter(l => l.statut === 'contacte' || l.statut === 'devis_envoye').length;
  const convertedLeads = leads.filter(l => l.statut === 'converti').length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => (t.status || t.statut) === 'termine').length;
  const urgentTasks = tasks.filter(t => (t.priority || t.priorite) === 'urgente' && (t.status || t.statut) !== 'termine').length;

  // Factures réellement enregistrées. Un devis est une proposition : il ne
  // compte pas dans le chiffre d'affaires.
  //
  // Répartition des montants, sans rien inventer :
  // - facturé   : total des factures hors brouillon et hors refus ;
  // - acomptes  : deposits réellement saisis sur les factures ;
  // - restant   : balance des factures non payées ;
  // - payé      : total des factures marquées payées.
  // Un « encaissé » ne peut pas être déduit du seul couple deposit/balance :
  // il n'existe pas de journal d'encaissement. Le solde restant est donc la
  // seule grandeur vérifiable, et c'est elle qui est affichée comme telle.
  const factures = quotes.filter((q) => q.type === 'facture');
  const facturesValides = factures.filter((q) => q.status !== 'brouillon' && q.status !== 'refuse');
  const devisEnCours = quotes.filter((q) => q.type === 'devis');
  const totalPaye = factures
    .filter((q) => q.status === 'paye')
    .reduce((s, q) => s + (Number(q.total) || 0), 0);
  const totalValide = facturesValides.reduce((s, q) => s + (Number(q.total) || 0), 0);
  const totalAcomptes = factures.reduce((s, q) => s + (Number(q.deposit) || 0), 0);
  const totalRestant = factures
    .filter((q) => q.status !== 'paye')
    .reduce((s, q) => s + (Number(q.balance) || 0), 0);

  // Sorties terrain : données réelles des projets, pas un compteur fixe.
  const sortiesTotal = projets.reduce((s, p) => s + (p.sorties_terrain_total || 0), 0);
  const sortiesEffectuees = projets.reduce((s, p) => s + (p.sorties_terrain_effectuees || 0), 0);
  const prochaineSortie = projets
    .flatMap((p) => (p.sorties_terrain || []).map((v) => ({ ...v, projet: p.name })))
    .filter((v) => (v as any).statut === 'planifiee')
    .sort((a, b) => String((a as any).date || '').localeCompare(String((b as any).date || '')))[0];

  const formatFcfa = (n: number) =>
    n.toLocaleString('fr-FR').replace(/ | /g, ' ') + ' FCFA';

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
            <span className="text-rk-muted">•</span>
            <span className="text-xs font-mono text-rk-muted">
              Synchro : {lastSyncTime}
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            Cockpit Opérationnel & Stratégique
          </h2>
          <p className="text-rk-text-secondary text-xs sm:text-sm max-w-2xl">
            Gestion unifiée des 6 pôles, pilotage du pipeline commercial, suivi terrain et copilote d'intelligence artificielle Gemini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Subtle Refresh Trigger */}
          <button
            onClick={() => refreshDashboardData()}
            disabled={isDataFetching}
            className="bg-white/5 hover:bg-white/10 text-rk-text-secondary hover:text-white border border-rk-line px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
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
            onClick={() => {
              // Le bouton doit déclencher la génération, pas seulement changer
              // d'onglet : c'était un simple `onSelectTab('copilot')`, ce qui
              // ouvrait un copilote vide et donnait l'impression d'un bug.
              requestCopilotTask('rapport');
              onSelectTab('copilot');
            }}
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Générer un Rapport IA (1 clic)</span>
          </button>

          <button
            onClick={() => onSelectTab('leads')}
            className="bg-white/10 hover:bg-white/15 text-white border border-rk-line-strong px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
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
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectTab('leads')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectTab('leads');
              }
            }}
            title="Ouvrir le CRM & Devis"
            className="rk-interactive bg-rk-panel border border-rk-line rounded-2xl p-5 space-y-3 cursor-pointer hover:border-blue-500/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-rk-muted">Pipeline Commercial</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-serif text-3xl font-bold text-white">{totalLeads} Prospects</div>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="text-emerald-400 font-mono font-semibold">{newLeads} nouveaux</span>
                <span className="text-rk-muted">•</span>
                <span className="text-amber-400 font-mono">{convertedLeads} convertis</span>
              </div>
            </div>
            <div className="pt-2 border-t border-rk-line-soft flex items-center justify-between text-xs font-mono text-rk-muted">
              <span>Taux de conversion : {totalLeads ? Math.round((convertedLeads / totalLeads) * 100) : 0}%</span>
              <button onClick={() => onSelectTab('leads')} className="text-blue-400 hover:underline">Voir &rarr;</button>
            </div>
          </div>

          {/* Card 2: Chiffre d'affaires réel */}
          <div className="rk-interactive bg-rk-panel border border-rk-line rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-rk-muted">Volume Facturé Consolidé</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-serif text-3xl font-bold text-emerald-400">
                {chiffreAffairesReel > 0 ? formatFcfa(chiffreAffairesReel) : '0 FCFA'}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-rk-text-secondary">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  {factures.length === 0
                    ? 'Aucune facture enregistrée'
                    : `${factures.length} facture${factures.length > 1 ? 's' : ''} • ${devisEnCours.length} devis`}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-rk-line-soft text-xs font-mono text-rk-muted">
              {factures.length === 0
                ? 'Le total se calcule dès la première facture'
                : `Facturé : ${formatFcfa(totalValide)} • Payé : ${formatFcfa(totalPaye)} • Acomptes : ${formatFcfa(totalAcomptes)} • Reste à encaisser : ${formatFcfa(totalRestant)}`}
            </div>
          </div>

          {/* Card 3: Sorties terrain réelles */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectTab('projects')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectTab('projects');
              }
            }}
            title="Ouvrir la production & validation BAT"
            className="rk-interactive bg-rk-panel border border-rk-line rounded-2xl p-5 space-y-3 cursor-pointer hover:border-amber-500/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-rk-muted">Sorties Terrain</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-serif text-3xl font-bold text-amber-300">
                {sortiesEffectuees} / {sortiesTotal}
              </div>
              <div className="text-xs text-rk-text-secondary mt-1">
                {sortiesTotal === 0 ? 'Aucune sortie planifiée' : 'Sorties réalisées'}
              </div>
            </div>
            <div className="pt-2 border-t border-rk-line-soft flex items-center justify-between text-xs font-mono text-rk-muted">
              <span className="truncate">
                {prochaineSortie
                  ? `Prochaine : ${(prochaineSortie as any).date || 'à planifier'}`
                  : 'Rien de planifié'}
              </span>
              <button onClick={() => onSelectTab('projects')} className="text-amber-400 hover:underline shrink-0">
                Voir &rarr;
              </button>
            </div>
          </div>

          {/* Card 4: Tâches & Santé Pôles */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectTab('tasks')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectTab('tasks');
              }
            }}
            title="Ouvrir le tableau Kanban"
            className="rk-interactive bg-rk-panel border border-rk-line rounded-2xl p-5 space-y-3 cursor-pointer hover:border-purple-500/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-rk-muted">Tâches & Pôles</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-serif text-3xl font-bold text-white">{completedTasks} / {totalTasks}</div>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="text-rk-text-secondary font-mono">Tâches complétées</span>
                {urgentTasks > 0 && (
                  <span className="text-rose-400 font-mono text-xs bg-rose-500/15 px-1.5 py-0.5 rounded">
                    {urgentTasks} urgentes
                  </span>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-rk-line-soft flex items-center justify-between text-xs font-mono text-rk-muted">
              <span>
                {totalTasks === 0
                  ? 'Aucune tâche'
                  : urgentTasks > 0
                  ? `Attention : ${urgentTasks} urgente${urgentTasks > 1 ? 's' : ''}`
                  : 'Aucune tâche urgente'}
              </span>
              <button onClick={() => onSelectTab('tasks')} className="text-purple-400 hover:underline">Gérer &rarr;</button>
            </div>
          </div>
        </div>
      )}

      {/* Production Projects Quick Strip (or Skeleton Loader during fetch) */}
      {isDataFetching ? (
        <ProjectStripSkeleton />
      ) : (
        <div className="bg-rk-panel border border-rk-line rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-rk-line pb-3">
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
                  className="p-4 rounded-2xl bg-rk-bg border border-rk-line-soft hover:border-emerald-500/40 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-white text-xs sm:text-sm">{prj.client_name}</div>
                      <div className="text-xs text-rk-muted font-mono">{prj.client_code || prj.id} • Pôle {prj.pole}</div>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{pct}%</span>
                  </div>

                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-rk-muted font-mono pt-1">
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
            <div className="bg-rk-panel border border-rk-line rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-rk-line pb-4">
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
                    className="p-4 rounded-xl bg-rk-bg border border-rk-line-soft hover:border-rk-line-strong transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{l.name}</span>
                        <span className="text-xs font-mono text-rk-muted bg-white/5 px-2 py-0.5 rounded">
                          {l.country || 'Cameroun'}
                        </span>
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                          l.statut === 'nouveau' ? 'bg-emerald-500/20 text-emerald-300' :
                          l.statut === 'contacte' ? 'bg-blue-500/20 text-blue-300' :
                          l.statut === 'converti' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-slate-700 text-rk-text-secondary'
                        }`}>
                          {l.statut.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-rk-text-secondary">
                        {l.project_type}
                      </div>
                      <div className="text-xs text-rk-muted font-mono">
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
            <div className="bg-rk-panel border border-rk-line rounded-3xl p-6 space-y-4">
              <h3 className="font-serif text-lg font-bold text-white flex items-center justify-between">
                <span>Performance des 6 Pôles</span>
                <span className="text-xs font-mono text-rk-muted font-normal">Équipe Arckaton</span>
              </h3>

              <div className="space-y-2.5">
                {(['Direction', 'Tech', 'Creatif', 'Digital', 'Client', 'Externe'] as const).map((pole) => {
                  const info = POLES_INFO[pole];
                  // Responsable issu de l'annuaire réel des membres.
                  const responsable = osMembers.find((m) => m.pole === pole)?.name;
                  const poleTasks = tasks.filter(t => t.pole === pole);
                  const doneCount = poleTasks.filter(t => t.status === 'termine').length;
                  const total = poleTasks.length;
                  const percent = total ? Math.round((doneCount / total) * 100) : 100;

                  return (
                    <div key={pole} className="p-2.5 rounded-xl bg-rk-bg border border-rk-line-soft space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{info.name}</span>
                          {responsable && (
                            <span className="text-xs text-rk-muted font-mono">({responsable})</span>
                          )}
                        </div>
                        <span className="font-mono text-xs text-emerald-400">{percent}% tâches</span>
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
            <p className="text-xs text-rk-text-secondary leading-relaxed">
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
