import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Task, TaskStatus, TaskPriority, Pole, POLE_COLORS } from '../../types';
import { 
  Plus, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  ChevronRight, 
  ChevronLeft, 
  Filter, 
  Calendar, 
  Trash2,
  X
} from 'lucide-react';
import { POLES_INFO } from '../../data/mockData';

export const KanbanBoard: React.FC = () => {
  const { tasks, addTask, updateTaskStatus } = useApp();

  const [selectedPole, setSelectedPole] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New task form state
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [pole, setPole] = useState<Pole>('Tech');
  const [priorite, setPriorite] = useState<TaskPriority>('haute');
  const [assigneeName, setAssigneeName] = useState('Arthur N.');
  const [dateEcheance, setDateEcheance] = useState('2026-09-22');

  const columns: Array<{ id: TaskStatus; title: string; color: string; badge: string }> = [
    { id: 'a_faire', title: 'À Faire', color: 'border-slate-600', badge: 'bg-slate-700 text-slate-300' },
    { id: 'en_cours', title: 'En Cours', color: 'border-blue-500/50', badge: 'bg-blue-500/20 text-blue-300' },
    { id: 'revue', title: 'En Revue / Test', color: 'border-amber-500/50', badge: 'bg-amber-500/20 text-amber-300' },
    { id: 'termine', title: 'Terminé & Livré', color: 'border-emerald-500/50', badge: 'bg-emerald-500/20 text-emerald-300' },
  ];

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) return;

    addTask({
      titre,
      title: titre,
      description,
      statut: 'a_faire',
      status: 'a_faire',
      priorite,
      priority: priorite,
      pole,
      assignee_name: assigneeName,
      assigned_to: assigneeName,
      date_echeance: dateEcheance,
      due_date: dateEcheance,
    });

    setTitre('');
    setDescription('');
    setIsModalOpen(false);
  };

  const getNextStatus = (curr: TaskStatus): TaskStatus | null => {
    if (curr === 'a_faire') return 'en_cours';
    if (curr === 'en_cours') return 'revue';
    if (curr === 'revue') return 'termine';
    return null;
  };

  const getPrevStatus = (curr: TaskStatus): TaskStatus | null => {
    if (curr === 'termine') return 'revue';
    if (curr === 'revue') return 'en_cours';
    if (curr === 'en_cours') return 'a_faire';
    return null;
  };

  const filteredTasks = tasks.filter((t) => {
    return selectedPole === 'all' || t.pole === selectedPole;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div className="bg-[#0a122e] border border-white/10 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <span>Tableau Kanban des Tâches</span>
            <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
              {filteredTasks.length} tâches
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Suivi agile de la production des 6 pôles, priorisation et respect des délais de livraison.
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

      {/* Pole Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSelectedPole('all')}
          className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-colors cursor-pointer ${
            selectedPole === 'all'
              ? 'bg-white text-slate-950 font-bold'
              : 'bg-[#0a122e] text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          Tous les Pôles
        </button>
        {(['Direction', 'Tech', 'Creatif', 'Digital', 'Client', 'Externe'] as Pole[]).map((p) => {
          const c = POLE_COLORS[p];
          return (
            <button
              key={p}
              onClick={() => setSelectedPole(p)}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-colors cursor-pointer ${
                selectedPole === p
                  ? `${c.bg} ${c.text} font-bold border ${c.border}`
                  : 'bg-[#0a122e] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) => (t.statut || t.status) === col.id);

          return (
            <div
              key={col.id}
              className="bg-[#09122a] border border-white/10 rounded-2xl flex flex-col max-h-[calc(100vh-260px)] min-h-[400px]"
            >
              {/* Column Header */}
              <div className={`p-3.5 border-b border-white/10 flex items-center justify-between border-t-2 ${col.color}`}>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-sm font-bold text-white">{col.title}</h3>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${col.badge}`}>
                    {colTasks.length}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {colTasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-mono">
                    Aucune tâche
                  </div>
                ) : (
                  colTasks.map((t) => {
                    const poleColor = POLE_COLORS[t.pole] || POLE_COLORS.Tech;
                    const priority = t.priorite || t.priority || 'normale';
                    const isUrgent = priority === 'urgente';

                    const prevSt = getPrevStatus(t.statut || t.status || 'a_faire');
                    const nextSt = getNextStatus(t.statut || t.status || 'a_faire');

                    return (
                      <div
                        key={t.id}
                        className={`bg-[#0a1435] border rounded-xl p-3.5 space-y-3 transition-all hover:border-white/20 shadow-sm ${
                          isUrgent ? 'border-rose-500/40' : 'border-white/5'
                        }`}
                      >
                        {/* Tags */}
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${poleColor.bg} ${poleColor.text} ${poleColor.border}`}>
                            {t.pole}
                          </span>

                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            priority === 'urgente' ? 'bg-rose-500/20 text-rose-300 font-bold' :
                            priority === 'haute' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {priority.toUpperCase()}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="font-serif text-xs font-bold text-white leading-snug">
                            {t.titre || t.title}
                          </h4>
                          {t.description && (
                            <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                              {t.description}
                            </p>
                          )}
                        </div>

                        {/* Assignee & Date */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{t.assignee_name || t.assigned_to || 'Équipe'}</span>
                          </div>

                          {(t.date_echeance || t.due_date) && (
                            <div className="flex items-center gap-1 text-amber-300">
                              <Clock className="w-3 h-3" />
                              <span>{t.date_echeance || t.due_date}</span>
                            </div>
                          )}
                        </div>

                        {/* Move Actions */}
                        <div className="pt-1 flex items-center justify-between gap-1">
                          {prevSt ? (
                            <button
                              onClick={() => updateTaskStatus(t.id, prevSt)}
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[11px] flex items-center gap-0.5 cursor-pointer"
                              title="Déplacer vers l'étape précédente"
                            >
                              <ChevronLeft className="w-3 h-3" />
                              <span className="hidden sm:inline">Précédent</span>
                            </button>
                          ) : <div />}

                          {nextSt && (
                            <button
                              onClick={() => updateTaskStatus(t.id, nextSt)}
                              className="p-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 text-[11px] flex items-center gap-0.5 cursor-pointer ml-auto"
                              title="Avancer vers l'étape suivante"
                            >
                              <span className="hidden sm:inline">Suivant</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
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

      {/* Modal Add Task */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#0a122e] border border-white/15 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-serif text-lg font-bold text-white">Créer une Tâche Kanban</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
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
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Consignes & Détails</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Critères d'acceptation, spécifications..."
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Pôle</label>
                  <select
                    value={pole}
                    onChange={(e) => setPole(e.target.value as Pole)}
                    className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-2 py-2 text-white"
                  >
                    <option value="Direction">Direction</option>
                    <option value="Tech">Tech</option>
                    <option value="Creatif">Créatif</option>
                    <option value="Digital">Digital</option>
                    <option value="Client">Client</option>
                    <option value="Externe">Externe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-mono mb-1">Priorité</label>
                  <select
                    value={priorite}
                    onChange={(e) => setPriorite(e.target.value as any)}
                    className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-2 py-2 text-white"
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente ðŸ”¥</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Assigné à</label>
                  <input
                    type="text"
                    value={assigneeName}
                    onChange={(e) => setAssigneeName(e.target.value)}
                    className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-mono mb-1">Échéance</label>
                  <input
                    type="date"
                    value={dateEcheance}
                    onChange={(e) => setDateEcheance(e.target.value)}
                    className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white px-3 py-2"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl"
                >
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
