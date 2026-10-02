import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Play, Clock, WifiOff, Smartphone, Boxes, ArrowUpRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { ArkaInteractiveDemo } from './ArkaInteractiveDemo';
import { motion } from 'motion/react';
import arkaPosTerminalImg from '../../assets/images/arka_pos_terminal_1789213210031.jpg';

export const ProductArkaPme: React.FC = () => {
  const { setIsTrialModalOpen, setIsQuoteModalOpen } = useApp();

  return (
    <section id="produit" className="py-28 bg-rk-base relative border-t border-rk-line scroll-mt-20 overflow-hidden">
      {/* Blueprint Grid & Lighting */}
      <div className="absolute inset-0 bg-blueprint-grid opacity-25 pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-emerald-500/[0.05] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Tag */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-20">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono px-3.5 py-1 rounded-full">
            <Boxes className="w-3.5 h-3.5" />
            <span>Logiciel SaaS Développé par Arckaton</span>
          </div>
          
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.15]">
            ARKA-PME : Le cockpit de gestion taillé pour les réalités africaines
          </h2>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto font-light leading-relaxed">
            Fini les cahiers de compte perdus et les inventaires interminables de 3 heures. Caisse tactile, stocks en temps réel, créances clients et paiements Mobile Money consolidés dans un outil qui fonctionne même hors connexion.
          </p>
        </div>

        {/* Two-Column Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Feature Highlights */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="space-y-4">
              <motion.div 
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="flex items-start gap-4 p-5 rounded-2xl bg-rk-surface border border-rk-line hover:border-rk-line-strong transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-bold text-white">Inventaire complet en 12 minutes</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed font-light">
                    Testé et validé chez Districash Nord sur 12 000 références. Rapprochement automatique des écarts de caisse en fin de vacation.
                  </p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex items-start gap-4 p-5 rounded-2xl bg-rk-surface border border-rk-line hover:border-rk-line-strong transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-bold text-white">Résistant aux coupures de réseau</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed font-light">
                    Mode hybride intelligent : encaissez et vendez en continu sans internet. Vos données se synchronisent automatiquement dès le retour du signal.
                  </p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="flex items-start gap-4 p-5 rounded-2xl bg-rk-surface border border-rk-line hover:border-rk-line-strong transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-bold text-white">Mobile Money MTN & Orange direct</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed font-light">
                    Encaissement direct en caisse. Chaque transaction par MoMo ou Orange Money est validée immédiatement et imprimée sur ticket de caisse.
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Trial Trigger CTA */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setIsTrialModalOpen(true)}
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Démarrer l'essai 30 jours gratuit</span>
              </button>

              <button
                onClick={() => setIsQuoteModalOpen(true)}
                className="w-full sm:w-auto bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border border-rk-line px-5 py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Intégrer à un site web</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-xs text-slate-400 font-mono flex items-center gap-2 pt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Sans engagement • Configuration en 2h • Support WhatsApp dédié</span>
            </div>

          </div>

          {/* Right Column: Live Interactive Cockpit Simulator */}
          <div className="lg:col-span-7 space-y-6">
            <ArkaInteractiveDemo />

            {/* Hardware & Offline Resilience Card */}
            <div className="rounded-2xl border border-rk-line bg-rk-surface p-5 overflow-hidden relative group">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                <div className="sm:col-span-5 h-36 rounded-xl overflow-hidden relative bg-rk-inset">
                  <img 
                    src={arkaPosTerminalImg} 
                    alt="Terminal tactile ARKA-PME avec QR Code Mobile Money" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c1322]/80 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute bottom-2 left-2 text-[9px] font-mono bg-black/60 backdrop-blur-sm text-emerald-400 px-2 py-0.5 rounded">
                    Format Tablette & POS
                  </span>
                </div>
                <div className="sm:col-span-7 space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-mono text-white font-semibold">Zéro matériel imposé</span>
                  </div>
                  <p className="text-xs text-slate-300 font-light leading-relaxed">
                    Déployable sur vos tablettes Android, iPad, ordinateurs de caisse ou smartphones déjà en place dans votre commerce. Compatible avec imprimantes thermiques Bluetooth et tiroirs-caisses standard.
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-slate-400">
                    <span className="text-emerald-400">✓ Ticket MoMo instantané</span>
                    <span>•</span>
                    <span>100% Hors-Ligne</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
