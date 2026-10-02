import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { motion, AnimatePresence } from 'motion/react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Quels services couvre exactement l'agence Arckaton ?",
    answer: "Arckaton est à la fois une agence digitale et un éditeur de logiciel SaaS. Nous couvrons trois pôles clés : le Pôle Tech (création de sites web haute performance, boutiques e-commerce avec Mobile Money MTN/Orange, et le logiciel SaaS ARKA-PME pour stocks/ventes/clients) ; le Pôle Studio (direction artistique, identités visuelles, packaging, séances photos et vidéos) ; et le Pôle Growth (SEO local Google, gestion de campagnes publicitaires et 6 à 9 sorties terrain par mois)."
  },
  {
    question: "Comment se déroule l'accompagnement mensuel après la mise en ligne ?",
    answer: "Contrairement aux agences traditionnelles qui disparaissent après la livraison, tous nos forfaits incluent une maintenance continue, des créations graphiques régulières (2 à 3 infographies par semaine pour le forfait Synergie), un reporting mensuel chiffré de votre rentabilité, et surtout 6 à 9 sorties terrain chaque mois par notre équipe pour renouveler vos photos et vidéos."
  },
  {
    question: "Travaillez-vous avec des clients hors du Cameroun ou dans la diaspora ?",
    answer: "Oui, absolument ! Nous livrons partout dans le monde 🌍. Le digital n'a pas de frontières : nous collaborons couramment avec des entrepreneurs au Cameroun, au Gabon, en Côte d'Ivoire, en France, en Belgique, au Canada ou aux États-Unis. Nos processus sont 100% opérationnels à distance avec des points réguliers par visioconférence et un canal WhatsApp dédié."
  },
  {
    question: "Quels sont les délais de réalisation de mon projet ?",
    answer: "Nos délais dépendent du forfait choisi : 10 à 14 jours ouvrés pour le forfait Initiation (mini-site 3-5 pages), 2 à 3 semaines pour le forfait Synergie (site complet sur-mesure avec charte détaillée), et 4 à 6 semaines pour le forfait Architecture (e-commerce complet avec passerelle Mobile Money et intégration SaaS). Tous nos forfaits prévoient des rounds de retouches et une garantie de conformité."
  },
  {
    question: "Quels sont les modes de paiement et facilités accordées ?",
    answer: "Nous acceptons les règlements en FCFA par Mobile Money (MTN MoMo et Orange Money) ainsi que par virement bancaire. Pour chaque projet, nous demandons un acompte au démarrage des travaux et le solde à la livraison après votre validation finale. À noter : le budget publicitaire alloué aux régies (Meta, Google) reste toujours distinct de nos honoraires d'agence."
  },
  {
    question: "Le logiciel ARKA-PME fonctionne-t-il sans connexion internet stable ?",
    answer: "Oui, c'est l'un de ses atouts majeurs ! ARKA-PME a été pensé spécifiquement pour le contexte africain. Vous pouvez encaisser vos clients et enregistrer vos entrées/sorties de stock même en cas de coupure de réseau ou d'électricité. Dès que la connexion est rétablie, les données se synchronisent automatiquement sans aucun risque de perte. Vous bénéficiez en outre d'un essai gratuit de 30 jours sans engagement."
  }
];

export const Faq: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { setIsAgentModalOpen } = useApp();

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-28 bg-rk-base relative border-t border-white/[0.08] scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center space-y-4 mb-20">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Foire Aux Questions</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
            Questions fréquentes
          </h2>
          <p className="text-slate-400 text-sm sm:text-base font-light max-w-xl mx-auto">
            Des réponses claires et précises pour préparer votre collaboration avec Arckaton en toute sérénité.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-rk-surface border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                    : 'bg-rk-surface/60 border-white/[0.08] hover:border-white/[0.14]'
                }`}
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full text-left p-6 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="font-serif text-base sm:text-lg font-semibold text-white">
                    {item.question}
                  </span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200 flex-shrink-0 ${
                    isOpen ? 'rotate-180 bg-emerald-500/10 text-emerald-400' : 'text-slate-400 bg-white/[0.04]'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-1 text-slate-300 text-xs sm:text-sm leading-relaxed border-t border-white/[0.04] font-light">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Bottom prompt to AI agent */}
        <div className="mt-12 text-center p-6 rounded-2xl bg-rk-surface border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h4 className="font-serif text-base font-bold text-white">
              Une autre question spécifique à votre secteur ?
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Consultez notre agent interactif entraîné sur l'ensemble de notre méthode.
            </p>
          </div>
          <button
            onClick={() => setIsAgentModalOpen(true)}
            className="text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 rounded-xl transition-colors cursor-pointer flex-shrink-0"
          >
            Interroger l'agent Arckaton
          </button>
        </div>

      </div>
    </section>
  );
};
