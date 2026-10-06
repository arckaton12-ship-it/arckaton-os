import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { TrendingUp, Star, ArrowUpRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { REALISATION_CATEGORIES, getCategoryLabel } from '../../data/categories';
import { useCarouselKeyboard } from '../../hooks/useCarouselKeyboard';

export const Realisations: React.FC = () => {
  const { realisations, ouvrirWizard } = useApp();
  const [filter, setFilter] = useState<string>('all');
  const onCarouselKey = useCarouselKeyboard();

  const filteredCases = filter === 'all' ? realisations : realisations.filter(c => c.category === filter);

  // Filtres alignés sur les catégories du CMS : on n'affiche que celles qui ont au moins une réalisation
  const usedCategoryIds = new Set(realisations.map((r) => r.category));
  const filters = [
    { id: 'all', label: 'Toutes les réalisations' },
    ...REALISATION_CATEGORIES.filter((c) => usedCategoryIds.has(c.id)).map((c) => ({ id: c.id, label: c.label })),
  ];

  return (
    <section id="realisations" className="py-16 sm:py-28 bg-rk-base relative border-t border-rk-line scroll-mt-20 overflow-hidden">
      {/* Blueprint Grid & Atmospheric Lighting */}
      <div className="absolute inset-0 bg-blueprint-grid opacity-25 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[450px] bg-gradient-to-b from-emerald-500/[0.05] via-transparent to-transparent pointer-events-none blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16 space-y-4">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-400">
            Preuves & Résultats Vérifiables
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.15]">
            Des systèmes conçus pour générer des résultats tangibles
          </h2>
          <p className="text-rk-muted text-base sm:text-lg leading-relaxed font-light max-w-2xl mx-auto">
            Nous ne concevons pas de vitrines inertes : chacun de nos déploiements est taillé pour accélérer le chiffre d'affaires, éliminer les pertes opérationnelles et ancrer votre marque.
          </p>

          {/* Filter Pills */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
            {filters.map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                aria-pressed={filter === tab.id}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  filter === tab.id
                    ? 'bg-white/[0.1] text-white border border-rk-line-strong'
                    : 'text-rk-muted hover:text-rk-text border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Case Studies Grid (carrousel au doigt sur mobile) */}
        <div
          role="region"
          aria-label="Réalisations — faire défiler avec les flèches gauche et droite"
          tabIndex={0}
          onKeyDown={onCarouselKey}
          className="flex gap-4 overflow-x-auto no-scrollbar rk-snap snap-x -mx-4 px-4 pb-3 lg:mx-0 lg:px-0 lg:pb-0 lg:grid lg:grid-cols-3 lg:gap-8 lg:overflow-visible"
        >
          {realisations.length === 0 && (
            <div className="w-full lg:col-span-full text-center py-16 text-sm text-rk-muted">
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
                className="snap-start shrink-0 w-[86%] sm:w-[68%] lg:w-auto bg-rk-surface rounded-2xl border border-rk-line p-6 sm:p-8 flex flex-col justify-between hover:border-rk-line-strong transition-all duration-300 group"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      {getCategoryLabel(cs.category)}
                    </span>
                    <span className="text-xs font-mono text-rk-muted">{cs.forfait}</span>
                  </div>

                  <div>
                    <h3 className="font-serif text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {cs.name}
                    </h3>
                    <p className="text-rk-text-secondary text-xs sm:text-sm mt-2 leading-relaxed font-light">
                      {cs.description}
                    </p>
                  </div>

                  {/* Impact Metric Block */}
                  <div className="bg-rk-base p-5 rounded-xl border border-rk-line-soft text-center space-y-1">
                    <div className="font-serif text-3xl sm:text-4xl font-bold text-emerald-400">
                      {cs.mainMetric}
                    </div>
                    <div className="text-xs font-medium text-rk-text">
                      {cs.mainMetricLabel}
                    </div>
                    <div className="text-xs text-rk-muted">
                      {cs.subMetric}
                    </div>
                  </div>

                  <ul className="text-xs text-rk-text-secondary space-y-2">
                    {cs.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 border-t border-rk-line mt-6 flex items-center justify-between">
                  <span className="text-xs font-mono text-rk-muted">{cs.delay}</span>
                  <button
                    onClick={() => ouvrirWizard('devis', cs.category)}
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
