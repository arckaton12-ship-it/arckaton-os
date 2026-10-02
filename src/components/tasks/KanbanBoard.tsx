import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Task, TaskStatus, TaskPriority, Pole, POLE_COLORS } from '../../types';
import {
  Plus,
  Clock,
  User,
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  Bell,
  Briefcase,
  GripVertical,
  Users,
  FilterX
} from 'lucide-react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
const COLUMNS: Array<{ id: TaskStatus; title: string; color: string; badge: string; dot: string }> = [
  { id: 'a_faire', title: 'À Faire', color: 'border-slate-600', badge: 'bg-slate-700 text-slate-300', dot: 'bg-slate-500' },
  { id: 'en_cours', title: 'En Cours', color: 'border-blue-500/50', badge: 'bg-blue-500/20 text-blue-300', dot: 'bg-blue-500' },
  { id: 'revue', title: 'En Revue / Test', color: 'border-amber-500/50', badge: 'bg-amber-500/20 text-amber-300', dot: 'bg-amber-500' },
  { id: 'termine', title: 'Terminé & Livré', color: 'border-emerald-500/50', badge: 'bg-emerald-500/20 text-emerald-300', dot: 'bg-emerald-500' }
];

const ALL_POLES: Pole[] = ['Direction', 'Tech', 'Creatif', 'Digital', 'Client', 'Externe'];

/** YYYY-MM-DD attendu par <input type="date"> à partir d'une date ISO. */
const todayISO = () => new Date().toISOString().slice(0, 10);

export const KanbanBoard: React.FC = () => {
  const { tasks, addTask, updateTaskStatus, remindTask, osMembers, projets } = useApp();

  const [selectedPole, setSelectedPole] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dialogRef = useDialogA11y<HTMLDivElement>(isModalOpen, () => setIsModalOpen(false));
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  // Formulaire de création
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [pole, setPole] = useState<Pole>('Tech');
  const [priorite, setPriorite] = useState<TaskPriority>('normale');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [dateEcheance, setDateEcheance] = useState(todayISO());

  const statusOf = (t: Task): TaskStatus => t.statut || t.status || 'a_faire';
  const titreOf = (t: Task) => t.titre || t.title || 'Tâche sans titre';
  const prioriteOf = (t: Task) => t.priorite || t.priority || 'normale';
  const assigneeOf = (t: Task) => t.assignee_name || t.assigned_to || '';
  const echeanceOf = (t: Task) => t.date_echeance || t.due_date || '';

  const isOverdue = (t: Task) =>
    statusOf(t) !== 'termine' && !!echeanceOf(t) && echeanceOf(t).slice(0, 10) < todayISO();

  /** Charge de travail par membre : c'est la vue de pilotage de la direction. */
  const workload = useMemo(() => {
    const map = new Map<string, { name: string; pole: Pole; ouvertes: number; enRetard: number; total: number }>();
    tasks.forEach((t) => {
      const name = assigneeOf(t);
      if (!name) return;
      const entry = map.get(name) || { name, pole: t.pole, ouvertes: 0, enRetard: 0, total: 0 };
      entry.total += 1;
      if (statusOf(t) !== 'termine') {
        entry.ouvertes += 1;
        if (isOverdue(t)) entry.enRetard += 1;
      }
      map.set(name, entry);
    });
    return [...map.values()].sort((a, b) => b.ouvertes - a.ouvertes || b.total - a.total);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (selectedPole !== 'all' && t.pole !== selectedPole) return false;
      if (selectedMember !== 'all' && assigneeOf(t) !== selectedMember) return false;
      if (selectedProject !== 'all' && String(t.project_id || '') !== selectedProject) return false;
      if (q && !`${titreOf(t)} ${t.description || ''} ${t.project_name || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, selectedPole, selectedMember, selectedProject, search]);

  const openCount = filteredTasks.filter((t) => statusOf(t) !== 'termine').length;
  const lateCount = filteredTasks.filter(isOverdue).length;
  const unassignedCount = filteredTasks.filter((t) => !assigneeOf(t) && statusOf(t) !== 'termine').length;
  const hasFilters = selectedPole !== 'all' || selectedMember !== 'all' || selectedProject !== 'all' || !!search.trim();

  const resetFilters = () => {
    setSelectedPole('all');
    setSelectedMember('all');
    setSelectedProject('all');
    setSearch('');
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) return;

    const member = osMembers.find((m) => m.id === assigneeId);
    const project = projets.find((p) => p.id === projectId);

    addTask({
      titre,
      title: titre,
      description,
      statut: 'a_faire',
      status: 'a_faire',
      priorite,
      priority: priorite,
      pole: project?.pole || pole,
      assignee_id: member?.id,
      assignee_name: member?.name || '',
      assigned_to: member?.name || '',
      poste_titre: member?.poste_titre || member?.role || null,
      project_id: project?.id,
      project_code: project?.client_code,
      project_name: project?.name,
      date_echeance: dateEcheance || undefined,
      due_date: dateEcheance || undefined
    } as any);

    setTitre('');
    setDescription('');
    setIsModalOpen(false);
  };

  const nextStatus = (curr: TaskStatus): TaskStatus | null =>
    curr === 'a_faire' ? 'en_cours' : curr === 'en_cours' ? 'revue' : curr === 'revue' ? 'termine' : null;
  const prevStatus = (curr: TaskStatus): TaskStatus | null =>
    curr === 'termine' ? 'revue' : curr === 'revue' ? 'en_cours' : curr === 'en_cours' ? 'a_faire' : null;

  const onDrop = (target: TaskStatus) => {
    setDragOver(null);
    const raw = window.localStorage.getItem('arckaton_kanban_drag');
    if (!raw) return;
    window.localStorage.removeItem('arckaton_kanban_drag');
    try {
      const { id, from } = JSON.parse(raw) as { id: string; from: TaskStatus };
      if (from === target) return;
      updateTaskStatus(id, target);
    } catch {
      /* donnée de drag corrompue : on ignore */
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête */}
      <div className="bg-rk-panel border border-rk-line p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 flex-wrap">
            <span>Tableau Kanban des Tâches</span>
            <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
              {openCount} en cours / {filteredTasks.length} au total
            </span>
            {lateCount > 0 && (
              <span className="text-xs font-mono text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                {lateCount} en retard
              </span>
            )}
            {unassignedCount > 0 && (
              <span className="text-xs font-mono text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                {unassignedCount} sans responsable
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Glissez une carte d'une colonne à l'autre, ou utilisez les flèches. La charge par membre
            ci-dessous sert à répartir le travail de toute l'agence.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Créer une Tâche</span>
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-rk-panel border border-rk-line rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une tâche, un livrable, un projet…"
              className="w-full bg-rk-bg border border-rk-line rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
            />
          </div>

          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="bg-rk-bg border border-rk-line rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="all">Tous les membres</option>
            {workload.map((w) => (
              <option key={w.name} value={w.name}>
                {w.name} ({w.ouvertes} ouvertes{w.enRetard ? `, ${w.enRetard} en retard` : ''})
              </option>
            ))}
          </select>

          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-rk-bg border border-rk-line rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="all">Tous les projets</option>
            {projets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {['all', ...ALL_POLES].map((p) => {
            const c = p === 'all' ? null : POLE_COLORS[p as Pole];
            return (
              <button
                key={p}
                onClick={() => setSelectedPole(p)}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  selectedPole === p
                    ? c
                      ? `${c.bg} ${c.text} font-bold border ${c.border}`
                      : 'bg-white text-slate-950 font-bold'
                    : 'bg-rk-panel text-slate-400 hover:text-white border border-rk-line-soft'
                }`}
              >
                {p === 'all' ? 'Tous les Pôles' : p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Charge par membre */}
      <div className="bg-rk-panel border border-rk-line rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-400" />
          <h3 className="font-serif text-sm font-bold text-white">Charge de travail par membre</h3>
          <span className="text-[11px] font-mono text-slate-500">
            {workload.length} membre{workload.length > 1 ? 's' : ''} sur des tâches
          </span>
        </div>
        {workload.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono">Aucune tâche assignée pour le moment.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
            {workload.map((w) => {
              const c = POLE_COLORS[w.pole] || POLE_COLORS.Tech;
              const max = Math.max(...workload.map((x) => x.total), 1);
              const pct = Math.round((w.total / max) * 100);
              return (
                <button
                  key={w.name}
                  onClick={() => setSelectedMember(selectedMember === w.name ? 'all' : w.name)}
                  title={`Filtrer sur ${w.name}`}
                  className={`text-left bg-rk-bg border rounded-xl p-3 transition-colors cursor-pointer ${
                    selectedMember === w.name ? 'border-blue-500/60' : 'border-rk-line-soft hover:border-rk-line-bold'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-white truncate">{w.name}</span>
                    <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${c.bg} ${c.text} shrink-0`}>
                      {w.pole}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-lg font-mono font-bold text-white leading-none">{w.ouvertes}</span>
                    <span className="text-[9px] font-mono text-slate-500">ouvertes</span>
                    {w.enRetard > 0 && (
                      <span className="text-[9px] font-mono text-rose-300 font-bold ml-auto">
                        {w.enRetard} en retard
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${w.enRetard > 0 ? 'bg-rose-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks
            .filter((t) => statusOf(t) === col.id)
            .sort((a, b) => {
              const order: Record<TaskPriority, number> = { urgente: 0, haute: 1, normale: 2, basse: 3 };
              const pa = order[prioriteOf(a) as TaskPriority] ?? 2;
              const pb = order[prioriteOf(b) as TaskPriority] ?? 2;
              if (pa !== pb) return pa - pb;
              return (echeanceOf(a) || '9999').localeCompare(echeanceOf(b) || '9999');
            });

          const isTarget = dragOver === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col.id);
              }}
              onDragLeave={() => setDragOver((d) => (d === col.id ? null : d))}
              onDrop={() => onDrop(col.id)}
              className={`bg-rk-chrome border rounded-2xl flex flex-col max-h-[calc(100vh-260px)] min-h-[400px] transition-colors ${
                isTarget ? 'border-blue-500/70 bg-blue-950/20' : 'border-rk-line'
              }`}
            >
              <div className={`p-3.5 border-b border-rk-line flex items-center justify-between border-t-2 ${col.color}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <h3 className="font-serif text-sm font-bold text-white">{col.title}</h3>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${col.badge}`}>{colTasks.length}</span>
                </div>
              </div>

              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {colTasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-mono">
                    {isTarget ? 'Déposez ici' : 'Aucune tâche'}
                  </div>
                ) : (
                  colTasks.map((t) => {
                    const poleColor = POLE_COLORS[t.pole] || POLE_COLORS.Tech;
                    const priority = prioriteOf(t);
                    const urgent = priority === 'urgente';
                    const late = isOverdue(t);
                    const prevSt = prevStatus(statusOf(t));
                    const nextSt = nextStatus(statusOf(t));

                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => {
                          window.localStorage.setItem(
                            'arckaton_kanban_drag',
                            JSON.stringify({ id: t.id, from: statusOf(t) })
                          );
                        }}
                        className={`bg-rk-panel border rounded-xl p-3.5 space-y-3 hover:border-rk-line-bold transition-all shadow-sm ${
                          urgent ? 'border-rose-500/40' : late ? 'border-amber-500/40' : 'border-rk-line-soft'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <GripVertical className="w-3 h-3 text-slate-600 shrink-0 cursor-grab" />
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${poleColor.bg} ${poleColor.text} ${poleColor.border}`}
                            >
                              {t.pole}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                              priority === 'urgente'
                                ? 'bg-rose-500/20 text-rose-300 font-bold'
                                : priority === 'haute'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {String(priority).toUpperCase()}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-serif text-xs font-bold text-white leading-snug">{titreOf(t)}</h4>
                          {t.description && (
                            <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                              {t.description}
                            </p>
                          )}
                        </div>

                        {t.project_name && (
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-1">
                            <Briefcase className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {t.project_code ? `${t.project_code} · ` : ''}
                              {t.project_name}
                            </span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-rk-line-soft flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <div
                            className={`flex items-center gap-1.5 truncate max-w-[130px] ${
                              assigneeOf(t) ? '' : 'text-amber-300/80'
                            }`}
                            title={assigneeOf(t) || 'Aucun responsable assigné'}
                          >
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">{assigneeOf(t) || 'Non assigné'}</span>
                          </div>

                          {echeanceOf(t) && (
                            <div
                              className={`flex items-center gap-1 shrink-0 ${late ? 'text-rose-300 font-bold' : 'text-amber-300'}`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{echeanceOf(t).slice(0, 10)}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-1 flex items-center justify-between gap-1">
                          <button
                            onClick={() => remindTask(t.id)}
                            title={
                              t.relances
                                ? `Déjà relancée ${t.relances} fois — relancer à nouveau`
                                : 'Relancer le membre assigné'
                            }
                            className="p-1 rounded bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 text-[11px] flex items-center gap-0.5 cursor-pointer"
                          >
                            <Bell className="w-3 h-3" />
                            <span className="hidden sm:inline">Relancer</span>
                            {!!t.relances && <span className="font-mono">{t.relances}</span>}
                          </button>

                          <div className="flex items-center gap-1 ml-auto">
                            {prevSt && (
                              <button
                                onClick={() => updateTaskStatus(t.id, prevSt)}
                                className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[11px] flex items-center gap-0.5 cursor-pointer"
                                title="Déplacer vers l'étape précédente"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                            )}
                            {nextSt && (
                              <button
                                onClick={() => updateTaskStatus(t.id, nextSt)}
                                className="p-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 text-[11px] flex items-center gap-0.5 cursor-pointer"
                                title="Avancer vers l'étape suivante"
                              >
                                <span className="hidden sm:inline">Suivant</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modale de création */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-backdrop-in overflow-y-auto">
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Créer une tâche Kanban"
            className="rk-panel border-rk-line-strong w-full max-w-md shadow-2xl p-6 space-y-4 my-8 outline-none animate-modal-in"
          >
            <div className="flex items-center justify-between border-b border-rk-line pb-3">
              <h3 className="font-serif text-lg font-bold text-white">Créer une Tâche Kanban</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Fermer"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-mono mb-1">Titre du livrable *</label>
                <input
                  type="text"
                  required
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex : Recette passerelle MTN MoMo pour Maison Kotto"
                  className="w-full bg-rk-bg border border-rk-line rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Consignes &amp; Détails</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Critères d'acceptation, spécifications..."
                  className="w-full bg-rk-bg border border-rk-line rounded-xl px-3 py-2 text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Projet concerné</label>
                <select
                  value={projectId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setProjectId(v);
                    const p = projets.find((x) => x.id === v);
                    if (p) setPole(p.pole);
                  }}
                  className="w-full bg-rk-bg border border-rk-line rounded-xl px-2 py-2 text-white"
                >
                  <option value="">Aucun projet (tâche libre)</option>
                  {projets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.client_code ? `${p.client_code} — ` : ''}
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Pôle</label>
                  <select
                    value={pole}
                    onChange={(e) => setPole(e.target.value as Pole)}
                    className="w-full bg-rk-bg border border-rk-line rounded-xl px-2 py-2 text-white"
                  >
                    {ALL_POLES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-mono mb-1">Priorité</label>
                  <select
                    value={priorite}
                    onChange={(e) => setPriorite(e.target.value as TaskPriority)}
                    className="w-full bg-rk-bg border border-rk-line rounded-xl px-2 py-2 text-white"
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Assigné à</label>
                {osMembers.length === 0 ? (
                  <p className="text-[11px] text-amber-300 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2 font-mono">
                    Aucun membre enregistré : ajoutez votre équipe dans l'onglet Équipe pour pouvoir assigner des tâches.
                  </p>
                ) : (
                  <select
                    value={assigneeId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAssigneeId(v);
                      const m = osMembers.find((x) => x.id === v);
                      if (m) setPole(m.pole);
                    }}
                    className="w-full bg-rk-bg border border-rk-line rounded-xl px-2 py-2 text-white"
                  >
                    <option value="">Aucun responsable pour l'instant</option>
                    {osMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.poste_titre || m.role} ({m.pole})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Échéance</label>
                <input
                  type="date"
                  value={dateEcheance}
                  onChange={(e) => setDateEcheance(e.target.value)}
                  className="w-full bg-rk-bg border border-rk-line rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white px-3 py-2">
                  Annuler
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl">
                  Ajouter au Kanban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
