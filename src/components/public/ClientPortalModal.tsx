import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Projet } from '../../types';
import { apiRequest } from '../../utils/api';
import { 
  X, CheckCircle2, Clock, MessageSquare, Camera,
  Send, Search, Phone, Calendar, FolderKanban, KeyRound, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import CountdownBadge from '../ui/CountdownBadge';

/** Les champs renvoyés par POST /api/client-portal/access sont volontairement
 * restreints (pas de notes internes, pas d'email, pas de libellés métier). */
const portailServerToProjet = (r: Record<string, unknown>): Projet => ({
  id: String(r.project_ref || ''),
  client_code: r.client_code ? String(r.client_code) : undefined,
  name: String(r.client_name || 'Client'),
  client_name: String(r.client_name || 'Client'),
  client_phone: undefined,
  service: String(r.service || ''),
  forfait: r.forfait ? String(r.forfait) : undefined,
  pole: 'Client',
  budget_estime: String(r.budget_estime || ''),
  deadline: String(r.deadline || ''),
  date_limite: r.date_limite ? String(r.date_limite) : undefined,
  score: 0,
  statut: (r.statut as Projet['statut']) || 'en_cours',
  progression: Number(r.progression || 0),
  chef_de_projet: r.chef_de_projet ? String(r.chef_de_projet) : undefined,
  sorties_terrain_total: Number(r.sorties_terrain_total || 0),
  sorties_terrain_effectuees: Number(r.sorties_terrain_effectuees || 0),
  sorties_terrain: Array.isArray(r.sorties_terrain) ? (r.sorties_terrain as Projet['sorties_terrain']) : [],
  jalons: Array.isArray(r.jalons) ? (r.jalons as Projet['jalons']) : [],
  feedbacks: Array.isArray(r.feedbacks) ? (r.feedbacks as Projet['feedbacks']) : [],
  deliverables: [],
  notes_internes: '',
  created_at: new Date().toISOString(),
});

export const ClientPortalModal: React.FC = () => {
  const { 
    isClientPortalOpen, 
    setIsClientPortalOpen, 
    projets, 
    activeClientProjectCode, 
    setActiveClientProjectCode,
    updateProjectMilestone,
    addProjectFeedback,
    mode
  } = useApp();

  const [activeTab, setActiveTab] = useState<'avancement' | 'terrain' | 'messages'>('avancement');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState<'demande_ajustement' | 'validation' | 'question'>('demande_ajustement');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [searchCode, setSearchCode] = useState('');

  // Portail public : le client a été invité, il s'identifie (téléphone + code
  // à 6 chiffres reçu à la validation de son devis). En session interne, le
  // portail reste libre d'accès (vue staff), sans gate.
  const ouvertEnPublic = mode === 'public';
  const [telephone, setTelephone] = useState('');
  const [codePortail, setCodePortail] = useState('');
  const [erreurAcces, setErreurAcces] = useState<string | null>(null);
  const [accesCharge, setAccesCharge] = useState(false);
  const [portailProjet, setPortailProjet] = useState<Projet | null>(null);

  const rechercheProjet = projets.find(
    p => (p.client_code && p.client_code.toLowerCase() === activeClientProjectCode?.toLowerCase()) ||
         p.id === activeClientProjectCode
  ) || projets[0];
  const currentProject = ouvertEnPublic ? portailProjet : rechercheProjet;
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    const found = projets.find(
      p => (p.client_code && p.client_code.toLowerCase().includes(searchCode.trim().toLowerCase())) ||
           p.client_name.toLowerCase().includes(searchCode.trim().toLowerCase())
    );

    if (found) {
      setActiveClientProjectCode(found.client_code || found.id);
      setActionSuccessMessage(`Projet "${found.client_name}" chargé avec succès.`);
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } else {
      setActionSuccessMessage("Aucun projet trouvé avec cette référence.");
      setTimeout(() => setActionSuccessMessage(null), 3000);
    }
  };

  const enLectureSeule = ouvertEnPublic && !!currentProject;

  const handleAcces = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telephone.trim()) {
      setErreurAcces('Saisissez le numéro que vous avez communiqué à l\'agence.');
      return;
    }
    if (!/^\d{6}$/.test(codePortail)) {
      setErreurAcces('Le code d\'accès est composé de 6 chiffres.');
      return;
    }
    setErreurAcces(null);
    setAccesCharge(true);
    try {
      const r = await apiRequest<{ success: boolean; project: Record<string, unknown> }>('/api/client-portal/access', {
        method: 'POST',
        body: JSON.stringify({ phone: telephone, code: codePortail }),
      });
      setPortailProjet(portailServerToProjet(r.project));
      setActionSuccessMessage(`Bienvenue ${String(r.project.client_name)} ! Votre espace est ouvert.`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err) {
      setErreurAcces(err instanceof Error ? err.message : 'Accès refusé, réessayez.');
    } finally {
      setAccesCharge(false);
    }
  };

  const handleValidateMilestone = (milestoneId: string, milestoneTitle: string) => {
    if (!currentProject || enLectureSeule) return;
    updateProjectMilestone(currentProject.id, milestoneId, 'valide');
    addProjectFeedback(currentProject.id, {
      auteur: currentProject.client_name,
      role: 'client',
      type: 'validation',
      message: `BAT Validé par le client pour le livrable : "${milestoneTitle}".`
    });
    setActionSuccessMessage(`Le livrable "${milestoneTitle}" a été validé avec succès (BAT signé) !`);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() || !currentProject || enLectureSeule) return;

    addProjectFeedback(currentProject.id, {
      auteur: currentProject.client_name,
      role: 'client',
      type: feedbackType,
      message: feedbackText.trim()
    });

    setFeedbackText('');
    setActionSuccessMessage("Votre message a été transmis directement au Chef de Projet Arckaton !");
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const progression = currentProject?.progression || 0;
  const milestones = currentProject?.jalons || [];
  const fieldVisits = currentProject?.sorties_terrain || [];
  const feedbacks = currentProject?.feedbacks || [];

  const dialogRef = useDialogA11y<HTMLDivElement>(isClientPortalOpen, () => setIsClientPortalOpen(false));

  return (
    <AnimatePresence>
      {isClientPortalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
        >
          <motion.div 
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Espace client et suivi de projet"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
            className="bg-rk-surface border border-rk-line rounded-2xl w-full max-w-4xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden relative outline-none"
          >
            {/* Top Header Bar */}
            <div className="px-6 py-4 bg-rk-base border-b border-rk-line flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-serif text-lg font-bold text-emerald-400">
                  A
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-bold text-white">
                      Espace Client & Suivi de Projet
                    </h3>
                    <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      En Direct
                    </span>
                  </div>
                  <p className="text-xs text-rk-muted font-light">
                    Consultez l'avancement, validez vos BAT et échangez avec l'équipe dédiée.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsClientPortalOpen(false)}
                aria-label="Fermer"
                className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-rk-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Search & Switcher Bar (session interne uniquement : côté
                public, le client n'arrive que sur SON projet via son code) */}
            {!ouvertEnPublic && currentProject && (
            <div className="px-6 py-3 bg-rk-base/80 border-b border-rk-line-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto text-xs py-1">
                <span className="text-rk-muted font-mono text-xs whitespace-nowrap">Projets actifs :</span>
                {projets.map((p) => {
                  const code = p.client_code || p.id;
                  const isSelected = (currentProject?.client_code === code) || (currentProject?.id === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setActiveClientProjectCode(code)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-rk-text-secondary border border-rk-line-soft'
                      }`}
                    >
                      {p.client_name} <span className="font-mono opacity-75 text-xs">({code})</span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSearch} className="relative flex items-center min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-rk-muted absolute left-3" aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Rechercher un projet par sa référence"
                  placeholder="Réf (ex: PRJ-KOTTO)..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-rk-surface border border-rk-line text-xs text-white placeholder:text-rk-muted focus:outline-none focus:border-emerald-500/50 font-mono"
                />
              </form>
            </div>
            )}

            {/* Success Alert Banner */}
            {actionSuccessMessage && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{actionSuccessMessage}</span>
              </div>
            )}

            {/* Porte d'entrée du portail public : téléphone + code 6 chiffres */}
            {ouvertEnPublic && !portailProjet && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-14 space-y-5 bg-rk-base/50">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                  <KeyRound className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif text-xl font-bold text-white">
                    Votre espace client, protégé
                  </h4>
                  <p className="text-xs text-rk-text-secondary font-light max-w-md leading-relaxed">
                    À la validation de votre devis, notre équipe vous a communiqué
                    un code à 6 chiffres. Saisissez-le avec votre numéro pour ouvrir
                    le suivi de votre projet : avancement, BAT et livrables.
                  </p>
                </div>

                <form onSubmit={handleAcces} className="w-full max-w-sm space-y-3">
                  <div className="text-left">
                    <label htmlFor="tel-portail" className="block text-xs font-mono text-rk-muted mb-1">
                      Votre numéro (celui communiqué à l'agence)
                    </label>
                    <input
                      id="tel-portail"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="+237 6XX XX XX XX"
                      className="w-full bg-rk-surface border border-rk-line rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-rk-muted focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="text-left">
                    <label htmlFor="code-portail" className="block text-xs font-mono text-rk-muted mb-1">
                      Code d'accès (6 chiffres)
                    </label>
                    <input
                      id="code-portail"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={codePortail}
                      onChange={(e) => setCodePortail(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••••"
                      className="w-full bg-rk-surface border border-rk-line rounded-xl px-3 py-2.5 text-xs text-white font-mono tracking-[0.4em] placeholder:text-rk-muted focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  {erreurAcces && (
                    <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2 text-left">
                      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{erreurAcces}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={accesCharge}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{accesCharge ? 'Vérification...' : 'Ouvrir mon espace'}</span>
                  </button>

                  <p className="text-[11px] text-rk-muted font-light">
                    Code perdu ? Votre Chef de Projet peut vous le redonner par WhatsApp au +237 681 46 29 82.
                  </p>
                </form>
              </div>
            )}

            {/* Aucun projet : état explicite au lieu d'un écran vide */}
            {!ouvertEnPublic && projets.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <FolderKanban className="w-7 h-7 text-amber-400" />
                </div>
                <h4 className="font-serif text-xl font-bold text-white">
                  Aucun projet client n'est encore ouvert
                </h4>
                <p className="text-xs text-rk-text-secondary font-light max-w-md leading-relaxed">
                  L'espace client se remplit automatiquement dès qu'un projet est créé dans
                  Arckaton OS &gt; Production &amp; Pilotage. Le client pourra alors suivre ses
                  jalons, valider ses BAT et déposer ses demandes d'ajustement.
                </p>
                <p className="text-xs text-rk-muted font-mono">
                  Source de données : Supabase (table projects) — synchronisation en temps réel
                </p>
                <button
                  onClick={() => setIsClientPortalOpen(false)}
                  className="mt-2 bg-white/[0.06] hover:bg-white/[0.12] border border-rk-line text-white px-5 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Fermer le portail
                </button>
              </div>
            )}

            {/* Project Header Banner */}
            {currentProject && (
              <div className="px-6 py-4 bg-rk-surface border-b border-rk-line-soft flex-shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                      <span>RÉF : {currentProject.client_code || currentProject.id}</span>
                      <span>•</span>
                      <span>{currentProject.service}</span>
                    </div>
                    <h2 className="font-serif text-2xl font-bold text-white mt-0.5">
                      {currentProject.client_name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-rk-muted mt-1 font-light">
                      <span>Chef de projet : <strong className="text-white font-medium">{currentProject.chef_de_projet || 'À désigner'}</strong></span>
                      <span>•</span>
                      <span>Livraison cible : <strong className="text-white font-medium">{currentProject.deadline}</strong></span>
                      <CountdownBadge dateLimite={currentProject.date_limite} prefixe="Délai" compact />
                      <span>•</span>
                      <span>Forfait : <strong className="text-emerald-400 font-medium">{currentProject.forfait || currentProject.budget_estime}</strong></span>
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/237681462982?text=${encodeURIComponent(
                      `Bonjour, ici l'agence Arckaton, je vous contacte au sujet de notre projet ${currentProject.client_name} (Réf: ${currentProject.client_code || currentProject.id}).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp Chef de Projet</span>
                  </a>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 pt-3 border-t border-rk-line-soft">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-rk-muted font-light">Avancement global du déploiement</span>
                    <span className="font-mono font-bold text-emerald-400">{progression}% terminé</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                      style={{ width: `${progression}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            {currentProject && (
            <div className="flex border-b border-rk-line-soft bg-rk-base px-6 text-xs font-medium text-rk-muted flex-shrink-0 overflow-x-auto">
              <button
                onClick={() => setActiveTab('avancement')}
                className={`py-3 px-4 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'avancement'
                    ? 'border-emerald-400 text-emerald-400 font-semibold'
                    : 'border-transparent hover:text-white'
                }`}
              >
                Jalons & Livrables ({milestones.length})
              </button>

              <button
                onClick={() => setActiveTab('terrain')}
                className={`py-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'terrain'
                    ? 'border-emerald-400 text-emerald-400 font-semibold'
                    : 'border-transparent hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Sorties Terrain ({currentProject?.sorties_terrain_effectuees || 0}/{currentProject?.sorties_terrain_total || 9})</span>
              </button>

              <button
                onClick={() => setActiveTab('messages')}
                className={`py-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'messages'
                    ? 'border-emerald-400 text-emerald-400 font-semibold'
                    : 'border-transparent hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Échanges &amp; Validation ({feedbacks.length})</span>
              </button>
            </div>
            )}

            {/* Scrollable Tab Content Area */}
            {currentProject && (
            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-rk-base/50">
              {/* TAB 1: JALONS & LIVRABLES */}
              {activeTab === 'avancement' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-serif text-base font-bold text-white">
                      Feuille de Route & Validation des Livrables
                    </h4>
                    <p className="text-xs text-rk-muted font-light">
                      Chaque étape franchie est vérifiée avec vous. Cliquez sur "Valider le BAT" pour donner votre accord officiel.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {milestones.length === 0 ? (
                      <div className="text-center py-8 text-xs text-rk-muted bg-white/[0.04] rounded-2xl">
                        Aucun jalon configuré pour ce projet.
                      </div>
                    ) : (
                      milestones.map((milestone, idx) => {
                        const isDone = milestone.statut === 'valide';
                        const isCurrent = milestone.statut === 'en_cours';

                        return (
                          <div
                            key={milestone.id}
                            className={`p-4 rounded-xl border transition-all ${
                              isDone
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : isCurrent
                                ? 'bg-blue-500/5 border-blue-500/30'
                                : 'bg-rk-surface border-rk-line-soft opacity-75'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold flex-shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : isCurrent
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'bg-white/[0.04] text-rk-muted border border-rk-line-soft'
                                }`}>
                                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : `0${idx + 1}`}
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-semibold text-white text-sm">
                                      {milestone.titre}
                                    </h5>
                                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                                      isDone
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : isCurrent
                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        : 'bg-slate-800 text-rk-muted'
                                    }`}>
                                      {isDone ? 'Validé (BAT Conforme)' : isCurrent ? 'En cours de production' : 'En attente'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-rk-text-secondary mt-1 font-light">
                                    {milestone.description || "Livrable contractuel inclus dans votre forfait."}
                                  </p>
                                  {milestone.echeance && (
                                    <div className="text-xs font-mono text-rk-muted mt-1 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-rk-muted" />
                                      <span>Échéance visée : {milestone.echeance}</span>
                                      <CountdownBadge dateLimite={milestone.date_limite} compact />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 sm:self-center flex-shrink-0">
                                {!enLectureSeule && !isDone && (
                                  <button
                                    onClick={() => handleValidateMilestone(milestone.id, milestone.titre)}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Valider le BAT</span>
                                  </button>
                                )}

                                {!enLectureSeule && (
                                  <button
                                    onClick={() => {
                                      setActiveTab('messages');
                                      setFeedbackType('demande_ajustement');
                                      setFeedbackText(`Concernant le livrable "${milestone.titre}" : `);
                                    }}
                                    className="bg-white/[0.04] hover:bg-white/[0.08] text-rk-text-secondary border border-rk-line-soft px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <span>Demander un ajustement</span>
                                  </button>
                                )}

                                {enLectureSeule && (
                                  <span className="text-[11px] text-rk-muted font-mono italic">
                                    Lecture seule — vos validations passent par le Chef de Projet.
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: SORTIES TERRAIN (PHOTO / VIDEO) */}
              {activeTab === 'terrain' && (
                <div className="space-y-4">
                  <div className="bg-rk-surface p-5 rounded-2xl border border-rk-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-mono text-emerald-400">ENGAGEMENT TERRAIN ARCKATON</div>
                      <h4 className="font-serif text-lg font-bold text-white mt-0.5">
                        {currentProject?.sorties_terrain_effectuees || 0} sur {currentProject?.sorties_terrain_total || 9} sessions de captation réalisées
                      </h4>
                      <p className="text-xs text-rk-text-secondary mt-1 font-light">
                        Nos équipes de vidéastes et photographes se déplacent dans vos locaux pour alimenter vos catalogues et réseaux.
                      </p>
                    </div>

                    <a
                      href={`https://wa.me/237681462982?text=${encodeURIComponent(
                        `Bonjour, je souhaite planifier notre prochaine sortie terrain captation photo/vidéo pour ${currentProject?.client_name}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md whitespace-nowrap cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Planifier une session</span>
                    </a>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {fieldVisits.map((visit) => (
                      <div
                        key={visit.id}
                        className="p-4 rounded-xl bg-rk-surface border border-rk-line-soft space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-emerald-400 font-bold">
                            SESSION #{visit.numero}
                          </span>
                          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                            visit.statut === 'livree'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : visit.statut === 'en_montage'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                          }`}>
                            {visit.statut === 'livree' ? 'Photos/Vidéos livrées' : visit.statut === 'en_montage' ? 'En montage vidéo' : 'Planifiée'}
                          </span>
                        </div>

                        <div className="font-semibold text-white text-sm">
                          {visit.objectif}
                        </div>

                        <div className="text-xs text-rk-muted space-y-1 pt-1 border-t border-rk-line-soft font-mono">
                          <div>Lieu : {visit.lieu}</div>
                          <div>Date : {visit.date}</div>
                          <div>Intervenant : {visit.intervenant}</div>
                          {visit.medias_count && (
                            <div className="text-emerald-400 font-semibold">
                              {visit.medias_count} médias haute définition générés
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: RETOURS & MESSAGES CLIENT */}
              {activeTab === 'messages' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-serif text-base font-bold text-white">
                      Fil de Discussion & Remarques sur le Projet
                    </h4>
                    <p className="text-xs text-rk-muted font-light">
                      Posez une question à l'équipe technique ou demandez un ajustement.
                    </p>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {feedbacks.length === 0 ? (
                      <div className="text-center py-8 text-xs text-rk-muted bg-white/[0.04] rounded-2xl font-light">
                        Aucun message pour l'instant. Utilisez le formulaire ci-dessous pour transmettre vos remarques.
                      </div>
                    ) : (
                      feedbacks.map((fb) => {
                        const isClient = fb.role === 'client';
                        return (
                          <div
                            key={fb.id}
                            className={`p-3.5 rounded-xl text-xs space-y-1 border ${
                              isClient
                                ? 'bg-emerald-500/5 border-emerald-500/20 ml-6 sm:ml-12'
                                : 'bg-blue-500/5 border-blue-500/20 mr-6 sm:mr-12'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className={`font-bold ${isClient ? 'text-emerald-400' : 'text-blue-400'}`}>
                                {fb.auteur} {isClient ? '(Client)' : '(Équipe Arckaton)'}
                              </span>
                              <span className="font-mono text-rk-muted text-xs">{fb.date}</span>
                            </div>
                            <p className="text-rk-text leading-relaxed font-light">
                              {fb.message}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* New Message Input Form */}
                  {!enLectureSeule && (
                  <form onSubmit={handleSendFeedback} className="p-4 rounded-2xl bg-rk-surface border border-rk-line space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-rk-muted">Type de message :</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFeedbackType('demande_ajustement')}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                            feedbackType === 'demande_ajustement'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-white/[0.04] text-rk-muted border-rk-line-soft'
                          }`}
                        >
                          Demande d'ajustement
                        </button>

                        <button
                          type="button"
                          onClick={() => setFeedbackType('validation')}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                            feedbackType === 'validation'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-white/[0.04] text-rk-muted border-rk-line-soft'
                          }`}
                        >
                          Validation formelle
                        </button>

                        <button
                          type="button"
                          onClick={() => setFeedbackType('question')}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                            feedbackType === 'question'
                              ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                              : 'bg-white/[0.04] text-rk-muted border-rk-line-soft'
                          }`}
                        >
                          Simple question
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Écrivez votre message ou vos ajustements souhaités ici..."
                      className="w-full p-3 rounded-xl bg-rk-base border border-rk-line text-xs text-white placeholder:text-rk-muted focus:outline-none focus:border-emerald-500/50"
                      required
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-rk-muted font-mono">
                        Transmis en temps réel au Pôle Client et Tech
                      </span>

                      <button
                        type="submit"
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Envoyer la consigne</span>
                      </button>
                    </div>
                  </form>
                  )}

                  {enLectureSeule && (
                    <div className="p-4 rounded-2xl bg-rk-surface/70 border border-dashed border-rk-line text-center">
                      <p className="text-xs text-rk-muted font-light">
                        Votre espace est en lecture seule. Pour valider un livrable ou poser une
                        question technique, contactez votre Chef de Projet par WhatsApp — il répond
                        en général le jour même.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Modal Bottom Footer */}
            <div className="px-6 py-3 bg-rk-base border-t border-rk-line flex flex-col sm:flex-row sm:items-center justify-between text-xs text-rk-muted gap-2 flex-shrink-0 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Serveur Arckaton OS Connecté • Support 24/7 disponible</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-rk-text-secondary">Yaoundé, Mimboman</span>
                <a
                  href="tel:+237681462982"
                  className="text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>+237 681 46 29 82</span>
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
