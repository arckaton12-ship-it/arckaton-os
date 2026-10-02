import React, { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Lead, LeadStatus, POLE_COLORS } from '../../types';
import { 
  Users, 
  Plus, 
  MessageSquare, 
  Phone, 
  FileText, 
  Receipt, 
  FolderCheck, 
  ArrowRight, 
  Clock, 
  DollarSign, 
  Search,
  CheckCircle2,
  ExternalLink,
  LayoutGrid,
  Table2,
  UserX
} from 'lucide-react';
import { InvoiceModal } from './InvoiceModal';
import { CrmTable } from './CrmTable';
import { STATUTS } from './leadStatus';
import { CrmSectionSkeleton } from '../dashboard/DashboardSkeleton';

export const CrmSection: React.FC = () => {
  const { leads, updateLeadStatus, updateLeadNotes, convertLeadToProject, addLead, isDataFetching, refreshQuotes } = useApp();

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  
  // Invoice / Quote Modal
  const [activeModal, setActiveModal] = useState<{ lead: Lead; type: 'devis' | 'facture' } | null>(null);
  const [savedQuoteRef, setSavedQuoteRef] = useState<string | null>(null);
  // Dernier devis enregistre par lead, pour ne pas perdre la reference
  const [lastQuoteByLead, setLastQuoteByLead] = useState<Record<string, string>>({});

  const handleQuoteSaved = (leadId: string, quoteRef: string) => {
    setSavedQuoteRef(quoteRef);
    setLastQuoteByLead((prev) => ({ ...prev, [leadId]: quoteRef }));
    // Le volume facturé du tableau de bord est calculé à partir de cet
    // état. Sans ce rafraîchissement, une facture saisie à l'instant n'apparaît
    // qu'au rechargement complet de la page.
    void refreshQuotes();
  };

  // Quick note edit
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Vue Cartes (par defaut) ou Tableau pro, memorisee d'une session a l'autre.
  const [vue, setVue] = useState<'cartes' | 'tableau'>(() =>
    localStorage.getItem('arckaton_crm_vue') === 'tableau' ? 'tableau' : 'cartes'
  );
  useEffect(() => localStorage.setItem('arckaton_crm_vue', vue), [vue]);

  const statusLabels = STATUTS;

  const filteredLeads = leads.filter((l) => {
    const matchesStatus = selectedStatus === 'all' || l.statut === selectedStatus;
    const matchesSearch = 
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.project_type.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search);
    return matchesStatus && matchesSearch;
  });

  const handleConvert = (leadId: string) => {
    try {
      const res = convertLeadToProject(leadId);
      alert(res.message);
    } catch (e) {
      alert("Erreur lors de la conversion du lead.");
    }
  };

  // Changement de statut groupe depuis le tableau (actions groupees).
  const handleBulkStatus = (ids: string[], status: LeadStatus) => {
    ids.forEach((id) => updateLeadStatus(id, status));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-rk-panel border border-rk-line p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Pipeline Commercial & Devis Conformes</span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-white">
            CRM & Ventes Arckaton OS
          </h2>
          <p className="text-xs text-rk-muted mt-1">
            Traitez les opportunités entrantes, générez des devis chiffrés et convertissez les leads en projets actifs.
          </p>
        </div>

        {/* Global Leads stats */}
        <div className="flex items-center gap-2">
          <div className="bg-rk-bg border border-rk-line px-4 py-2 rounded-xl text-xs font-mono">
            <span className="text-rk-muted">Total Leads : </span>
            <span className="text-white font-bold">{leads.length}</span>
          </div>

          <div className="bg-rk-bg border border-rk-line px-4 py-2 rounded-xl text-xs font-mono">
            <span className="text-rk-muted">Signés : </span>
            <span className="text-emerald-400 font-bold">{leads.filter(l => l.statut === 'converti').length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-rk-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, téléphone, type de projet..."
            className="w-full bg-rk-panel border border-rk-line rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-rk-muted focus:outline-none focus:border-blue-400"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          aria-label="Filtrer par statut"
          className="bg-rk-panel border border-rk-line rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none w-full sm:w-auto"
        >
          <option value="all">Tous les statuts</option>
          <option value="nouveau">Nouveaux</option>
          <option value="contacte">Contact établi</option>
          <option value="qualifie">Qualifiés</option>
          <option value="devis_envoye">Devis envoyé</option>
          <option value="converti">Convertis (Clients)</option>
        </select>

        <div
          role="group"
          aria-label="Mode d'affichage"
          className="flex items-center gap-1 bg-rk-panel border border-rk-line rounded-xl p-1 shrink-0"
        >
          <button
            type="button"
            onClick={() => setVue('cartes')}
            aria-pressed={vue === 'cartes'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              vue === 'cartes' ? 'bg-blue-600 text-white' : 'text-rk-text-secondary hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Cartes</span>
          </button>
          <button
            type="button"
            onClick={() => setVue('tableau')}
            aria-pressed={vue === 'tableau'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              vue === 'tableau' ? 'bg-blue-600 text-white' : 'text-rk-text-secondary hover:text-white'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Tableau</span>
          </button>
        </div>
      </div>

      {/* Leads List */}
      {isDataFetching ? (
        <CrmSectionSkeleton />
      ) : leads.length === 0 ? (
        <div className="text-center py-16 px-6 bg-rk-panel rounded-2xl border border-rk-line-soft">
          <UserX className="w-8 h-8 text-rk-muted mx-auto mb-3" aria-hidden="true" />
          <p className="text-white font-semibold">Aucun prospect pour l'instant</p>
          <p className="text-xs text-rk-muted mt-1">
            Les demandes du site public et du conseiller IA apparaîtront ici automatiquement.
          </p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-16 px-6 bg-rk-panel rounded-2xl border border-rk-line-soft">
          <Search className="w-8 h-8 text-rk-muted mx-auto mb-3" aria-hidden="true" />
          <p className="text-white font-semibold">Aucun résultat pour ces filtres</p>
          <p className="text-xs text-rk-muted mt-1">Élargissez la recherche ou réinitialisez les filtres.</p>
          <button
            type="button"
            onClick={() => { setSearch(''); setSelectedStatus('all'); }}
            className="mt-4 bg-white/5 hover:bg-white/10 text-rk-text border border-rk-line px-3.5 py-1.5 rounded-xl text-xs cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : vue === 'tableau' ? (
        <CrmTable
          leads={filteredLeads}
          onOpenInvoice={(lead, type) => setActiveModal({ lead, type })}
          onConvert={handleConvert}
          onBulkStatus={handleBulkStatus}
        />
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((l) => {
            const stInfo = statusLabels[l.statut] || statusLabels.nouveau;
            const poleColor = POLE_COLORS[l.pole_assigned] || POLE_COLORS.Tech;

            const waText = encodeURIComponent(`Bonjour ${l.name} ! C'est l'équipe Arckaton suite à votre demande pour ${l.project_type}. Pouvons-nous caler un appel de 10 minutes ?`);
            const waLink = `https://wa.me/${l.phone.replace(/[^0-9]/g, '')}?text=${waText}`;

            return (
              <div
                key={l.id}
                className="bg-rk-panel border border-rk-line hover:border-rk-line-bold rounded-2xl p-5 space-y-4 transition-all"
              >
                {/* Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rk-line-soft pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-sm text-blue-300">
                      {l.name.charAt(0)}
                    </div>

                    <div>
                      <div className="font-serif text-base font-bold text-white flex items-center gap-2">
                        <span>{l.name}</span>
                        {l.country && (
                          <span className="text-[11px] font-mono text-rk-muted bg-white/5 px-2 py-0.2 rounded">
                            {l.country}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-rk-muted font-mono flex items-center gap-2 mt-0.5">
                        <Phone className="w-3 h-3 text-rk-muted" />
                        <span>{l.phone}</span>
                        <span>•</span>
                        <Clock className="w-3 h-3 text-rk-muted" />
                        <span>{l.created_at}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Pole badges */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${stInfo.color}`}>
                      {stInfo.label}
                    </span>

                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${poleColor.bg} ${poleColor.text} ${poleColor.border}`}>
                      Pôle {l.pole_assigned}
                    </span>
                  </div>
                </div>

                {/* Project details & Message */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="md:col-span-2 space-y-1">
                    <span className="text-[11px] font-mono uppercase text-rk-muted">Projet demandé :</span>
                    <div className="font-semibold text-white text-sm">{l.project_type}</div>
                    {l.message && (
                      <p className="text-rk-text-secondary bg-rk-bg p-3 rounded-xl border border-rk-line-soft leading-relaxed mt-1">
                        « {l.message} »
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-mono uppercase text-rk-muted">Budget / Forfait envisagé :</span>
                    <div className="font-serif text-sm font-bold text-emerald-400">
                      {l.budget || 'À cadrer lors du devis'}
                    </div>

                    {/* Status switcher */}
                    <div className="pt-2">
                      <span className="text-[11px] font-mono text-rk-muted block mb-1">Changer l'état :</span>
                      <select
                        value={l.statut}
                        onChange={(e) => updateLeadStatus(l.id, e.target.value as LeadStatus)}
                        className="bg-rk-bg border border-rk-line rounded-lg px-2 py-1 text-xs text-white w-full focus:outline-none"
                      >
                        <option value="nouveau">Nouveau</option>
                        <option value="contacte">Contacté</option>
                        <option value="qualifie">Qualifié</option>
                        <option value="devis_envoye">Devis Envoyé</option>
                        <option value="converti">Converti en Client</option>
                        <option value="perdu">Perdu</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="pt-3 border-t border-rk-line-soft flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* WhatsApp Action */}
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Direct</span>
                    </a>

                    {/* Generate Quote */}
                    <button
                      onClick={() => setActiveModal({ lead: l, type: 'devis' })}
                      className="bg-white/5 hover:bg-white/10 text-rk-text border border-rk-line px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>Générer Devis</span>
                    </button>

                    {/* Proforma Invoice */}
                    <button
                      onClick={() => setActiveModal({ lead: l, type: 'facture' })}
                      className="bg-white/5 hover:bg-white/10 text-rk-text border border-rk-line px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5 text-amber-400" />
                      <span>Facture Proforma</span>
                    </button>

                    {/* Dernier document enregistre pour ce lead */}
                    {savedQuoteRef && lastQuoteByLead[l.id] === savedQuoteRef && (
                      <span className="text-[11px] font-mono text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {savedQuoteRef} enregistré
                      </span>
                    )}
                  </div>

                  {/* Convert to Project */}
                  {l.statut !== 'converti' ? (
                    <button
                      onClick={() => handleConvert(l.id)}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <FolderCheck className="w-3.5 h-3.5" />
                      <span>Convertir en Projet Client</span>
                    </button>
                  ) : (
                    <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Dossier Projet Actif</span>
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Devis / facture */}
      {activeModal && (
        <InvoiceModal
          lead={activeModal.lead}
          type={activeModal.type}
          onClose={() => setActiveModal(null)}
          onSaved={(ref) => handleQuoteSaved(activeModal.lead.id, ref)}
        />
      )}

    </div>
  );
};
