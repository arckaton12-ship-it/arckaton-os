import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { TrendingUp, Star, ArrowUpRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Realisations: React.FC = () => {
  const { realisations, setIsQuoteModalOpen } = useApp();
  const [filter, setFilter] = useState<string>('all');

  const filteredCases = filter === 'all' ? realisations : realisations.filter(c => c.category === filter);

  return (
    <section id="realisations" className="py-28 bg-[#0a0e17] relative border-t border-white/[0.08] scroll-mt-20 overflow-hidden">
      {/* Blueprint Grid & Atmospheric Lighting */}
      <div className="absolute inset-0 bg-blueprint-grid opacity-25 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[450px] bg-gradient-to-b from-emerald-500/[0.05] via-transparent to-transparent pointer-events-none blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-400">
            Preuves & Résultats Vérifiables
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.15]">
            Des systèmes conçus pour générer des résultats tangibles
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed font-light max-w-2xl mx-auto">
            Nous ne concevons pas de vitrines inertes : chacun de nos déploiements est taillé pour accélérer le chiffre d'affaires, éliminer les pertes opérationnelles et ancrer votre marque.
          </p>

          {/* Filter Pills */}
          <div className="pt-4 flex items-center justify-center gap-2">
            {[
              { id: 'all', label: 'Toutes les réalisations' },
              { id: 'ecommerce', label: 'E-commerce' },
              { id: 'saas', label: 'ARKA-PME SaaS' },
              { id: 'sante', label: 'Santé & Services' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  filter === tab.id
                    ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Case Studies Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {realisations.length === 0 && (
            <div className="col-span-full text-center py-16 text-sm text-slate-400">
              Les études de cas sont en cours de publication par l'équipe Arckaton.
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {filteredCases.map((cs, idx) => (
              <motion.div
                key={cs.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="bg-[#0f1523] rounded-2xl border border-white/[0.08] p-8 flex flex-col justify-between hover:border-white/[0.16] transition-all duration-300 group"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      {cs.categoryLabel}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{cs.forfait}</span>
                  </div>

                  <div>
                    <h3 className="font-serif text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {cs.name}
                    </h3>
                    <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed font-light">
                      {cs.description}
                    </p>
                  </div>

                  {/* Impact Metric Block */}
                  <div className="bg-[#0a0e17] p-5 rounded-xl border border-white/[0.06] text-center space-y-1">
                    <div className="font-serif text-3xl sm:text-4xl font-bold text-emerald-400">
                      {cs.mainMetric}
                    </div>
                    <div className="text-xs font-medium text-slate-200">
                      {cs.mainMetricLabel}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {cs.subMetric}
                    </div>
                  </div>

                  <ul className="text-xs text-slate-300 space-y-2">
                    {cs.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 border-t border-white/[0.08] mt-6 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">{cs.delay}</span>
                  <button
                    onClick={() => setIsQuoteModalOpen(true)}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Projet similaire</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
};
