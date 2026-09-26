import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Pole, Task, TaskStatus } from '../../types';
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Calendar, 
  Filter, 
  Trash2,
  X
} from 'lucide-react';
import { POLES_INFO } from '../../data/mockData';

export const TasksTab: React.FC = () => {
  const { tasks, addTask, updateTaskStatus } = useApp();

  const [selectedPole, setSelectedPole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // New task form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pole, setPole] = useState<Pole>('Tech');
  const [priority, setPriority] = useState<'basse' | 'normale' | 'urgente'>('normale');
  const [assignedTo, setAssignedTo] = useState('Marc (Lead Dev)');
  const [dueDate, setDueDate] = useState('Vendredi 18h');

  const filteredTasks = tasks.filter((t) => {
    const matchesPole = selectedPole === 'all' || t.pole === selectedPole;
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
    return matchesPole && matchesStatus;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    addTask({
      title,
      description,
      pole,
      priority,
      assigned_to: assignedTo,
      due_date: dueDate
    });

    setTitle('');
    setDescription('');
    setIsModalOpen(false);
  };

  const poleManagers: Record<Pole, string> = {
    Direction: 'Loïc (Dir Général)',
    Tech: 'Marc (Lead Dev)',
    Creatif: 'Sarah (Dir Artistique)',
    Digital: 'Kevin (Growth & Terrain)',
    Client: 'Patricia (Support & Onboarding)',
    Externe: 'Freelance & Partenaires'
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0f2e] border border-white/10 p-5 rounded-2xl">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <span>Gestion des Tâches Opérationnelles</span>
            <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
              {filteredTasks.length} tâches
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Affectez et suivez l'avancement des livrables pour chacun des 6 pôles de l'agence.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Créer une Tâche</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Pole Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedPole('all')}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-colors cursor-pointer ${
              selectedPole === 'all'
                ? 'bg-white text-slate-950 font-bold'
                : 'bg-[#0a0f2e] text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            Tous les Pôles
          </button>
          {(['Direction', 'Tech', 'Creatif', 'Digital', 'Client', 'Externe'] as Pole[]).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPole(p)}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-colors cursor-pointer ${
                selectedPole === p
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-[#0a0f2e] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-[#0a0f2e] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none ml-auto"
        >
          <option value="all">Tous les statuts</option>
          <option value="a_faire">À faire</option>
          <option value="en_cours">En cours</option>
          <option value="revue">En revue</option>
          <option value="termine">Terminé</option>
        </select>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500 bg-[#0a0f2e] rounded-2xl border border-white/5">
            Aucune tâche trouvée pour cette combinaison de filtres.
          </div>
        ) : (
          filteredTasks.map((t) => {
            const isUrgent = t.priority === 'urgente';
            const isCompleted = t.status === 'termine';

            return (
              <div
                key={t.id}
                className={`bg-[#0a0f2e] border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                  isCompleted
                    ? 'border-emerald-500/20 opacity-75'
                    : isUrgent
                    ? 'border-rose-500/40 shadow-sm shadow-rose-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase bg-white/5 text-slate-300 px-2.5 py-0.5 rounded border border-white/5">
                      {t.pole}
                    </span>

                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      t.priority === 'urgente' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      t.priority === 'normale' ? 'bg-blue-500/20 text-blue-300' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {t.priority.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <h3 className={`font-serif text-base font-bold text-white leading-snug ${
                      isCompleted ? 'line-through text-slate-400' : ''
                    }`}>
                      {t.title}
                    </h3>
                    {t.description && (
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                        {t.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.assigned_to}</span>
                    </div>
                    {t.due_date && (
                      <div className="flex items-center gap-1 text-amber-400">
                        <Clock className="w-3 h-3" />
                        <span>{t.due_date}</span>
                      </div>
                    )}
                  </div>

                  {/* Status update switcher */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <select
                      value={t.status}
                      onChange={(e) => updateTaskStatus(t.id, e.target.value as TaskStatus)}
                      className={`text-xs font-mono px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer w-full ${
                        t.status === 'termine' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                        t.status === 'en_cours' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                        t.status === 'revue' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                        'bg-slate-800 text-slate-400 border-white/10'
                      }`}
                    >
                      <option value="a_faire">À faire</option>
                      <option value="en_cours">En cours</option>
                      <option value="revue">En revue</option>
                      <option value="termine">✓ Terminé</option>
                    </select>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Modal Add Task */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#0a0f2e] border border-white/15 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-serif text-lg font-bold text-white">Ajouter une Tâche Opérationnelle</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-mono mb-1">Titre de la tâche *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Intégrer le paiement MTN MoMo pour un client"
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Description détaillée</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Consignes précises, liens ou livrables attendus..."
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Pôle</label>
                  <select
                    value={pole}
                    onChange={(e) => {
                      const newP = e.target.value as Pole;
                      setPole(newP);
                      setAssignedTo(poleManagers[newP]);
                    }}
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
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-2 py-2 text-white"
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="urgente">Urgente 🔥</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Responsable</label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-mono mb-1">Échéance</label>
                  <input
                    type="text"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    placeholder="Ex: Demain 17h"
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
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 rounded-xl"
                >
                  Ajouter la Tâche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
