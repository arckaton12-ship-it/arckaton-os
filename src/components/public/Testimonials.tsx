import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Star, Quote, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

export const Testimonials: React.FC = () => {
  const { temoignages } = useApp();

  if (temoignages.length === 0) return null;

  return (
    <section id="temoignages" className="py-24 bg-[#080d1e] relative overflow-hidden border-t border-white/[0.08]">
      <div className="absolute inset-0 bg-blueprint-grid opacity-25 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-400 flex items-center justify-center gap-2">
            <Quote className="w-3.5 h-3.5" />
            Voix de nos clients
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.15]">
            Ils déploient, <span className="text-emerald-400 font-normal italic">ils témoignent.</span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed font-light max-w-2xl mx-auto">
            Des résultats vérifiables et des équipes mobilisées sur le terrain, au Cameroun comme à l'international.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {temoignages.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              className="bg-[#0f1523] border border-white/[0.08] rounded-2xl p-7 flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300"
            >
              <div>
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-light">
                  « {t.text} »
                </p>
              </div>

              <div className="pt-6 mt-4 border-t border-white/[0.06]">
                <div className="font-serif text-base font-bold text-white">{t.author}</div>
                <div className="text-[11px] font-mono text-slate-400">
                  {t.role} — {t.company}
                </div>
                {t.metrics && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg w-fit">
                    <TrendingUp className="w-3 h-3" />
                    {t.metrics}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};