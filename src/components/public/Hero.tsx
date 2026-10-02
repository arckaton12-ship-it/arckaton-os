import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { ArrowUpRight, Sparkles, ShieldCheck, TrendingUp, Star, CheckCircle2, Play, Boxes, Smartphone, Camera, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import heroSystemCubeImg from '../../assets/images/arckaton_system_cube_1789213196858.jpg';

export const Hero: React.FC = () => {
  const { setIsQuoteModalOpen, setIsAgentModalOpen, setIsTrialModalOpen, setMode } = useApp();
  const [activeCockpitTab, setActiveCockpitTab] = useState<'sales' | 'inventory' | 'field'>('sales');

  return (
    <section className="relative pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden bg-rk-base">
      {/* Subtle Radial Ambient Lighting & Blueprint Grid */}
      <div className="absolute inset-0 bg-blueprint-grid opacity-35 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-emerald-500/[0.09] via-blue-500/[0.03] to-transparent pointer-events-none blur-2xl" />
      <div className="absolute top-1/4 -right-40 w-96 h-96 bg-emerald-500/[0.06] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-40 w-96 h-96 bg-blue-500/[0.05] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Editorial Eyebrow */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex items-center justify-center mb-6"
        >
          <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-rk-line px-4 py-1.5 rounded-full text-xs text-slate-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Agence Digitale & Éditeur Logiciel • Yaoundé & Partout dans le Monde</span>
          </div>
        </motion.div>

        {/* Master Headline */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className="text-center max-w-4xl mx-auto space-y-6"
        >
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08]">
            On ne livre pas un site.<br />
            <span className="text-emerald-400 font-normal italic">
              On déploie votre système.
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-sans font-light">
            Conception sur-mesure de plateformes e-commerce avec encaissement instantané <strong className="text-white font-medium">MTN MoMo & Orange Money</strong>, activations terrain et le logiciel <strong className="text-emerald-400 font-medium">ARKA-PME</strong> pour piloter votre entreprise sans dépendre d'Internet.
          </p>

          {/* Action Call-to-Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              onClick={() => setIsQuoteModalOpen(true)}
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <span>Demander un devis interactif</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsTrialModalOpen(true)}
              className="w-full sm:w-auto bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-rk-line px-6 py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-slate-200" />
              <span>Tester ARKA-PME (30j gratuit)</span>
            </button>

            <button
              onClick={() => setIsAgentModalOpen(true)}
              className="w-full sm:w-auto bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-rk-line px-5 py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Conseiller IA</span>
            </button>
          </div>

          {/* Clean Metric Badges Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 max-w-3xl mx-auto border-t border-rk-line">
            <div className="text-center sm:text-left space-y-0.5">
              <div className="font-serif text-2xl font-bold text-white tracking-tight">30 jours</div>
              <div className="text-xs text-slate-400">Essai complet ARKA-PME sans engagement</div>
            </div>

            <div className="text-center sm:text-left space-y-0.5">
              <div className="font-serif text-2xl font-bold text-emerald-400 tracking-tight">+337%</div>
              <div className="text-xs text-slate-400">Croissance moyenne de conversion e-commerce</div>
            </div>

            <div className="text-center sm:text-left space-y-0.5">
              <div className="font-serif text-2xl font-bold text-white tracking-tight">4.9 / 5</div>
              <div className="text-xs text-slate-400">Satisfaction clients certifiée (Yaoundé & Douala)</div>
            </div>
          </div>
        </motion.div>

        {/* Master Visual & Live Interactive Cockpit Showcase */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
          className="mt-16 max-w-5xl mx-auto space-y-6"
        >
          {/* Architectural System Header Banner */}
          <div className="relative rounded-2xl overflow-hidden border border-rk-line bg-rk-surface shadow-2xl group">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              {/* Left Details */}
              <div className="lg:col-span-6 p-6 sm:p-8 space-y-4 z-10">
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-[11px] font-mono text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Architecture Intégrée Arckaton v2.4</span>
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
                  L'Infrastructure Complète de votre Croissance
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
                  Au-delà d'une vitrine, un écosystème technique résilient réunissant caisse POS hors-ligne, tunnel e-commerce MoMo et activations studio terrain à Yaoundé et Douala.
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono text-slate-400">
                  <span className="bg-white/[0.04] border border-rk-line px-2.5 py-1 rounded-md">99.9% Uptime</span>
                  <span className="bg-white/[0.04] border border-rk-line px-2.5 py-1 rounded-md">MTN / Orange Direct</span>
                  <span className="bg-white/[0.04] border border-rk-line px-2.5 py-1 rounded-md">Offline-First Engine</span>
                </div>
              </div>

              {/* Right Hero Image Render */}
              <div className="lg:col-span-6 relative h-64 sm:h-72 lg:h-80 overflow-hidden bg-rk-inset">
                <img 
                  src={heroSystemCubeImg} 
                  alt="Système Central Arckaton en 3D Isométrique" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 opacity-90" 
                />
                <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#0c1322] via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 right-3 bg-rk-base/80 backdrop-blur-md border border-rk-line px-3 py-1 rounded-lg text-[11px] font-mono text-emerald-400">
                  Système Central ARCKATON
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-rk-line bg-rk-surface shadow-2xl overflow-hidden">
            
            {/* Window Top Bar */}
            <div className="bg-rk-chrome px-4 py-3 flex flex-wrap items-center justify-between border-b border-rk-line gap-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                </div>
                <span className="ml-2 text-xs font-mono text-slate-400 hidden sm:inline">
                  cockpit.arka-pme.app — Arckaton Operating System
                </span>
              </div>

              {/* Interactive Cockpit Tabs */}
              <div className="flex items-center gap-1.5 bg-rk-base p-1 rounded-xl border border-rk-line">
                <button
                  onClick={() => setActiveCockpitTab('sales')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeCockpitTab === 'sales'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Caisse & Ventes
                </button>
                <button
                  onClick={() => setActiveCockpitTab('inventory')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeCockpitTab === 'inventory'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Stock & Offline
                </button>
                <button
                  onClick={() => setActiveCockpitTab('field')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeCockpitTab === 'field'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sorties Terrain
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMode('dashboard')}
                  className="text-xs font-medium text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] px-3 py-1.5 rounded-lg transition-colors border border-rk-line"
                >
                  Ouvrir l'OS &rarr;
                </button>
              </div>
            </div>

            {/* Interactive Cockpit Content View */}
            <div className="p-6 sm:p-8 bg-rk-base">
              <AnimatePresence mode="wait">
                {activeCockpitTab === 'sales' && (
                  <motion.div
                    key="sales"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-rk-surface border border-rk-line-soft space-y-1">
                        <div className="text-xs text-slate-400 font-mono">Chiffre d'Affaires du Jour</div>
                        <div className="font-serif text-2xl font-bold text-white">+125 000 FCFA</div>
                        <div className="text-xs text-emerald-400 font-medium">18 transactions enregistrées</div>
                      </div>

                      <div className="p-4 rounded-xl bg-rk-surface border border-rk-line-soft space-y-1">
                        <div className="text-xs text-slate-400 font-mono">Mobile Money (MTN + Orange)</div>
                        <div className="font-serif text-2xl font-bold text-white">78 500 FCFA</div>
                        <div className="text-xs text-slate-400">62% du volume total de la journée</div>
                      </div>

                      <div className="p-4 rounded-xl bg-rk-surface border border-rk-line-soft space-y-1">
                        <div className="text-xs text-slate-400 font-mono">Synchronisation Cloud</div>
                        <div className="font-serif text-2xl font-bold text-emerald-400">100% En règle</div>
                        <div className="text-xs text-slate-400">Boutique Yaoundé Bastos & Kotto</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-rk-surface border border-rk-line-soft flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Mode caisse rapide actif : encaissement sans interruption même en coupure de réseau.</span>
                      </div>
                      <span className="font-mono text-slate-400">v2.4.1</span>
                    </div>
                  </motion.div>
                )}

                {activeCockpitTab === 'inventory' && (
                  <motion.div
                    key="inventory"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-rk-surface border border-rk-line-soft space-y-1">
                        <div className="text-xs text-slate-400 font-mono">Articles en Stock</div>
                        <div className="font-serif text-2xl font-bold text-white">1 420 références</div>
                        <div className="text-xs text-slate-400">Réparties sur 2 dépôts</div>
                      </div>

                      <div className="p-4 rounded-xl bg-rk-surface border border-rk-line-soft space-y-1">
                        <div className="text-xs text-slate-400 font-mono">Durée d'Inventaire</div>
                        <div className="font-serif text-2xl font-bold text-amber-400">12 minutes</div>
                        <div className="text-xs text-slate-400">Gain de temps de 93% vs carnet papier</div>
                      </div>

                      <div className="p-4 rounded-xl bg-rk-surface border border-rk-line-soft space-y-1">
                        <div className="text-xs text-slate-400 font-mono">Alertes Réapprovisionnement</div>
                        <div className="font-serif text-2xl font-bold text-white">3 articles</div>
                        <div className="text-xs text-amber-400 font-medium">Bons de commande pré-remplis</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-rk-surface border border-rk-line-soft flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-amber-400" />
                        <span>Traçabilité complète des entrées et sorties pour stopper les disparitions de marchandises.</span>
                      </div>
                      <span className="font-mono text-slate-400">Sécurisé</span>
                    </div>
                  </motion.div>
                )}

                {activeCockpitTab === 'field' && (
                  <motion.div
                    key="field"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-rk-surface border border-rk-line-soft space-y-1">
                        <div className="text-xs text-slate-400 font-mono">Sorties Terrain Mensuelles</div>
                        <div className="font-serif text-2xl font-bold text-white">9 sessions / mois</div>
                        <div className="text-xs text-slate-400">Incluses dans le Forfait Synergie</div>
                      </div>

                      <div className="p-4 rounded-xl bg-rk-surface border border-rk-line-soft space-y-1">
                        <div className="text-xs text-slate-400 font-mono">Livrables Vidéo & Photo</div>
                        <div className="font-serif text-2xl font-bold text-blue-400">12 capsules HD</div>
                        <div className="text-xs text-slate-400">Montage professionnel & validation BAT</div>
                      </div>

                      <div className="p-4 rounded-xl bg-rk-surface border border-rk-line-soft space-y-1">
                        <div className="text-xs text-slate-400 font-mono">Prochaine Captation</div>
                        <div className="font-serif text-2xl font-bold text-white">Demain 10h</div>
                        <div className="text-xs text-emerald-400 font-medium">Boutique Maison Kotto (Yaoundé)</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-rk-surface border border-rk-line-soft flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-blue-400" />
                        <span>Créatifs et vidéastes sur place pour nourrir vos réseaux sociaux et vos campagnes pub.</span>
                      </div>
                      <span className="font-mono text-slate-400">Pôle Créatif</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </motion.div>

      </div>
    </section>
  );
};
