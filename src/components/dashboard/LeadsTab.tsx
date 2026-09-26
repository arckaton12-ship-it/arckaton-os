import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Lead, Pole } from '../../types';
import { TableRowSkeleton } from './DashboardSkeleton';
import { 
  Users, 
  Search, 
  Filter, 
  MessageSquare, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  Phone, 
  Mail, 
  Globe, 
  FileText,
  X
} from 'lucide-react';

export const LeadsTab: React.FC = () => {
  const { leads, updateLeadStatus, addLead, addTask, isDataFetching } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPole, setSelectedPole] = useState<string>('all');
  
  // Modal for lead details
  const [activeLeadModal, setActiveLeadModal] = useState<Lead | null>(null);
  
  // Modal for creating manual lead
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newProjectType, setNewProjectType] = useState('Forfait Synergie (Site complet UX/UI)');
  const [newBudget, setNewBudget] = useState('750 000 FCFA');
  const [newPole, setNewPole] = useState<Pole>('Direction');
  const [newNotes, setNewNotes] = useState('');

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.project_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.country && lead.country.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = selectedStatus === 'all' || lead.statut === selectedStatus;
    const matchesPole = selectedPole === 'all' || lead.pole_assigned === selectedPole;

    return matchesSearch && matchesStatus && matchesPole;
  });

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    addLead({
      name: newName,
      phone: newPhone,
      email: newEmail,
      project_type: newProjectType,
      budget: newBudget,
      message: newNotes || 'Lead créé manuellement depuis le Dashboard Arckaton OS.',
      source: 'dashboard_manual',
      statut: 'nouveau',
      pole_assigned: newPole,
      country: 'Cameroun (Saisie interne)',
    });

    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewNotes('');
    setIsCreateModalOpen(false);
  };

  const handleCreateTaskFromLead = (lead: Lead) => {
    addTask({
      title: `Onboarding & Cadrage : ${lead.name}`,
      description: `Prendre contact sur WhatsApp (${lead.phone}) pour formaliser le cahier des charges : ${lead.project_type}. Budget : ${lead.budget}`,
      pole: lead.pole_assigned,
      priority: 'urgente',
      assigned_to: lead.pole_assigned === 'Tech' ? 'Marc (Lead Dev)' : lead.pole_assigned === 'Creatif' ? 'Sarah (Dir Artistique)' : 'Loïc (Direction)',
      due_date: 'Sous 48h'
    });
    alert(`Tâche d'onboarding créée avec succès dans le Pôle ${lead.pole_assigned} !`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0f2e] border border-white/10 p-5 rounded-2xl">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <span>Pipeline Commercial & CRM</span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              {filteredLeads.length} dossiers
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gérez les prospects issus du site public, des formulaires de devis et des essais ARKA-PME.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Lead Manuel</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search */}
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, téléphone, pays ou type de projet..."
            className="w-full bg-[#0a0f2e] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          />
        </div>

        {/* Status Filter */}
        <div className="md:col-span-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-[#0a0f2e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
          >
            <option value="all">Tous les Statuts</option>
            <option value="nouveau">Nouveaux</option>
            <option value="contacte">Contactés</option>
            <option value="devis_envoye">Devis Envoyés</option>
            <option value="converti">Convertis (Clients)</option>
            <option value="archive">Archivés</option>
          </select>
        </div>

        {/* Pole Filter */}
        <div className="md:col-span-3">
          <select
            value={selectedPole}
            onChange={(e) => setSelectedPole(e.target.value)}
            className="w-full bg-[#0a0f2e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
          >
            <option value="all">Tous les Pôles</option>
            <option value="Direction">Pôle Direction</option>
            <option value="Tech">Pôle Tech</option>
            <option value="Creatif">Pôle Créatif</option>
            <option value="Digital">Pôle Digital</option>
            <option value="Client">Pôle Client</option>
            <option value="Externe">Pôle Externe</option>
          </select>
        </div>
      </div>

      {/* Leads Table Card */}
      <div className="bg-[#0a0f2e] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead>
              <tr className="border-b border-white/10 bg-[#070c1e] text-slate-400 font-mono text-[11px]">
                <th className="py-3 px-4">Client / Entreprise</th>
                <th className="py-3 px-4">Système Demandé</th>
                <th className="py-3 px-4">Pôle Attribué</th>
                <th className="py-3 px-4">Statut Commercial</th>
                <th className="py-3 px-4">Contact WhatsApp</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {isDataFetching ? (
                <>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    Aucun prospect ne correspond à ces critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((l) => {
                  const waNumber = l.phone.replace(/[^0-9]/g, '');
                  const waText = encodeURIComponent(`Bonjour ${l.name}, ici l'agence Arckaton. Nous avons bien reçu votre demande de projet (${l.project_type}). Êtes-vous disponible pour un court échange ?`);
                  const waLink = `https://wa.me/${waNumber}?text=${waText}`;

                  return (
                    <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Name & Origin */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{l.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Globe className="w-3 h-3 text-slate-500" />
                          <span>{l.country || 'Cameroun'}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">{new Date(l.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Project & Budget */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{l.project_type}</div>
                        <div className="text-[11px] text-emerald-400 font-mono mt-0.5">{l.budget}</div>
                      </td>

                      {/* Pole */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] bg-white/5 px-2.5 py-1 rounded border border-white/5 text-slate-300">
                          {l.pole_assigned}
                        </span>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3.5 px-4">
                        <select
                          value={l.statut}
                          onChange={(e) => updateLeadStatus(l.id, e.target.value as any)}
                          className={`text-xs font-mono px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                            l.statut === 'nouveau' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                            l.statut === 'contacte' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                            l.statut === 'devis_envoye' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                            l.statut === 'converti' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold' :
                            'bg-slate-800 text-slate-400 border-white/10'
                          }`}
                        >
                          <option value="nouveau">Nouveau</option>
                          <option value="contacte">Contacté</option>
                          <option value="devis_envoye">Devis Envoyé</option>
                          <option value="converti">Converti (Gagné)</option>
                          <option value="archive">Archivé</option>
                        </select>
                      </td>

                      {/* Contact & WhatsApp */}
                      <td className="py-3.5 px-4">
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{l.phone}</span>
                        </a>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setActiveLeadModal(l)}
                            className="bg-white/5 hover:bg-white/10 text-slate-300 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                            title="Détails du projet"
                          >
                            Détails
                          </button>
                          <button
                            onClick={() => handleCreateTaskFromLead(l)}
                            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                            title="Assigner tâche au pôle"
                          >
                            + Tâche
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Details for Lead */}
      {activeLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#0a0f2e] border border-white/15 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-white">{activeLeadModal.name}</h3>
                <span className="text-[11px] font-mono text-emerald-400">{activeLeadModal.project_type}</span>
              </div>
              <button
                onClick={() => setActiveLeadModal(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-2 bg-[#070c1e] p-3 rounded-xl border border-white/5">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block">Téléphone :</span>
                  <span className="text-white font-semibold">{activeLeadModal.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block">Email :</span>
                  <span className="text-white">{activeLeadModal.email || 'Non renseigné'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block">Budget :</span>
                  <span className="text-emerald-400 font-mono font-semibold">{activeLeadModal.budget}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block">Pôle :</span>
                  <span className="text-blue-400 font-mono">{activeLeadModal.pole_assigned}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-mono text-slate-400 block mb-1">Message & Cahier des charges :</span>
                <div className="p-3 rounded-xl bg-[#070c1e] border border-white/5 text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {activeLeadModal.message}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => setActiveLeadModal(null)}
                className="text-xs text-slate-400 hover:text-white px-3 py-2 cursor-pointer"
              >
                Fermer
              </button>
              <a
                href={`https://wa.me/${activeLeadModal.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${activeLeadModal.name}, nous avons bien examiné votre demande concernant ${activeLeadModal.project_type}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ouvrir WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create Manual Lead */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#0a0f2e] border border-white/15 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-serif text-lg font-bold text-white">Ajouter un Prospect Manuel</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-mono mb-1">Nom / Entreprise *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Clinique Dentaire Etoile"
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Téléphone WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Ex: +237 681 46 29 82"
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Pôle Attribué</label>
                  <select
                    value={newPole}
                    onChange={(e) => setNewPole(e.target.value as Pole)}
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
                  <label className="block text-slate-300 font-mono mb-1">Budget Estimé</label>
                  <input
                    type="text"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Type de Projet</label>
                <input
                  type="text"
                  value={newProjectType}
                  onChange={(e) => setNewProjectType(e.target.value)}
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Notes internes</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Contexte de la rencontre, besoins identifiés..."
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-white px-3 py-2"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 rounded-xl"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
