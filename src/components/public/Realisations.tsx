import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { TrendingUp, Star, ArrowUpRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CaseStudy {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  forfait: string;
  description: string;
  mainMetric: string;
  mainMetricLabel: string;
  subMetric: string;
  points: string[];
  delay: string;
  badgeAccent?: string;
}

const CASES: CaseStudy[] = [
  {
    id: 'kotto',
    name: 'Maison Kotto',
    category: 'ecommerce',
    categoryLabel: 'Cosmétique & Luxe Africain',
    forfait: 'Forfait Architecture',
    description: "Refonte complète de l'identité de marque, boutique e-commerce avec encaissement Mobile Money automatisé (MTN/Orange) et 3 capsules vidéo par semaine.",
    mainMetric: '+337%',
    mainMetricLabel: 'De conversion e-commerce en 6 mois',
    subMetric: 'Paniers moyens passés de 14 000 FCFA à 38 000 FCFA',
    points: [
      'Passerelle MTN MoMo & Orange Money sans friction avec validation instantanée',
      'Shooting photo studio & direction artistique packaging à Yaoundé',
      'Suivi régulier des stocks et synchronisation multi-boutiques'
    ],
    delay: '7 semaines de déploiement'
  },
  {
    id: 'districash',
    name: 'Districash Nord',
    category: 'saas',
    categoryLabel: 'Grande Distribution & Négoce',
    forfait: 'ARKA-PME SaaS',
    description: 'Déploiement du logiciel ARKA-PME sur 4 dépôts régionaux pour synchroniser les stocks, éliminer les pertes et automatiser la facturation hors-ligne.',
    mainMetric: '12,8M FCFA',
    mainMetricLabel: 'Flux financier consolidé sans écart de caisse',
    subMetric: '12 000 références suivies en temps réel',
    points: [
      "Temps d'inventaire complet réduit de 3 heures à 12 minutes",
      'Fonctionnement 100% garanti hors connexion en cas de coupure',
      'Clôture comptable automatique par caissier et par point de vente'
    ],
    delay: 'Déployé en 10 jours'
  },
  {
    id: 'rapha',
    name: 'Clinique El Rapha',
    category: 'sante',
    categoryLabel: 'Santé & Établissement Médical',
    forfait: 'Forfait Synergie',
    description: 'Site vitrine médical haut de gamme, prise de rendez-vous en ligne, SEO local Yaoundé et 9 sorties terrain pour valoriser les spécialistes et équipements.',
    mainMetric: '4.9 / 5',
    mainMetricLabel: 'Note moyenne Google & Avis Patients',
    subMetric: '1ère position sur les requêtes spécialisées à Yaoundé',
    points: [
      'Taux de rebond réduit à 24% sur mobile avec design ergonomique',
      'Prise de rendez-vous directe synchronisée avec le secrétariat',
      'Capsules pédagogiques vidéo animées par les médecins'
    ],
    delay: '3 semaines de production'
  }
];

export const Realisations: React.FC = () => {
  const { setIsQuoteModalOpen } = useApp();
  const [filter, setFilter] = useState<string>('all');

  const filteredCases = filter === 'all' ? CASES : CASES.filter(c => c.category === filter);

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
