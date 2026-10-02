import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import { Projet, ProjectMilestone, FieldVisit, Pole } from '../../types';
import { POLES_INFO } from '../../data/mockData';
import { ProductionTabSkeleton } from './DashboardSkeleton';
import { MediaGallery } from './MediaGallery';
import { 
  FolderKanban, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Camera, 
  Phone, 
  MessageSquare, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Sparkles, 
  Calendar, 
  User, 
  Layers, 
  DollarSign, 
  ShieldCheck,
  Save
} from 'lucide-react';

const DEFAULT_JALONS: Array<Pick<ProjectMilestone, 'titre' | 'description'>> = [
  { titre: 'Cadrage & cahier des charges', description: 'Validation du périmètre, des objectifs et des livrables attendus.' },
  { titre: 'Maquettes & validation graphique', description: 'Design des écrans clés et approbation de la charte visuelle.' },
  { titre: 'Développement & intégration', description: 'Intégration technique, contenus et connexions aux services tiers.' },
  { titre: 'Recette & tests clients', description: 'Tests de bon fonctionnement et corrections finales.' },
  { titre: 'Mise en ligne & formation', description: 'Mise en production, prise en main et transfert de compétences.' },
];

// Cycle de vie d'une sortie terrain : une session avance d'etape en etape
const VISIT_NEXT_STATUT: Record<string, string | undefined> = {
  planifiee: 'effectuee',
  effectuee: 'en_montage',
  en_montage: 'livree',
  livree: undefined,
};

const VISIT_STATUT_LABEL: Record<string, string> = {
  planifiee: 'PLANNIFIEE',
  effectuee: 'REALISEE',
  en_montage: 'EN MONTAGE',
  livree: 'LIVREE',
};

export const ProjectsProductionTab: React.FC = () => {
  const { 
    projets, 
    updateProjectProgression, 
    updateProjectMilestone, 
    addProjectMilestone, 
    addProjectFieldVisit,
    updateProjectFieldVisit,
    addProjectFeedback,
    updateProjectNotes,
    openClientPortal,
    createProject,
    osMembers,
    isDataFetching
  } = useApp();
  const { success } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPoleFilter, setSelectedPoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(projets[0]?.id || null);

  // Équipe terrain : membres réels de l'annuaire, repli sur lihi simple
  const terrainTeam = useMemo(() => {
    if (osMembers.length > 0) return osMembers;
    return [{ id: 'fallback-1', name: 'À affecter', role: 'membre', pole: 'Client' as Pole, poste_titre: null }];
  }, [osMembers]);

  // New project form state
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProject, setNewProject] = useState({
    client_name: '',
    client_code: '',
    service: '',
    chef_de_projet: '',
    client_phone: '',
    client_email: '',
    pole: 'Tech' as Pole,
    forfait: '',
    deadline: '',
    create_milestones: true,
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.client_name.trim() || !newProject.service.trim()) return;

    const jalons: ProjectMilestone[] = newProject.create_milestones
      ? DEFAULT_JALONS.map((j, idx) => ({
          id: `j-${Date.now()}-${idx}`,
          titre: j.titre,
          description: j.description,
          statut: idx === 0 ? 'en_cours' : 'en_attente',
          echeance: '',
        }))
      : [];

    const created = createProject({
      name: newProject.client_name,
      client_name: newProject.client_name,
      client_code: newProject.client_code || undefined,
      service: newProject.service,
      chef_de_projet: newProject.chef_de_projet || undefined,
      client_phone: newProject.client_phone || undefined,
      client_email: newProject.client_email || undefined,
      pole: newProject.pole,
      forfait: newProject.forfait || undefined,
      budget_estime: newProject.forfait || '',
      deadline: newProject.deadline || '',
      deliverables: [],
      score: 0,
      statut: 'en_cours',
      progression: 0,
      sorties_terrain_total: 0,
      sorties_terrain_effectuees: 0,
      jalons,
      sorties_terrain: [],
      feedbacks: [],
    });

    setExpandedProjectId(created.id);
    setIsCreatingProject(false);
    setNewProject((p) => ({ ...p, client_name: '', client_code: '', service: '', chef_de_projet: '', client_phone: '', client_email: '', forfait: '', deadline: '' }));
    success(`Projet « ${created.name} » créé.`);
  };

  // New milestone form state
  const [newMilestoneTitre, setNewMilestoneTitre] = useState('');
  const [newMilestoneEcheance, setNewMilestoneEcheance] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);

  // New field visit form state
  const [isAddingVisit, setIsAddingVisit] = useState(false);
  const [newVisitLieu, setNewVisitLieu] = useState('');
  const [newVisitDate, setNewVisitDate] = useState('');
  const [newVisitObjectif, setNewVisitObjectif] = useState('');
  const [newVisitIntervenant, setNewVisitIntervenant] = useState('');

  // Internal notes editable state
  const [editingNotes, setEditingNotes] = useState<{ [id: string]: string }>({});

  const filteredProjects = projets.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.client_code && p.client_code.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPole = selectedPoleFilter === 'all' || p.pole === selectedPoleFilter;
    const matchesStatus = selectedStatusFilter === 'all' || p.statut === selectedStatusFilter;

    return matchesSearch && matchesPole && matchesStatus;
  });

  const handleSaveNotes = (projectId: string) => {
    const notes = editingNotes[projectId];
    if (notes !== undefined) {
      updateProjectNotes(projectId, notes);
      success('Notes internes enregistrées.');
    }
  };

  const handleCreateMilestone = (projectId: string) => {
    if (!newMilestoneTitre.trim()) return;

    addProjectMilestone(projectId, {
      titre: newMilestoneTitre.trim(),
      statut: 'en_attente',
      echeance: newMilestoneEcheance.trim() || 'À définir',
      description: newMilestoneDesc.trim() || 'Livrable convenu'
    });

    setNewMilestoneTitre('');
    setNewMilestoneEcheance('');
    setNewMilestoneDesc('');
    setIsAddingMilestone(false);
    success('Jalon ajouté au projet.');
  };

  const handleCreateVisit = (projectId: string, totalVisits: number) => {
    if (!newVisitObjectif.trim() || !newVisitLieu.trim()) return;

    addProjectFieldVisit(projectId, {
      numero: totalVisits + 1,
      date: newVisitDate.trim() || 'À convenir',
      lieu: newVisitLieu.trim(),
      objectif: newVisitObjectif.trim(),
      intervenant: newVisitIntervenant,
      statut: 'planifiee'
    });

    setNewVisitLieu('');
    setNewVisitDate('');
    setNewVisitObjectif('');
    setIsAddingVisit(false);
    success('Sortie terrain planifiée.');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0a1533] via-[#09122a] to-[#0a1533] border border-emerald-500/20 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
              Production & Pilotage des Livrables
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            Suivi des Projets Actifs
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
            Validez les jalons contractuels, planifiez les sorties terrain de captation vidéo/photo et communiquez directement avec vos clients.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreatingProject((v) => !v)}
            className="bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau projet</span>
          </button>
          <button
            onClick={() => {
              if (projets.length === 0) {
                setIsCreatingProject(true);
                return;
              }
              openClientPortal(filteredProjects[0]?.client_code || projets[0].client_code || projets[0].id);
            }}
            className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Tester Espace Client &amp; BAT</span>
          </button>
        </div>
      </div>

      {/* Création d'un projet réel (persisté côté serveur) */}
      {isCreatingProject && (
        <form
          onSubmit={handleCreateProject}
          className="bg-rk-chrome border border-emerald-500/25 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-white">Ouvrir un projet client</h3>
            <button type="button" onClick={() => setIsCreatingProject(false)} className="text-slate-400 hover:text-white text-xs">
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input required placeholder="Nom du client *" value={newProject.client_name}
              onChange={(e) => setNewProject((p) => ({ ...p, client_name: e.target.value }))}
              className="bg-rk-bg border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-400" />
            <input placeholder="Code client (ex: PRJ-KOTTO)" value={newProject.client_code}
              onChange={(e) => setNewProject((p) => ({ ...p, client_code: e.target.value }))}
              className="bg-rk-bg border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-400 font-mono" />
            <input required placeholder="Service / offre *" value={newProject.service}
              onChange={(e) => setNewProject((p) => ({ ...p, service: e.target.value }))}
              className="bg-rk-bg border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-400" />
            <input placeholder="Chef de projet" value={newProject.chef_de_projet}
              onChange={(e) => setNewProject((p) => ({ ...p, chef_de_projet: e.target.value }))}
              className="bg-rk-bg border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-400" />
            <input placeholder="Téléphone client" value={newProject.client_phone}
              onChange={(e) => setNewProject((p) => ({ ...p, client_phone: e.target.value }))}
              className="bg-rk-bg border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-400" />
            <input placeholder="Email client" value={newProject.client_email}
              onChange={(e) => setNewProject((p) => ({ ...p, client_email: e.target.value }))}
              className="bg-rk-bg border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-400" />
            <select value={newProject.pole}
              onChange={(e) => setNewProject((p) => ({ ...p, pole: e.target.value as Pole }))}
              className="bg-rk-bg border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white">
              {(['Tech', 'Creatif', 'Digital', 'Client', 'Direction'] as Pole[]).map((p) => (
                <option key={p} value={p}>{POLES_INFO[p]?.name || p}</option>
              ))}
            </select>
            <input placeholder="Forfait" value={newProject.forfait}
              onChange={(e) => setNewProject((p) => ({ ...p, forfait: e.target.value }))}
              className="bg-rk-bg border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-400" />
            <input placeholder="Livraison cible" value={newProject.deadline}
              onChange={(e) => setNewProject((p) => ({ ...p, deadline: e.target.value }))}
              className="bg-rk-bg border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-400" />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={newProject.create_milestones}
              onChange={(e) => setNewProject((p) => ({ ...p, create_milestones: e.target.checked }))}
              className="accent-emerald-500" />
            Générer la feuille de route (jalons) pour rendre le portail BAT immédiatement consultable
          </label>

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => setIsCreatingProject(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">
              Annuler
            </button>
            <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Créer le projet</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-rk-chrome border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par client, code (ex: PRJ-KOTTO)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-rk-bg border border-white/10 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-rk-bg border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="all">Tous statuts</option>
            <option value="en_cours">En cours</option>
            <option value="qualifie">Qualifié</option>
            <option value="termine">Terminé</option>
          </select>

          {/* Pole Filter */}
          <select
            value={selectedPoleFilter}
            onChange={(e) => setSelectedPoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-rk-bg border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="all">Tous les pôles</option>
            <option value="Tech">Pôle Tech</option>
            <option value="Creatif">Pôle Créatif</option>
            <option value="Digital">Pôle Digital</option>
            <option value="Client">Pôle Client</option>
            <option value="Direction">Direction</option>
          </select>
        </div>

      </div>

      {/* Projects List */}
      {isDataFetching ? (
        <ProductionTabSkeleton />
      ) : (
        <div className="space-y-4">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12 bg-rk-chrome rounded-3xl border border-white/10 text-slate-400 text-xs">
              Aucun projet ne correspond à vos filtres.
            </div>
          ) : (
            filteredProjects.map((project) => {
            const isExpanded = expandedProjectId === project.id;
            const progression = project.progression ?? 0;
            const milestones = project.jalons || [];
            const fieldVisits = project.sorties_terrain || [];
            const feedbacks = project.feedbacks || [];

            return (
              <div
                key={project.id}
                className={`rounded-3xl border transition-all overflow-hidden ${
                  isExpanded 
                    ? 'bg-rk-chrome border-emerald-500/40 shadow-xl' 
                    : 'bg-rk-bg border-white/10 hover:border-white/20'
                }`}
              >
                {/* Project Card Header / Summary Row */}
                <div 
                  onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                  className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-serif text-lg font-bold text-emerald-400 flex-shrink-0">
                      {project.client_name.charAt(0)}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-lg font-bold text-white">
                          {project.client_name}
                        </h3>
                        <span className="text-[11px] font-mono bg-white/5 text-slate-400 px-2 py-0.5 rounded-full border border-white/10">
                          {project.client_code || project.id}
                        </span>
                        <span className="text-[11px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                          Pôle {project.pole}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 mt-0.5">
                        {project.service} • <strong className="text-emerald-400">{project.forfait || project.budget_estime}</strong>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                        <span>Chef de Projet : <strong className="text-slate-200">{project.chef_de_projet || 'Non affecté'}</strong></span>
                        <span>•</span>
                        <span>Échéance : {project.deadline}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Progress Bar & Actions */}
                  <div className="flex items-center gap-4 sm:gap-6 self-end md:self-auto">
                    {/* Live Progress Indicator */}
                    <div className="w-36 sm:w-48 text-right">
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-slate-400">Progression</span>
                        <span className="font-bold text-emerald-400">{progression}%</span>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progression}%` }}
                        />
                      </div>
                    </div>

                    {/* Expand/Collapse Chevron */}
                    <button 
                      type="button" 
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
                      title={isExpanded ? 'Réduire' : 'Déplier les détails'}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Workspace */}
                {isExpanded && (
                  <div className="border-t border-white/10 p-5 sm:p-7 space-y-8 bg-rk-inset/80 animate-fadeIn">
                    
                    {/* Action Bar (Direct WhatsApp Client + Open Portal Link) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-rk-chrome border border-white/5">
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <User className="w-4 h-4 text-emerald-400" />
                        <span>Client : <strong className="text-white">{project.client_name}</strong></span>
                        {project.client_phone && (
                          <span className="font-mono text-slate-400">({project.client_phone})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {project.client_phone && (
                          <a
                            href={`https://wa.me/${project.client_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Bonjour ${project.client_name}, ici l'agence Arckaton concernant l'avancement de votre projet (${project.client_code || project.id}).`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>WhatsApp Client</span>
                          </a>
                        )}

                        <button
                          onClick={() => openClientPortal(project.client_code || project.id)}
                          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Vue Espace Client & BAT</span>
                        </button>
                      </div>
                    </div>

                    {/* SECTION 1: LIVRABLES & JALONS */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-serif text-base font-bold text-white flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Jalons & Livrables Contractuels ({milestones.length})</span>
                          </h4>
                          <p className="text-xs text-slate-400">
                            Cochez ou mettez à jour les statuts. La progression globale se recalcule automatiquement.
                          </p>
                        </div>

                        <button
                          onClick={() => setIsAddingMilestone(!isAddingMilestone)}
                          className="bg-white/5 hover:bg-white/10 text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter un jalon</span>
                        </button>
                      </div>

                      {/* Add Milestone Form */}
                      {isAddingMilestone && (
                        <div className="p-4 rounded-2xl bg-rk-chrome border border-emerald-500/30 space-y-3 animate-fadeIn">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Titre du jalon (ex: Validation Charte Visuelle)"
                              value={newMilestoneTitre}
                              onChange={(e) => setNewMilestoneTitre(e.target.value)}
                              className="px-3 py-2 rounded-xl bg-rk-bg border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                            />
                            <input
                              type="text"
                              placeholder="Échéance (ex: Sous 7 jours)"
                              value={newMilestoneEcheance}
                              onChange={(e) => setNewMilestoneEcheance(e.target.value)}
                              className="px-3 py-2 rounded-xl bg-rk-bg border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Description courte ou consigne spécifique..."
                            value={newMilestoneDesc}
                            onChange={(e) => setNewMilestoneDesc(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-rk-bg border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setIsAddingMilestone(false)}
                              className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() => handleCreateMilestone(project.id)}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs"
                            >
                              Enregistrer le jalon
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Milestones List */}
                      <div className="space-y-2">
                        {milestones.map((m, idx) => {
                          const isDone = m.statut === 'valide';
                          const isOngoing = m.statut === 'en_cours';

                          return (
                            <div
                              key={m.id}
                              className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                isDone 
                                  ? 'bg-emerald-950/20 border-emerald-500/30' 
                                  : isOngoing 
                                  ? 'bg-blue-950/20 border-blue-500/30' 
                                  : 'bg-white/5 border-white/5'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-lg bg-white/5 text-slate-400 font-mono text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="font-semibold text-white text-xs sm:text-sm">
                                    {m.titre}
                                  </div>
                                  <div className="text-xs text-slate-300 mt-0.5">
                                    {m.description}
                                  </div>
                                  {m.echeance && (
                                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                      Échéance : {m.echeance}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Status Switcher Buttons */}
                              <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => { updateProjectMilestone(project.id, m.id, 'en_attente'); success(`Jalon « ${m.titre} » remis en attente.`); }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                                    m.statut === 'en_attente'
                                      ? 'bg-slate-700 text-white font-bold'
                                      : 'bg-white/5 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  En attente
                                </button>

                                <button
                                  type="button"
                                  onClick={() => { updateProjectMilestone(project.id, m.id, 'en_cours'); success(`Jalon « ${m.titre} » démarré.`); }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                                    m.statut === 'en_cours'
                                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50 font-bold'
                                      : 'bg-white/5 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  En cours
                                </button>

                                <button
                                  type="button"
                                  onClick={() => { updateProjectMilestone(project.id, m.id, 'valide'); success(`Jalon « ${m.titre} » validé.`); }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors flex items-center gap-1 ${
                                    m.statut === 'valide'
                                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                                      : 'bg-white/5 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Validé (BAT)</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* SECTION 2: SORTIES TERRAIN (PHOTO / VIDEO) */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-serif text-base font-bold text-white flex items-center gap-2">
                            <Camera className="w-4 h-4 text-purple-400" />
                            <span>Sorties Terrain & Captations ({project.sorties_terrain_effectuees || 0} / {project.sorties_terrain_total || 9} réalisées)</span>
                          </h4>
                          <p className="text-xs text-slate-400">
                            Planification et suivi des reportages photo / vidéo chez le client à Yaoundé et Douala.
                          </p>
                        </div>

                        <button
                          onClick={() => setIsAddingVisit(!isAddingVisit)}
                          className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Planifier une sortie</span>
                        </button>
                      </div>

                      {/* Add Field Visit Form */}
                      {isAddingVisit && (
                        <div className="p-4 rounded-2xl bg-rk-chrome border border-purple-500/30 space-y-3 animate-fadeIn">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                              type="text"
                              placeholder="Lieu (ex: Clinique Bastos, Yaoundé)"
                              value={newVisitLieu}
                              onChange={(e) => setNewVisitLieu(e.target.value)}
                              className="px-3 py-2 rounded-xl bg-rk-bg border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500/50"
                            />
                            <input
                              type="text"
                              placeholder="Date (ex: Vendredi 15 Oct, 10h)"
                              value={newVisitDate}
                              onChange={(e) => setNewVisitDate(e.target.value)}
                              className="px-3 py-2 rounded-xl bg-rk-bg border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500/50"
                            />
                            <select
                              value={newVisitIntervenant}
                              onChange={(e) => setNewVisitIntervenant(e.target.value)}
                              className="px-3 py-2 rounded-xl bg-rk-bg border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500/50"
                            >
                              <option value="">Intervenant (à affecter)</option>
                              {terrainTeam.map((m) => (
                                <option key={m.id || m.name} value={m.name}>
                                  {m.name}{m.poste_titre ? ` (${m.poste_titre})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="text"
                            placeholder="Objectif de la captation (ex: Interview du directeur et visite du bloc opératoire)"
                            value={newVisitObjectif}
                            onChange={(e) => setNewVisitObjectif(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-rk-bg border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500/50"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setIsAddingVisit(false)}
                              className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() => handleCreateVisit(project.id, fieldVisits.length)}
                              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-1.5 rounded-xl text-xs"
                            >
                              Programmer la sortie
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Field Visits Grid */}
                      {fieldVisits.length === 0 ? (
                        <div className="py-6 px-4 rounded-2xl border border-dashed border-purple-500/25 bg-purple-500/5 text-center">
                          <p className="text-xs font-mono text-purple-300">Aucune sortie terrain planifiee pour ce projet.</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Programmez une captation : chaque session suit son cycle planifiee → realisee → montage → livree.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {fieldVisits.map((v) => {
                          const nextStatut = VISIT_NEXT_STATUT[v.statut];
                          return (
                          <div
                            key={v.id}
                            className="p-3.5 rounded-2xl bg-rk-panel border border-white/5 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-purple-400 font-bold">
                                Session #{v.numero}
                              </span>
                              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                                v.statut === 'livree'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : v.statut === 'en_montage'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : v.statut === 'effectuee'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-slate-700 text-slate-300'
                              }`}>
                                 {VISIT_STATUT_LABEL[v.statut] || v.statut.toUpperCase()}
                              </span>
                            </div>

                            <div className="font-semibold text-white">
                              {v.objectif}
                            </div>

                            <div className="text-slate-400 font-mono text-[11px] pt-1 border-t border-white/5">
                              <div>Lieu : {v.lieu} • Date : {v.date}</div>
                              <div>Intervenant : {v.intervenant || 'Non affecte'}</div>
                            </div>

                            {/* Preuves de terrain : photos uploadees (stockees en base) */}
                            <div className="pt-1.5 border-t border-white/5 space-y-2">
                              <MediaGallery projectRef={project.id} visitId={v.id} />

                              {nextStatut && (
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => updateProjectFieldVisit(project.id, v.id, { statut: nextStatut })}
                                    className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 border border-purple-500/30 transition-colors cursor-pointer"
                                  >
                                    {VISIT_STATUT_LABEL[nextStatut]}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          );
                        })}
                        </div>
                      )}
                    </div>

                    {/* SECTION 3: NOTES INTERNES & HISTORIQUE */}
                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif text-base font-bold text-white">
                          Notes Internes de l'Agence & Cadrage
                        </h4>
                        <button
                          onClick={() => handleSaveNotes(project.id)}
                          className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Sauvegarder les notes</span>
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={editingNotes[project.id] !== undefined ? editingNotes[project.id] : (project.notes_internes || '')}
                        onChange={(e) => setEditingNotes({ ...editingNotes, [project.id]: e.target.value })}
                        placeholder="Consignes internes pour les designers, développeurs et chefs de projet..."
                        className="w-full p-3 rounded-2xl bg-rk-chrome border border-white/10 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    )}

    </div>
  );
};
