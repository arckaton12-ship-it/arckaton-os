import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { MapPin, ArrowRight, Quote, CheckCircle2 } from 'lucide-react';
import { OFFICIAL_KNOWLEDGE } from '../../data/mockData';
import { motion } from 'motion/react';

export const AboutApproach: React.FC = () => {
  const { setIsQuoteModalOpen, setIsAgentModalOpen } = useApp();

  return (
    <section id="apropos" className="py-16 sm:py-28 bg-rk-base relative border-t border-rk-line scroll-mt-20 overflow-hidden">
      {/* Blueprint Grid & Lighting */}
      <div className="absolute inset-0 bg-blueprint-grid opacity-20 pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-80 h-80 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Text Block */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7 space-y-8"
          >
            <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
              <MapPin className="w-3.5 h-3.5" />
              <span>Yaoundé, Mimboman • Rayonnement International 🌍</span>
            </div>

            <div className="space-y-4">
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.15]">
                La technologie reste avant tout une affaire humaine.
              </h2>
              <p className="text-rk-text-secondary text-base sm:text-lg leading-relaxed font-light">
                Chez Arckaton, nous refusons les livraisons de vitrines inertes. Le commerce et l'entreprise en Afrique exigent du pragmatisme : des sites ultra-légers optimisés pour les connexions locales, des flux Mobile Money sans échec, et une présence physique continue sur le terrain.
              </p>
              <p className="text-rk-muted text-sm sm:text-base leading-relaxed font-light">
                C'est pour cela que nos forfaits Synergie et Architecture prévoient <strong className="text-white font-medium">6 à 9 sorties terrain mensuelles</strong> par nos équipes dédiées pour shooter vos produits, tourner vos capsules et animer votre acquisition client.
              </p>
            </div>

            {/* Testimonial Blockquote - Clean editorial styling */}
            <div className="p-8 rounded-2xl bg-rk-surface border border-rk-line relative space-y-4">
              <Quote className="w-8 h-8 text-emerald-400/20" />
              <blockquote className="font-serif text-base sm:text-lg text-white italic leading-relaxed font-light">
                « Avec Arckaton, nous sommes passés d'une boutique de quartier à une marque qui encaisse chaque jour par MTN et Orange Money. En 6 mois, notre taux de conversion a bondi de +337%. Leur accompagnement terrain fait toute la différence. »
              </blockquote>
              <div className="pt-4 border-t border-rk-line flex items-center justify-between">
                <div>
                  <div className="font-medium text-white text-sm">Mme Clarisse Mbida</div>
                  <div className="text-xs font-mono text-rk-muted uppercase tracking-wider mt-0.5">
                    Fondatrice Maison Kotto • Cliente Forfait Architecture
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Résultat certifié
                </span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => setIsQuoteModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3.5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <span>Démarrer un projet avec nous</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsAgentModalOpen(true)}
                className="bg-white/[0.06] hover:bg-white/[0.1] text-rk-text border border-rk-line px-5 py-3.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Consulter la méthode d'agence</span>
              </button>
            </div>
          </motion.div>

          {/* Right Pillar Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-5 space-y-4"
          >
            <div className="p-6 rounded-2xl bg-rk-surface border border-rk-line space-y-2">
              <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">01 • Ancrage Réel</div>
              <h3 className="font-serif text-lg font-bold text-white">Bureau à Yaoundé (Mimboman)</h3>
              <p className="text-xs text-rk-muted leading-relaxed font-light">
                Une équipe physiquement joignable, mobile pour des réunions de cadrage et des shootings sur site dans tout le triangle national.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-rk-surface border border-rk-line space-y-2">
              <div className="text-xs font-mono text-blue-400 uppercase tracking-wider">02 • Rayonnement Global</div>
              <h3 className="font-serif text-lg font-bold text-white">Clients dans 7 pays</h3>
              <p className="text-xs text-rk-muted leading-relaxed font-light">
                De Libreville à Abidjan, de Paris à Montréal, nos systèmes de gestion et sites e-commerce sont déployés à distance avec la même efficacité.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-rk-surface border border-rk-line space-y-2">
              <div className="text-xs font-mono text-amber-400 uppercase tracking-wider">03 • Cockpit Transparent</div>
              <h3 className="font-serif text-lg font-bold text-white">Arckaton OS pour chaque client</h3>
              <p className="text-xs text-rk-muted leading-relaxed font-light">
                Suivez en temps réel le calendrier des sorties terrain, la validation des jalons BAT, vos factures et les tickets de support sans intermédiaire.
              </p>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
};
