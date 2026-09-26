import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { X, ArrowRight, ArrowLeft, CheckCircle2, MessageSquare, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrencyPrice } from '../../utils/currency';

export const QuoteModal: React.FC = () => {
  const { isQuoteModalOpen, setIsQuoteModalOpen, addLead, currency } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [projectType, setProjectType] = useState('E-commerce & Mobile Money MTN/Orange');
  const [projectDescription, setProjectDescription] = useState('');
  
  const [timeline, setTimeline] = useState('Sous 3 à 4 semaines');
  const [budgetRange, setBudgetRange] = useState('Entre 500 000 et 1 500 000 FCFA');
  const [targetAudience, setTargetAudience] = useState('Grand public local & PME');

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('Cameroun (Yaoundé / Douala)');
  const [consent, setConsent] = useState(true);

  const [whatsappLink, setWhatsappLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setIsQuoteModalOpen(false);
    setTimeout(() => setStep(1), 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    setIsSubmitting(true);

    const structuredMessage = `DEMANDE DE DEVIS INTERACTIF :
- Type de projet : ${projectType}
- Description : ${projectDescription || 'Non spécifiée'}
- Délai visé : ${timeline}
- Fourchette budgétaire : ${budgetRange}
- Public ciblé : ${targetAudience}
- Entreprise : ${companyName || 'Particulier / Projet'}
- Localisation : ${location}`;

    const { whatsappLink: waUrl } = addLead({
      name,
      email,
      phone,
      project_type: projectType,
      budget: budgetRange,
      message: structuredMessage,
      source: 'site_v2_devis',
      statut: 'nouveau',
      pole_assigned: 'Direction',
      country: location,
    });

    setWhatsappLink(waUrl);
    setIsSubmitting(false);
    setStep(4);
  };

  const projectOptions = [
    { id: 'E-commerce & Mobile Money MTN/Orange', label: 'E-commerce & Mobile Money', desc: 'Boutique en ligne avec paiement direct MTN MoMo & Orange' },
    { id: 'Site web vitrine UX/UI (Forfait Synergie)', label: 'Site Vitrine sur-mesure', desc: '5 à 8 pages de haut standing + 9 sorties terrain' },
    { id: 'Mini-site & Identité (Forfait Initiation)', label: 'Mini-site & Identité', desc: 'Démarrage rapide 10-15j + kit visuels de lancement' },
    { id: 'Logiciel SaaS ARKA-PME', label: 'Logiciel ARKA-PME', desc: 'Gestion de stock, caisse et clients hors-ligne' },
    { id: 'Identité de marque & Direction Artistique', label: 'Identité & Branding', desc: 'Logo, charte complète, packaging et shooting' },
    { id: 'Système complet multi-plateforme', label: 'Architecture Complète', desc: 'Infrastructure premium tout-en-un sur mesure' }
  ];

  const timelineOptions = [
    'Urgent (~10 jours ouvrés)',
    'Sous 3 à 4 semaines (Standard)',
    'Sous 6 à 10 semaines (Projet d\'envergure)',
    'À moyen terme / Cadrage initial'
  ];

  const budgetOptions = [
    `Forfait Initiation (~${formatCurrencyPrice(380000, currency)})`,
    `Forfait Synergie (~${formatCurrencyPrice(750000, currency)})`,
    `Forfait Architecture (~${formatCurrencyPrice(2900000, currency)})`,
    'Budget personnalisé selon cahier des charges'
  ];

  return (
    <AnimatePresence>
      {isQuoteModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
            className="bg-[#0f1523] border border-white/[0.1] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
          >
            {/* Modal Top Bar */}
            <div className="sticky top-0 bg-[#0f1523]/95 backdrop-blur-md px-6 py-5 border-b border-white/[0.08] flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">
                  {step <= 3 ? `0${step}` : 'OK'}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-white">
                    {step === 1 && "Étape 1 : Votre Projet"}
                    {step === 2 && "Étape 2 : Délais & Budget"}
                    {step === 3 && "Étape 3 : Vos Coordonnées"}
                    {step === 4 && "Demande Transmise !"}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {step <= 3 ? `Configurateur interactif de devis` : `Votre dossier est transmis à la direction`}
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8">
              {/* STEP 1: Project Type & Details */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-3">
                      Quel type de système digital souhaitez-vous déployer ?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {projectOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setProjectType(opt.id)}
                          className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                            projectType === opt.id
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-sm'
                              : 'bg-[#0a0e17] border-white/[0.06] text-slate-300 hover:border-white/[0.16]'
                          }`}
                        >
                          <div className="text-xs font-semibold text-white flex items-center justify-between">
                            <span>{opt.label}</span>
                            {projectType === opt.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 leading-snug font-light">
                            {opt.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                      Décrivez brièvement votre activité et votre besoin :
                    </label>
                    <textarea
                      rows={3}
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Ex : Nous vendons des vêtements et souhaitons permettre à nos clients de payer par Orange Money et MTN MoMo avec livraison à Yaoundé et Douala..."
                      className="w-full bg-[#0a0e17] border border-white/[0.08] rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
                    >
                      <span>Continuer</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Timelines & Budget Ranges */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2.5">
                      Délai de réalisation souhaité :
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {timelineOptions.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTimeline(t)}
                          className={`text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                            timeline === t
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-white font-medium'
                              : 'bg-[#0a0e17] border-white/[0.06] text-slate-300 hover:border-white/[0.16]'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2.5">
                      Fourchette budgétaire envisagée :
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {budgetOptions.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBudgetRange(b)}
                          className={`text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                            budgetRange === b
                              ? 'bg-amber-500/10 border-amber-500/40 text-white font-medium'
                              : 'bg-[#0a0e17] border-white/[0.06] text-slate-300 hover:border-white/[0.16]'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 font-mono">
                      * Note : Nous ajustons les livrables pour respecter précisément votre enveloppe.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                      Public cible visé :
                    </label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="Ex : Particuliers à Yaoundé, PME locales, Diaspora..."
                      className="w-full bg-[#0a0e17] border border-white/[0.08] rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-slate-400 hover:text-white text-xs flex items-center gap-1.5 px-3 py-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Précédent</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
                    >
                      <span>Continuer</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Client Identity Form */}
              {step === 3 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1">
                        Votre Nom & Prénom *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex : Jean-Paul Kamdem"
                        className="w-full bg-[#0a0e17] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1">
                        Nom de votre entreprise / Marque
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Ex : Kamdem Distribution SARL"
                        className="w-full bg-[#0a0e17] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1">
                        Téléphone WhatsApp * (avec indicatif)
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ex : +237 681 46 29 82"
                        className="w-full bg-[#0a0e17] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1">
                        Adresse Email (optionnel)
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contact@entreprise.cm"
                        className="w-full bg-[#0a0e17] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Localisation (Ville & Pays) — Livraison internationale 🌍
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ex : Yaoundé (Cameroun), Libreville, Paris, Abidjan..."
                      className="w-full bg-[#0a0e17] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="rounded border-white/20 bg-[#0a0e17] text-emerald-500 focus:ring-0"
                      />
                      <span>J'accepte d'être recontacté(e) par un conseiller Arckaton sous 24h ouvrées.</span>
                    </label>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-slate-400 hover:text-white text-xs flex items-center gap-1.5 px-3 py-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Précédent</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || !consent}
                      className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold px-7 py-3 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      <span>Confirmer et envoyer mon devis</span>
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 4: Success & Direct WhatsApp Link */}
              {step === 4 && (
                <div className="text-center py-6 space-y-6">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-serif text-2xl font-bold text-white">
                      Votre demande est entre de bonnes mains !
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed font-light">
                      Merci <strong className="text-white">{name}</strong>. Nos équipes ont bien reçu votre projet pour <strong className="text-emerald-400">{projectType}</strong>. Votre dossier a été transmis à la direction dans Arckaton OS.
                    </p>
                  </div>

                  {/* Direct WhatsApp shortcut */}
                  <div className="p-5 rounded-xl bg-[#0a0e17] border border-emerald-500/20 max-w-md mx-auto text-left space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                      <MessageSquare className="w-4 h-4" />
                      <span>Accélérer la réponse par WhatsApp</span>
                    </div>
                    <p className="text-xs text-slate-300 font-light">
                      Vous pouvez ouvrir directement la conversation pré-remplie avec notre conseiller pour un échange vocal ou textuel immédiat :
                    </p>
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Lancer l'échange WhatsApp pré-rempli</span>
                    </a>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-xs text-slate-400 hover:text-white px-4 py-2 cursor-pointer"
                    >
                      Fermer la fenêtre
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
