import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { X, Play, CheckCircle2, Clock, WifiOff, Smartphone, MessageSquare, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDialogA11y } from '../../hooks/useDialogA11y';

export const TrialModal: React.FC = () => {
  const { isTrialModalOpen, setIsTrialModalOpen, addLead } = useApp();

  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [activity, setActivity] = useState('Boutique de détail & Prêt-à-porter');
  const [city, setCity] = useState('Yaoundé');
  const [submitted, setSubmitted] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activities = [
    'Boutique de détail & Prêt-à-porter',
    'Commerce général & Quincaillerie',
    'Pharmacie & Parapharmacie',
    'Supermarché & Épicerie fine',
    'Prestation de services & Restauration',
    'Autre activité commerciale'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !phone || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { whatsappLink: wa } = addLead({
        name: companyName,
        phone,
        email,
        project_type: `ARKA-PME (essai 30j) — ${activity}`,
        budget: 'Essai Gratuit 30 Jours',
        message: `DEMANDE D'ESSAI ARKA-PME 30 JOURS SANS ENGAGEMENT. Activité : ${activity}. Ville : ${city}. Téléphone : ${phone}.`,
        source: 'site_v2_trial',
        statut: 'nouveau',
        pole_assigned: 'Tech',
        country: city,
      });

      setWhatsappLink(wa);
      window.setTimeout(() => {
        setSubmitted(true);
        setIsSubmitting(false);
      }, 400);
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsTrialModalOpen(false);
    setTimeout(() => setSubmitted(false), 300);
  };

  const dialogRef = useDialogA11y<HTMLDivElement>(isTrialModalOpen, handleClose);

  return (
    <AnimatePresence>
      {isTrialModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div 
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Démarrer l'essai ARKA-PME 30 jours"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
            className="bg-rk-surface border border-rk-line rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden relative outline-none"
          >
            {/* Header */}
            <div className="bg-rk-base px-6 py-5 border-b border-rk-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-emerald-400" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-white">
                    Démarrer l'essai ARKA-PME (30 jours)
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    100% gratuit • Sans engagement • Sans carte bancaire
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                aria-label="Fermer"
                className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 sm:p-8">
              {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Three Guarantee Badges */}
                  <div className="grid grid-cols-3 gap-2 pb-2">
                    <div className="p-2.5 rounded-xl bg-rk-base border border-rk-line-soft text-center">
                      <Clock className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                      <div className="text-[11px] font-mono text-white">Actif en 2h</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rk-base border border-rk-line-soft text-center">
                      <WifiOff className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                      <div className="text-[11px] font-mono text-white">100% Offline</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rk-base border border-rk-line-soft text-center">
                      <Smartphone className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                      <div className="text-[11px] font-mono text-white">MoMo & Orange</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1.5">
                      Nom de votre commerce / Entreprise *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex : Supermarché Étoile / Boutique Clarisse"
                      className="w-full bg-rk-base border border-rk-line rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">
                        Numéro WhatsApp * (pour accès)
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+237 681 46 29 82"
                        className="w-full bg-rk-base border border-rk-line rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">
                        Ville principale
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Yaoundé, Douala, Bafoussam..."
                        className="w-full bg-rk-base border border-rk-line rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1.5">
                      Secteur d'activité
                    </label>
                    <select
                      value={activity}
                      onChange={(e) => setActivity(e.target.value)}
                      className="w-full bg-rk-base border border-rk-line rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                    >
                      {activities.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-semibold py-3 px-5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          <span>Envoi en cours…</span>
                        </>
                      ) : (
                        <>
                          <span>Activer mes identifiants de test (30 jours)</span>
                          <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-center text-slate-400 font-mono mt-2.5">
                      Nos techniciens préparent votre base de test personnalisée sous 2h.
                    </p>
                  </div>
                </form>
              ) : (
                <div className="text-center py-6 space-y-5">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-serif text-2xl font-bold text-white">
                      Demande d'accès confirmée !
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto font-light leading-relaxed">
                      Votre compte d'évaluation pour <strong className="text-white">{companyName}</strong> est en cours d'initialisation sur le serveur ARKA-PME.
                    </p>
                  </div>

                  <div className="pt-2 max-w-sm mx-auto space-y-3">
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Recevoir mes accès sur WhatsApp</span>
                    </a>

                    <button
                      onClick={handleClose}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
