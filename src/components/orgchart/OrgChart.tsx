import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { POSTES_DATA } from '../../data/mockData';
import { Poste, Pole, POLE_COLORS, DataTransferEvent } from '../../types';
import { 
  Users, 
  Briefcase, 
  Layers, 
  Activity, 
  CheckCircle2, 
  Clock, 
  UserPlus, 
  X, 
  Filter, 
  Sparkles,
  Info,
  Radio,
  Send,
  Zap,
  ArrowRight,
  Shield,
  Cpu,
  RefreshCw,
  Terminal,
  Network,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DATA_TYPE_LABELS: Record<DataTransferEvent['data_type'], string> = {
  specs_tech: 'Spécifications techniques',
  ordre_terrain: 'Ordre de mission terrain',
  webhook_momo: 'Webhook paiement (MoMo / Orange Money)',
  bat_validation: 'Validation jalon & BAT client',
  rapport_perf: 'Rapport performance / ROI',
  patch_offline: 'Patch moteur offline',
  securite: 'Sécurité & audit',
};

// ── Éléments de lecture de l'organigramme ──────────────────────────────

const NIVEAU_TONES = {
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
} as const;

const PhaseTag: React.FC<{ phase: number; compact?: boolean }> = ({ phase, compact }) => (
  <span
    className={`font-mono uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded shrink-0 ${
      compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'
    }`}
  >
    Phase {phase}
  </span>
);

const NiveauBadge: React.FC<{
  niveau: 0 | 1 | 2 | 3;
  libelle: string;
  detail: string;
  tone: keyof typeof NIVEAU_TONES;
}> = ({ niveau, libelle, detail, tone }) => (
  <div className="text-center mb-6">
    <span
      className={`inline-block text-[11px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border ${NIVEAU_TONES[tone]}`}
    >
      Niveau {niveau} • {libelle}
    </span>
    <p className="text-[11px] text-slate-400 mt-1.5">{detail}</p>
  </div>
);

const Connecteur: React.FC = () => (
  <div className="w-full flex justify-center my-6 relative z-0" aria-hidden="true">
    <div className="w-0.5 h-12 bg-gradient-to-b from-emerald-400 via-blue-400 to-indigo-500 relative">
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-300 shadow-md shadow-emerald-400" />
    </div>
  </div>
);

const CompteurHud: React.FC<{
  libelle: string;
  valeur: string;
  accent?: 'amber' | 'emerald' | 'blue';
}> = ({ libelle, valeur, accent }) => {
  const couleur =
    accent === 'amber'
      ? 'text-amber-600'
      : accent === 'emerald'
        ? 'text-emerald-600'
        : accent === 'blue'
          ? 'text-blue-600'
          : 'text-slate-900';
  return (
    <div className="bg-white border border-slate-200 p-3.5 rounded-xl">
      <div className="text-xs text-slate-500">{libelle}</div>
      <div className={`text-xl font-semibold mt-1 ${couleur}`}>{valeur}</div>
    </div>
  );
};

export const OrgChart: React.FC = () => {
  const { dataTransfers, tasks, osMembers } = useApp();

  const [viewMode, setViewMode] = useState<'nodal' | 'matrix'>('nodal');
  const [selectedPole, setSelectedPole] = useState<Pole | 'all'>('all');
  const [selectedPhase, setSelectedPhase] = useState<number | 'all'>('all');
  const [activePoste, setActivePoste] = useState<Poste | null>(null);

  // Console de consultation des echanges (lecture seule, alimentee automatiquement)
  const [isConsole, setIsConsole] = useState(false);
  const [consoleFilter, setConsoleFilter] = useState<string>('');
  const [expandedFlow, setExpandedFlow] = useState<string | null>(null);

  const [postesState, setPostes] = useState<Poste[]>(POSTES_DATA);

  // Les postes décrivent des fonctions, pas des personnes. Le titulaire
  // affiché est résolu depuis l'annuaire réel : un poste sans membre
  // enregistré apparaît « Vacant », jamais avec un nom d'une autre équipe.
  const postes = useMemo(
    () =>
      postesState.map((p) => {
        const membre =
          osMembers.find((m) => m.poste_titre && m.poste_titre === p.titre) ||
          osMembers.find((m) => m.pole === p.pole);
        return { ...p, titulaire: membre?.name || 'Vacant' };
      }),
    [postesState, osMembers]
  );

  // ── Groupement hiérarchique ───────────────────────────────────────────
  // Les niveaux viennent des données (champ `niveau`), pas d'une liste
  // d'identifiants en dur. La liste précédente plaçait le Vidéaste au
  // niveau 0 à côté du Chef d'Agence, le Graphiste au niveau 1 avec les
  // directeurs, et faisait tomber le Directeur Commercial au niveau 2.
  const parNiveau = (n: 0 | 1 | 2 | 3) => postes.filter((p) => p.niveau === n);
  const directionPostes = parNiveau(0);
  const directeursPostes = parNiveau(1);
  const equipePostes = parNiveau(2);
  const reseauPostes = parNiveau(3);

  // L'équipe opérationnelle est présentée par pôle, comme dans le plan de
  // croissance de l'agence. Le rattachement affiché est déduit de `parentId`
  // poste par poste, et non du pôle : certains postes d'un même pôle relèvent
  // de deux directeurs différents (le SEO et Ads dépend du commercial, pas du
  // directeur créatif), et un en-tête de colonne unique aurait été faux.
  const EQUIPE_COLONNES: Array<{ pole: Pole; libelle: string }> = [
    { pole: 'Creatif', libelle: 'Pôle Créatif' },
    { pole: 'Digital', libelle: 'Pôle Digital' },
    { pole: 'Tech', libelle: 'Pôle Tech' },
    { pole: 'Client', libelle: 'Pôle Client & Admin' },
  ];

  const colonnesEquipe = useMemo(
    () =>
      EQUIPE_COLONNES.map((col) => {
        const postes = equipePostes
          .filter((p) => p.pole === col.pole)
          .sort((a, b) => a.ordre - b.ordre);
        // Directeurs réellement cités par les postes de la colonne.
        const directeurs = Array.from(
          new Set(
            postes
              .map((p) => directeursPostes.find((d) => d.id === p.parentId)?.titre)
              .filter(Boolean) as string[]
          )
        );
        return { ...col, postes, directeurs };
      }).filter((col) => col.postes.length > 0),
    [equipePostes, directeursPostes]
  );

  // Un poste dont le pôle n'est pas encore cartographié reste visible plutôt
  // que de disparaître de l'organigramme.
  const orphelins = equipePostes.filter(
    (p) => !colonnesEquipe.some((col) => col.postes.some((cp) => cp.id === p.id))
  );

  const getPosteTasks = (titulaire?: string) => {
    if (!titulaire || titulaire === 'Vacant') return [];
    return tasks.filter(t => t.assignee_name && (titulaire.includes(t.assignee_name) || t.assignee_name.includes(titulaire)));
  };

  const pourvusCount = postes.filter(p => p.titulaire !== 'Vacant').length;
  const ouvertsCount = postes.filter(p => p.titulaire === 'Vacant').length;

  // Filtres de la console : recherche sur emetteur, destinataire, type et contenu
  const filteredFlows = dataTransfers.filter((f) => {
    const q = consoleFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      f.from_member_name.toLowerCase().includes(q) ||
      f.to_member_name.toLowerCase().includes(q) ||
      f.payload_summary.toLowerCase().includes(q) ||
      (DATA_TYPE_LABELS[f.data_type] || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Cyber Header & Telemetry Summary */}
      <div className="bg-[#0b1329] border border-white/10 p-6 sm:p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/[0.05] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-medium mb-3">
              <Network className="w-3.5 h-3.5 text-emerald-600" />
              <span>Structure de l'agence</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Organigramme
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Quatre niveaux : la direction générale, les directeurs de pôle, les équipes
              opérationnelles et le réseau de freelances. Chaque poste affiche le membre
              qui l'occupe, ou « Vacant » si personne ne le pourvoit encore.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="bg-[#060a14] border border-white/10 p-1 rounded-xl flex items-center gap-1">
              <button
                onClick={() => setViewMode('nodal')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                  viewMode === 'nodal'
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Network className="w-4 h-4" />
                <span>Organigramme</span>
              </button>
              <button
                onClick={() => setViewMode('matrix')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Matrice des postes</span>
              </button>
            </div>

            {/* Journal des échanges */}
            <button
              onClick={() => setIsConsole(true)}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
            >
              <Terminal className="w-4 h-4" />
              <span>Journal des échanges</span>
            </button>
          </div>
        </div>

        {/* Compteurs : uniquement des valeurs réellement calculées */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/[0.08]">
          <CompteurHud libelle="Postes pourvus" valeur={`${pourvusCount} / ${postes.length}`} />
          <CompteurHud libelle="Postes vacants" valeur={String(ouvertsCount)} accent="amber" />
          <CompteurHud libelle="Échanges tracés" valeur={String(dataTransfers.length)} accent="emerald" />
          <CompteurHud libelle="Membres à l'annuaire" valeur={String(osMembers.length)} accent="blue" />
        </div>
      </div>

      {/* VIEW MODE 1 : NODAL CYBER-TREE */}
      {viewMode === 'nodal' && (
        <div className="space-y-6">
          
          {/* Main Visual Hierarchy Canvas */}
          <div className="bg-[#090f21] border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-blueprint-grid opacity-20 pointer-events-none" />

            <NiveauBadge
              niveau={0}
              libelle="Direction générale"
              detail="Pilotage stratégique, commercial et financier"
              tone="emerald"
            />

            {/* NIVEAU 0 — direction générale */}
            <div className="flex flex-wrap justify-center gap-6 relative z-10">
              {directionPostes.map((p) => (
                <motion.button
                  key={p.id}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setActivePoste(p)}
                  className="w-full sm:w-80 text-left bg-[#0d1733] border-2 border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-5 cursor-pointer shadow-lg shadow-emerald-500/5 transition-all relative group"
                >
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <span className="text-[11px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-bold shrink-0">
                      Direction
                    </span>
                    <PhaseTag phase={p.phase} />
                  </div>

                  <div className="text-xs font-mono text-slate-400">{p.titre}</div>
                  <div className="text-lg font-serif font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {p.titulaire}
                  </div>
                  <p className="text-xs text-slate-300 mt-2 font-light leading-relaxed">
                    {p.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Charge : {p.charge_estimee}</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      Détails <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>

            <Connecteur />

            <NiveauBadge
              niveau={1}
              libelle="Direction opérationnelle"
              detail="Trois directrices, un par grande fonction"
              tone="blue"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
              {directeursPostes.map((p) => {
                const colors = POLE_COLORS[p.pole];
                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setActivePoste(p)}
                    className="text-left bg-[#0b1329] border border-white/15 hover:border-blue-400/60 rounded-2xl p-4 cursor-pointer transition-all relative group"
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded border ${colors.bg} ${colors.border} ${colors.text}`}>
                        {p.pole}
                      </span>
                      <PhaseTag phase={p.phase} />
                    </div>

                    <div className="text-xs font-mono text-slate-400">{p.titre}</div>
                    <div className="text-base font-serif font-bold text-white group-hover:text-blue-300 transition-colors">
                      {p.titulaire}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Charge : {p.charge_estimee}</span>
                      <span className="text-slate-300 group-hover:text-white">Détails →</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <Connecteur />

            <NiveauBadge
              niveau={2}
              libelle="Équipes opérationnelles"
              detail="Les postes rattachés à chaque directeur de pôle"
              tone="purple"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 relative z-10">
              {colonnesEquipe.map((col) => {
                const colors = POLE_COLORS[col.pole];
                return (
                  <div key={col.pole} className="flex flex-col gap-3">
                    <div className="text-center">
                      <span className={`inline-block text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${colors.bg} ${colors.border} ${colors.text}`}>
                        {col.libelle}
                      </span>
                      {col.directeurs.length > 0 && (
                        <div className="text-[10px] text-slate-500 mt-1.5">
                          Rattaché à {col.directeurs.join(' et ')}
                        </div>
                      )}
                    </div>

                    {col.postes.map((p) => {
                      const isOpen = p.statut_recrutement === 'recrutement_ouvert';
                      return (
                        <motion.button
                          key={p.id}
                          type="button"
                          whileHover={{ scale: 1.01 }}
                          onClick={() => setActivePoste(p)}
                          className={`text-left rounded-xl p-3.5 border cursor-pointer transition-all ${
                            isOpen
                              ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-400'
                              : 'bg-[#080d1e] border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5 gap-2">
                            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${colors.bg} ${colors.border} ${colors.text}`}>
                              {p.pole}
                            </span>
                            <PhaseTag phase={p.phase} compact />
                          </div>
                          <div className="text-xs font-semibold text-white">{p.titre}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {p.titulaire}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Postes de niveau 2 dont le pôle n'est pas encore cartographié :
                ils restent visibles plutôt que de disparaître. */}
            {orphelins.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {orphelins.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePoste(p)}
                    className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-[#080d1e] border border-white/10 text-slate-300 hover:border-white/25"
                  >
                    {p.titre}
                  </button>
                ))}
              </div>
            )}

            <Connecteur />

            <NiveauBadge
              niveau={3}
              libelle="Réseau freelances et partenaires"
              detail="Collaborateurs ponctuels, hors effectif interne"
              tone="amber"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 relative z-10">
              {reseauPostes.map((p) => (
                <motion.button
                  key={p.id}
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setActivePoste(p)}
                  className="text-left rounded-xl p-3.5 border border-dashed border-white/20 bg-transparent hover:border-white/35 cursor-pointer transition-all"
                >
                  <div className="text-xs font-semibold text-white">{p.titre}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{p.titulaire}</div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed line-clamp-3">
                    {p.description}
                  </p>
                </motion.button>
              ))}
            </div>

          </div>

          {/* TELEMETRY FEED : LAST DATA TRANSFERS TRACER */}
          <div className="bg-[#0b1329] border border-white/10 rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Traçabilité Temps Réel des Échanges Internes</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-white">
                  Télémétrie des Flux & Transferts de Données Inter-Membres
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.08] self-start sm:self-auto">
                {dataTransfers.length} paquets archivés
              </span>
            </div>

            <div className="space-y-2.5">
              {dataTransfers.map((dt) => {
                const poleColor = POLE_COLORS[dt.pole];
                return (
                  <div
                    key={dt.id}
                    className="bg-[#070c1e] border border-white/[0.06] hover:border-white/[0.14] rounded-2xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl border ${poleColor.bg} ${poleColor.border} text-emerald-400 flex-shrink-0 mt-0.5`}>
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white">{dt.from_member_name}</span>
                          <span className="text-slate-400 font-mono">({dt.from_role})</span>
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-bold text-white">{dt.to_member_name}</span>
                          <span className="text-slate-400 font-mono">({dt.to_role})</span>
                        </div>
                        <p className="text-slate-300 mt-1 font-light leading-relaxed">
                          {dt.payload_summary}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto flex-shrink-0 font-mono text-[11px]">
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                        {dt.clearance_level}
                      </span>
                      <span className="text-slate-400">{dt.timestamp}</span>
                      <span className="text-slate-400 hidden lg:inline" title="Empreinte de contrôle : permet de repérer une modification de l'entrée, ce n'est pas un chiffrement.">
                        {dt.hash || 'empreinte en cours'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* VIEW MODE 2 : MATRIX & 4 PHASES VIEW */}
      {viewMode === 'matrix' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-[#0b1329] border border-white/10 p-4 rounded-2xl space-y-4">
            <div>
              <span className="text-[11px] font-mono text-slate-400 block mb-2">Filtrer par Phase de Croissance :</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedPhase('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                    selectedPhase === 'all'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-[#070c1e] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  Toutes les Phases (17)
                </button>
                {[1, 2, 3, 4].map((ph) => (
                  <button
                    key={ph}
                    onClick={() => setSelectedPhase(ph)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                      selectedPhase === ph
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-[#070c1e] text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    Phase {ph}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid of Postes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {postes
              .filter(p => selectedPhase === 'all' || p.phase === selectedPhase)
              .map((p) => {
                const colors = POLE_COLORS[p.pole];
                return (
                  <div
                    key={p.id}
                    onClick={() => setActivePoste(p)}
                    className="bg-[#0b1329] border border-white/10 hover:border-white/25 rounded-2xl p-5 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded border ${colors.bg} ${colors.border} ${colors.text}`}>
                        {p.pole}
                      </span>
                      <span className="text-xs font-mono text-slate-400">Phase {p.phase}</span>
                    </div>
                    <h4 className="font-serif text-lg font-bold text-white">{p.titre}</h4>
                    <div className="text-xs font-mono text-emerald-400 mt-1">{p.titulaire}</div>
                    <p className="text-xs text-slate-300 mt-2 font-light line-clamp-2">{p.description}</p>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* MODAL 1 : NODE DETAIL INSPECTOR */}
      <AnimatePresence>
        {activePoste && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0d1633] border border-white/15 rounded-3xl max-w-xl w-full p-6 sm:p-8 relative shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <button
                onClick={() => setActivePoste(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-2"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-mono uppercase px-2.5 py-0.5 rounded border ${POLE_COLORS[activePoste.pole].bg} ${POLE_COLORS[activePoste.pole].border} ${POLE_COLORS[activePoste.pole].text}`}>
                  {activePoste.pole}
                </span>
                <span className="text-xs font-mono text-slate-400">Phase {activePoste.phase}</span>
              </div>

              <h3 className="font-serif text-2xl font-bold text-white">{activePoste.titre}</h3>
              <div className="text-sm font-mono text-emerald-400 mt-1">Titulaire : {activePoste.titulaire}</div>

              <div className="mt-4 p-4 rounded-2xl bg-[#080d1e] border border-white/[0.06] text-xs text-slate-300 font-light leading-relaxed">
                {activePoste.description}
              </div>

              {/* Tasks currently assigned */}
              <div className="mt-6">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
                  Tâches actives sur Arckaton OS :
                </div>
                {getPosteTasks(activePoste.titulaire).length > 0 ? (
                  <div className="space-y-2">
                    {getPosteTasks(activePoste.titulaire).map((t) => (
                      <div key={t.id} className="bg-[#080d1e] border border-white/[0.06] p-3 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-white font-medium">{t.titre || t.title}</span>
                        <span className="text-[11px] font-mono text-emerald-400 uppercase">{t.statut || t.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs font-mono text-slate-400 bg-[#080d1e] p-3 rounded-xl">
                    Aucune tâche bloquante en cours pour ce membre.
                  </div>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">Charge CPU estimée : {activePoste.charge_estimee}</span>
                <button
                  onClick={() => {
                    setConsoleFilter(activePoste.titulaire || '');
                    setActivePoste(null);
                    setIsConsole(true);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Lui transmettre des données</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONSOLE DES ECHANGES : lecture seule, alimentee automatiquement */}
      <AnimatePresence>
        {isConsole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b1329] border border-blue-500/30 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 p-6 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-mono mb-1.5">
                    <Terminal className="w-4 h-4" />
                    <span>Journal automatique des échanges inter-membres</span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-white">
                    Console de consultation des flux
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Chaque tâche transmise, message échangé, jalon validé ou retour client crée automatiquement
                    un fil. Cliquez sur un fil pour lire le contenu de l'échange.
                  </p>
                </div>
                <button
                  onClick={() => setIsConsole(false)}
                  className="shrink-0 text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/10"
                  aria-label="Fermer la console"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-3 border-b border-white/10 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono text-slate-300 uppercase">Filtrer par membre</span>
                <input
                  value={consoleFilter}
                  onChange={(e) => setConsoleFilter(e.target.value)}
                  placeholder="Nom du membre…"
                  className="flex-1 min-w-[160px] bg-[#070c1e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-400"
                />
                {consoleFilter && (
                  <button
                    onClick={() => setConsoleFilter('')}
                    className="text-[11px] text-slate-300 hover:text-white underline"
                  >
                    Réinitialiser
                  </button>
                )}
                <span className="text-[11px] font-mono text-slate-300 ml-auto">
                  {filteredFlows.length} fil(s)
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {filteredFlows.length === 0 ? (
                  <div className="text-center py-14 text-slate-300 space-y-2">
                    <Share2 className="w-8 h-8 mx-auto opacity-50 text-blue-400" />
                    <p className="text-xs">
                      Aucun échange enregistré pour l'instant.
                    </p>
                    <p className="text-[11px]">
                      Assignez une tâche à un membre ou envoyez un message : le fil apparaîtra ici automatiquement.
                    </p>
                  </div>
                ) : (
                  filteredFlows.map((f) => {
                    const isOpen = expandedFlow === f.id;
                    return (
                      <div
                        key={f.id}
                        className={`rounded-2xl border transition-colors ${
                          isOpen ? 'border-blue-400/50 bg-[#0e1a3d]' : 'border-white/10 bg-[#070d1e] hover:border-white/20'
                        }`}
                      >
                        <button
                          onClick={() => setExpandedFlow(isOpen ? null : f.id)}
                          className="w-full text-left px-4 py-3 flex items-center gap-3 cursor-pointer"
                        >
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              f.status === 'verifie' ? 'bg-emerald-400' : f.status === 'livre' ? 'bg-blue-400' : 'bg-amber-400'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-white font-semibold truncate">
                              {f.from_member_name}
                              <span className="text-slate-300 font-normal"> → </span>
                              {f.to_member_name}
                            </div>
                            <div className="text-[11px] text-slate-300 font-mono truncate">
                              {DATA_TYPE_LABELS[f.data_type] || f.data_type} • {f.timestamp}
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-slate-300 flex-shrink-0 hidden sm:block">
                            {isOpen ? 'Réduire' : 'Lire'}
                          </span>
                        </button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/10">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                                  <div className="bg-black/25 rounded-lg px-3 py-2">
                                    <div className="text-slate-400">Émetteur</div>
                                    <div className="text-white">{f.from_member_name} — {f.from_role}</div>
                                  </div>
                                  <div className="bg-black/25 rounded-lg px-3 py-2">
                                    <div className="text-slate-400">Destinataire</div>
                                    <div className="text-white">{f.to_member_name} — {f.to_role}</div>
                                  </div>
                                </div>
                                <div className="bg-[#060a16] rounded-lg px-3.5 py-3 border border-white/10">
                                  <div className="text-[11px] font-mono text-slate-400 mb-1">Contenu de l'échange</div>
                                  <p className="text-xs text-slate-100 leading-relaxed whitespace-pre-wrap">
                                    {f.payload_summary}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
                                  <span>Pôle : {f.pole}</span>
                                  <span title="Empreinte de contrôle : permet de repérer une modification de l'entrée, ce n'est pas un chiffrement.">
                                    {f.hash || 'empreinte en cours'}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-300">
                  Journal local à l'appareil, alimenté par les actions réelles des membres.
                </p>
                <button
                  onClick={() => setIsConsole(false)}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
