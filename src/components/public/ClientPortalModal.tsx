import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { 
  X, CheckCircle2, Clock, MessageSquare, Camera,
  Send, Search, Phone, Calendar, FolderKanban
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ClientPortalModal: React.FC = () => {
  const { 
    isClientPortalOpen, 
    setIsClientPortalOpen, 
    projets, 
    activeClientProjectCode, 
    setActiveClientProjectCode,
    updateProjectMilestone,
    addProjectFeedback
  } = useApp();

  const [activeTab, setActiveTab] = useState<'avancement' | 'terrain' | 'messages'>('avancement');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState<'demande_ajustement' | 'validation' | 'question'>('demande_ajustement');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [searchCode, setSearchCode] = useState('');

  const currentProject = projets.find(
    p => (p.client_code && p.client_code.toLowerCase() === activeClientProjectCode?.toLowerCase()) ||
         p.id === activeClientProjectCode
  ) || projets[0];
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

  const handleValidateMilestone = (milestoneId: string, milestoneTitle: string) => {
    if (!currentProject) return;
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
    if (!feedbackText.trim() || !currentProject) return;

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
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
            className="bg-[#0f1523] border border-white/[0.1] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative"
          >
            {/* Top Header Bar */}
            <div className="px-6 py-4 bg-[#0a0e17] border-b border-white/[0.08] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-serif text-lg font-bold text-emerald-400">
                  A
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-bold text-white">
                      Espace Client & Suivi de Projet
                    </h3>
                    <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      En Direct
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-light">
                    Consultez l'avancement, validez vos BAT et échangez avec l'équipe dédiée.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsClientPortalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Switcher Bar */}
            {currentProject && (
            <div className="px-6 py-3 bg-[#0a0e17]/80 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto text-xs py-1">
                <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap">Projets actifs :</span>
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
                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.06]'
                      }`}
                    >
                      {p.client_name} <span className="font-mono opacity-75 text-[11px]">({code})</span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSearch} className="relative flex items-center min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                <input
                  type="text"
                  placeholder="Réf (ex: PRJ-KOTTO)..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#0f1523] border border-white/[0.08] text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50 font-mono"
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

            {/* Aucun projet : état explicite au lieu d'un écran vide */}
            {projets.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <FolderKanban className="w-7 h-7 text-amber-400" />
                </div>
                <h4 className="font-serif text-xl font-bold text-white">
                  Aucun projet client n'est encore ouvert
                </h4>
                <p className="text-xs text-slate-300 font-light max-w-md leading-relaxed">
                  L'espace client se remplit automatiquement dès qu'un projet est créé dans
                  Arckaton OS &gt; Production &amp; Pilotage. Le client pourra alors suivre ses
                  jalons, valider ses BAT et déposer ses demandes d'ajustement.
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Source de données : Supabase (table projects) — synchronisation en temps réel
                </p>
                <button
                  onClick={() => setIsClientPortalOpen(false)}
                  className="mt-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white px-5 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Fermer le portail
                </button>
              </div>
            )}

            {/* Project Header Banner */}
            {currentProject && (
              <div className="px-6 py-4 bg-[#0f1523] border-b border-white/[0.06] flex-shrink-0">
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
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-light">
                      <span>Chef de projet : <strong className="text-white font-medium">{currentProject.chef_de_projet || 'À désigner'}</strong></span>
                      <span>•</span>
                      <span>Livraison cible : <strong className="text-white font-medium">{currentProject.deadline}</strong></span>
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
                <div className="mt-4 pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400 font-light">Avancement global du déploiement</span>
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
            <div className="flex border-b border-white/[0.06] bg-[#0a0e17] px-6 text-xs font-medium text-slate-400 flex-shrink-0 overflow-x-auto">
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
            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-[#0a0e17]/50">
              {/* TAB 1: JALONS & LIVRABLES */}
              {activeTab === 'avancement' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-serif text-base font-bold text-white">
                      Feuille de Route & Validation des Livrables
                    </h4>
                    <p className="text-xs text-slate-400 font-light">
                      Chaque étape franchie est vérifiée avec vous. Cliquez sur "Valider le BAT" pour donner votre accord officiel.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {milestones.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 bg-white/[0.04] rounded-2xl">
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
                                : 'bg-[#0f1523] border-white/[0.06] opacity-75'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold flex-shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : isCurrent
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'bg-white/[0.04] text-slate-400 border border-white/[0.06]'
                                }`}>
                                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : `0${idx + 1}`}
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-semibold text-white text-sm">
                                      {milestone.titre}
                                    </h5>
                                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                                      isDone
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : isCurrent
                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}>
                                      {isDone ? 'Validé (BAT Conforme)' : isCurrent ? 'En cours de production' : 'En attente'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-300 mt-1 font-light">
                                    {milestone.description || "Livrable contractuel inclus dans votre forfait."}
                                  </p>
                                  {milestone.echeance && (
                                    <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>Échéance visée : {milestone.echeance}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 sm:self-center flex-shrink-0">
                                {!isDone && (
                                  <button
                                    onClick={() => handleValidateMilestone(milestone.id, milestone.titre)}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Valider le BAT</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setActiveTab('messages');
                                    setFeedbackType('demande_ajustement');
                                    setFeedbackText(`Concernant le livrable "${milestone.titre}" : `);
                                  }}
                                  className="bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.06] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <span>Demander un ajustement</span>
                                </button>
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
                  <div className="bg-[#0f1523] p-5 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-mono text-emerald-400">ENGAGEMENT TERRAIN ARCKATON</div>
                      <h4 className="font-serif text-lg font-bold text-white mt-0.5">
                        {currentProject?.sorties_terrain_effectuees || 0} sur {currentProject?.sorties_terrain_total || 9} sessions de captation réalisées
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 font-light">
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
                        className="p-4 rounded-xl bg-[#0f1523] border border-white/[0.06] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-emerald-400 font-bold">
                            SESSION #{visit.numero}
                          </span>
                          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
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

                        <div className="text-xs text-slate-400 space-y-1 pt-1 border-t border-white/[0.04] font-mono">
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
                    <p className="text-xs text-slate-400 font-light">
                      Posez une question à l'équipe technique ou demandez un ajustement.
                    </p>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {feedbacks.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 bg-white/[0.04] rounded-2xl font-light">
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
                            <div className="flex items-center justify-between text-[11px]">
                              <span className={`font-bold ${isClient ? 'text-emerald-400' : 'text-blue-400'}`}>
                                {fb.auteur} {isClient ? '(Client)' : '(Équipe Arckaton)'}
                              </span>
                              <span className="font-mono text-slate-400 text-[11px]">{fb.date}</span>
                            </div>
                            <p className="text-slate-200 leading-relaxed font-light">
                              {fb.message}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* New Message Input Form */}
                  <form onSubmit={handleSendFeedback} className="p-4 rounded-2xl bg-[#0f1523] border border-white/[0.08] space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-400">Type de message :</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFeedbackType('demande_ajustement')}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                            feedbackType === 'demande_ajustement'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-white/[0.04] text-slate-400 border-white/[0.06]'
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
                              : 'bg-white/[0.04] text-slate-400 border-white/[0.06]'
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
                              : 'bg-white/[0.04] text-slate-400 border-white/[0.06]'
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
                      className="w-full p-3 rounded-xl bg-[#0a0e17] border border-white/[0.08] text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50"
                      required
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">
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
                </div>
              )}
            </div>
            )}

            {/* Modal Bottom Footer */}
            <div className="px-6 py-3 bg-[#0a0e17] border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2 flex-shrink-0 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Serveur Arckaton OS Connecté • Support 24/7 disponible</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-slate-300">Yaoundé, Mimboman</span>
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
