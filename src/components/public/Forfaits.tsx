import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { FORFAITS_DATA } from '../../data/mockData';
import { Check, Sparkles, ArrowRight, ShieldCheck, Globe, Calendar, RefreshCw, HelpCircle, Layers, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrencyPrice } from '../../utils/currency';

export const Forfaits: React.FC = () => {
  const { setIsQuoteModalOpen, setIsAgentModalOpen, currency, setIsBlueprintModalOpen } = useApp();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <section id="forfaits" className="py-28 bg-rk-base relative border-t border-rk-line scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-400">
            Investissement & Modèle Économique
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.15]">
            Des forfaits transparents, calculés pour votre rentabilité
          </h2>
          <p className="text-rk-muted text-base sm:text-lg leading-relaxed font-light max-w-2xl mx-auto">
            Chaque forfait comprend le nom de domaine, l'hébergement sécurisé 1 an, la formation de vos équipes et l'accès permanent au cockpit Arckaton OS.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="pt-4 flex items-center justify-center">
            <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-rk-surface border border-rk-line">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white/[0.1] text-white'
                    : 'text-rk-muted hover:text-rk-text'
                }`}
              >
                Sans engagement
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'text-rk-muted hover:text-rk-text'
                }`}
              >
                <span>Engagement Annuel</span>
                <span className="text-[11px] font-mono bg-emerald-400/20 px-1.5 py-0.2 rounded text-emerald-950 font-bold">
                  -15%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 Main Architectural Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-24">
          {FORFAITS_DATA.map((f, index) => {
            const isFeatured = f.recommended;

            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 ${
                  isFeatured
                    ? 'bg-rk-surface border border-emerald-500/50 shadow-2xl shadow-emerald-500/10 lg:-translate-y-2'
                    : 'bg-rk-surface border border-rk-line hover:border-rk-line-strong'
                }`}
              >
                {/* Popular Pill */}
                {isFeatured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-mono text-[11px] font-bold px-3.5 py-0.5 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Recommandé PME</span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Title & Timing */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-rk-muted uppercase tracking-widest">
                        Forfait {f.number}
                      </span>
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                        {f.delai}
                      </span>
                    </div>
                    <h3 className="font-serif text-3xl font-bold text-white mt-2">
                      {f.name}
                    </h3>
                    <p className="text-xs text-rk-text-secondary mt-2 leading-relaxed min-h-[38px] font-light">
                      {f.tagline}
                    </p>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="pt-4 pb-2 border-y border-rk-line space-y-2">
                    <div>
                      <span className="text-xs text-rk-muted font-mono">Création initiale clé-en-main :</span>
                      <div className="font-serif text-3xl font-bold text-white">
                        {formatCurrencyPrice(f.creation_price_amount || 500000, currency)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-rk-muted font-mono">Suivi & sorties terrain :</span>
                      <div className="text-sm font-semibold text-emerald-400">
                        + {formatCurrencyPrice(
                          f.monthly_price_amount || 200000,
                          currency,
                          { perMonth: true, discountPercent: billingCycle === 'annual' ? 15 : 0 }
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Creation Deliverables */}
                  <div className="space-y-2">
                    <span className="text-xs font-mono text-rk-muted uppercase tracking-wider block">
                      Ce qui est conçu :
                    </span>
                    <ul className="space-y-2 text-xs text-rk-text">
                      {f.creation_features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Monthly Field & Maintenance Outputs */}
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-mono text-rk-muted uppercase tracking-wider block">
                      Chaque mois inclus :
                    </span>
                    <ul className="space-y-2 text-xs text-rk-text-secondary">
                      {f.monthly_features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card CTA Action */}
                <div className="pt-8 mt-6 border-t border-rk-line">
                  <button
                    onClick={() => setIsQuoteModalOpen(true)}
                    className={`w-full py-3.5 px-5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isFeatured
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                        : 'bg-white/[0.06] hover:bg-white/[0.12] text-white border border-rk-line'
                    }`}
                  >
                    <span>Choisir ce forfait</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <div className="text-[11px] text-center text-rk-muted font-mono mt-2.5">
                    {f.retouches}
                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>

        {/* Detailed Comparison Table */}
        <div className="bg-rk-surface border border-rk-line rounded-2xl p-6 sm:p-8 overflow-hidden">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif text-2xl font-bold text-white">
                Matrice comparative exhaustive
              </h3>
              <p className="text-xs text-rk-muted mt-1">
                Tout est personnalisable via le configurateur de devis selon vos priorités et vos contraintes.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-rk-text-secondary bg-white/[0.04] px-3 py-1 rounded-full border border-rk-line self-start sm:self-auto">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Livraison internationale ðŸŒ</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[620px]">
              <thead>
                <tr className="border-b border-rk-line text-rk-muted font-mono">
                  <th className="py-3 px-4 font-normal">Spécifications</th>
                  <th className="py-3 px-4 text-white font-serif text-sm">Initiation</th>
                  <th className="py-3 px-4 text-emerald-400 font-serif text-sm">Synergie (Recommandé)</th>
                  <th className="py-3 px-4 text-amber-300 font-serif text-sm">Architecture</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rk-line-soft text-rk-text-secondary">
                <tr>
                  <td className="py-3.5 px-4 font-medium text-white">Frais de création</td>
                  <td className="py-3.5 px-4 font-mono">{formatCurrencyPrice(380000, currency)}</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{formatCurrencyPrice(750000, currency)}</td>
                  <td className="py-3.5 px-4 font-mono text-amber-300">{formatCurrencyPrice(2900000, currency)}</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-white">Abonnement & activation</td>
                  <td className="py-3.5 px-4 font-mono">{formatCurrencyPrice(160000, currency, { perMonth: true })}</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{formatCurrencyPrice(350000, currency, { perMonth: true })}</td>
                  <td className="py-3.5 px-4 font-mono text-amber-300">{formatCurrencyPrice(580000, currency, { perMonth: true })}</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Architecture web</td>
                  <td className="py-3.5 px-4">Mini-site vitrine (3 à 5 pages)</td>
                  <td className="py-3.5 px-4">Site UX/UI sur-mesure (5 à 8 pages)</td>
                  <td className="py-3.5 px-4">E-commerce complet (50 produits)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Passerelle Mobile Money</td>
                  <td className="py-3.5 px-4 text-rk-muted">Bouton WhatsApp pré-rempli</td>
                  <td className="py-3.5 px-4 text-emerald-400">Formulaires & devis en ligne</td>
                  <td className="py-3.5 px-4 text-amber-300 font-semibold">MTN MoMo & Orange Money direct</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Sorties terrain mensuelles</td>
                  <td className="py-3.5 px-4 font-mono">6 sorties / mois</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">9 sorties / mois</td>
                  <td className="py-3.5 px-4 font-mono text-amber-300">Accompagnement illimité</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Contenus réseaux sociaux</td>
                  <td className="py-3.5 px-4">Kit 6 visuels initiaux</td>
                  <td className="py-3.5 px-4">2 à 3 infographies / semaine</td>
                  <td className="py-3.5 px-4">3 vidéos pro / semaine</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Délai de livraison</td>
                  <td className="py-3.5 px-4 font-mono">10 à 14 jours</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400">2 à 3 semaines</td>
                  <td className="py-3.5 px-4 font-mono">4 à 6 semaines</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Validation BAT & Jalons</td>
                  <td className="py-3.5 px-4">1 round de retouches</td>
                  <td className="py-3.5 px-4 text-emerald-400">2 rounds de retouches</td>
                  <td className="py-3.5 px-4 text-amber-300">Retouches illimitées</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="pt-6 mt-4 border-t border-rk-line flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-rk-muted flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Garantie d'achèvement contractuelle avec pénalités de retard à notre charge.</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsBlueprintModalOpen(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/20"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Voir la Fiche Cadre & SLA (PDF)</span>
              </button>
              <button
                onClick={() => setIsAgentModalOpen(true)}
                className="text-xs text-rk-text-secondary hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Conseiller IA</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
