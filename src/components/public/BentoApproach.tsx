import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Laptop, Palette, Rocket, CheckCircle2, ArrowRight, ShieldCheck, Smartphone, Camera, TrendingUp, Network, Film } from 'lucide-react';
import { OFFICIAL_KNOWLEDGE } from '../../data/mockData';
import { motion } from 'motion/react';
import fieldProductionCamImg from '../../assets/images/field_production_cam_1789213222736.webp';
import polesNetworkHubImg from '../../assets/images/poles_network_hub_1789213238339.webp';

export const BentoApproach: React.FC = () => {
  const { openAgentWithPole } = useApp();

  return (
    <section className="py-16 sm:py-28 bg-rk-base relative border-t border-rk-line overflow-hidden">
      {/* Blueprint grid and ambient glow */}
      <div className="absolute inset-0 bg-blueprint-grid opacity-25 pointer-events-none" />
      <div className="absolute -top-40 right-10 w-96 h-96 bg-purple-500/[0.05] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-10 w-96 h-96 bg-blue-500/[0.05] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-400">
            Méthodologie & Architecture
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.15]">
            Trois pôles d'expertise unis pour bâtir votre croissance
          </h2>
          <p className="text-rk-muted text-base sm:text-lg leading-relaxed font-light max-w-2xl mx-auto">
            Nous conjuguons l'ingénierie logicielle la plus rigoureuse à une direction artistique de haut standing et un marketing d'activation terrain ancré dans la réalité locale.
          </p>
        </div>

        {/* Asymmetrical Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Large Card: Pôle Tech & Software (7 cols) */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7 rounded-2xl bg-rk-surface border border-rk-line p-8 sm:p-10 flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Laptop className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Pôle Ingénierie & ARKA-PME
                </span>
              </div>

              <div>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  Systèmes Web & SaaS Résilients
                </h3>
                <p className="text-rk-text-secondary text-sm sm:text-base mt-2.5 leading-relaxed font-light">
                  Développement web ultra-rapide, boutique e-commerce avec encaissement instantané par API MTN MoMo et Orange Money, et notre logiciel ARKA-PME opérant à 100% même en cas de coupure de réseau.
                </p>
              </div>

              {/* Technical Badges Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-rk-base border border-rk-line-soft space-y-1">
                  <div className="text-[11px] text-rk-muted font-mono">Mobile Money</div>
                  <div className="text-sm font-semibold text-white">MTN & Orange</div>
                  <div className="text-[11px] text-emerald-400">0% d'échec de passerelle</div>
                </div>

                <div className="p-3.5 rounded-xl bg-rk-base border border-rk-line-soft space-y-1">
                  <div className="text-[11px] text-rk-muted font-mono">Mode Hybride</div>
                  <div className="text-sm font-semibold text-white">Offline First</div>
                  <div className="text-[11px] text-rk-muted">Sync automatique dès reconnexion</div>
                </div>

                <div className="p-3.5 rounded-xl bg-rk-base border border-rk-line-soft space-y-1">
                  <div className="text-[11px] text-rk-muted font-mono">Volume Consolidé</div>
                  <div className="text-sm font-semibold text-emerald-400">12,8M FCFA</div>
                  <div className="text-[11px] text-rk-muted">Gérés sans perte de caisse</div>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-sm text-rk-text-secondary pt-2">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Architecture cloud évolutive, temps de chargement &lt; 0.8s certifié.</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Hébergement sécurisé 1 an inclus avec sauvegardes quotidiennes automatiques.</span>
                </li>
              </ul>
            </div>

            <div className="pt-8 border-t border-rk-line mt-8 flex items-center justify-between">
              <span className="text-xs font-mono text-rk-muted">Livraison : 2 à 4 semaines</span>
              <button
                onClick={() => openAgentWithPole('Tech')}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Échanger avec le Pôle Tech</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>

          {/* Right Stack: Creative Studio & Growth (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Card 2: Pôle Studio Créatif */}
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl bg-rk-surface border border-rk-line p-7 sm:p-8 flex flex-col justify-between hover:border-purple-400/30 transition-all duration-300 flex-1"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Palette className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                    Pôle Studio
                  </span>
                </div>

                <div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                    Identité & Standing Visuel
                  </h3>
                  <p className="text-rk-text-secondary text-xs sm:text-sm mt-2 leading-relaxed font-light">
                    Logotypes intemporels, typographies sur-mesure, packaging haut de gamme et shootings photo/vidéo professionnels en studio et sur site client.
                  </p>
                </div>

                <div className="text-xs text-rk-text-secondary space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span>Kit de marque complet & direction artistique 2026.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span>Validation rigoureuse par Bon à Tirer (BAT).</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-rk-line mt-6 flex items-center justify-between">
                <span className="text-xs font-mono text-rk-muted">2 à 3 rounds inclus</span>
                <button
                  onClick={() => openAgentWithPole('Creatif')}
                  className="text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Détails Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

            {/* Card 3: Pôle Growth & Terrain */}
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-2xl bg-rk-surface border border-rk-line p-7 sm:p-8 flex flex-col justify-between hover:border-blue-400/30 transition-all duration-300 flex-1"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono text-blue-300 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                    Pôle Growth & Terrain
                  </span>
                </div>

                <div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                    Sorties Terrain & Acquisition
                  </h3>
                  <p className="text-rk-text-secondary text-xs sm:text-sm mt-2 leading-relaxed font-light">
                    Le digital prend tout son sens sur le terrain. Nous déployons nos équipes à Yaoundé et Douala pour capter des contenus réels et convertir vos prospects.
                  </p>
                </div>

                {/* Field Camera Rig Preview */}
                <div className="relative h-28 rounded-xl overflow-hidden bg-rk-inset border border-rk-line-soft group">
                  <img 
                    src={fieldProductionCamImg} 
                    alt="Équipement de captation cinéma terrain Arckaton"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f1523]/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-2 left-2 text-[11px] font-mono text-blue-300 bg-rk-base/80 backdrop-blur-sm px-2 py-0.5 rounded flex items-center gap-1.5">
                    <Film className="w-3 h-3 text-blue-400" />
                    <span>Caméra Cinéma & Éclairage Mobile</span>
                  </div>
                </div>

                <div className="text-xs text-rk-text-secondary space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span>6 à 9 sorties terrain mensuelles (Forfaits Synergie & Arch.).</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span>Suivi chiffré des ventes et reporting ROI mensuel.</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-rk-line mt-6 flex items-center justify-between">
                <span className="text-xs font-mono text-rk-muted">+337% de conversion</span>
                <button
                  onClick={() => openAgentWithPole('Digital')}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Détails Growth</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

          </div>

        </div>

        {/* 6 Poles Operational Network Ecosystem Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 rounded-2xl bg-rk-surface border border-rk-line overflow-hidden group"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            <div className="lg:col-span-5 p-8 sm:p-10 space-y-4">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-mono text-blue-400">
                <Network className="w-3.5 h-3.5" />
                <span>Gouvernance & Synergie Opérationnelle</span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
                6 Pôles d'Excellence Connectés en Temps Réel
              </h3>

              <p className="text-xs sm:text-sm text-rk-text-secondary font-light leading-relaxed">
                Aucun projet n'avance en silo. Notre Direction Générale, le Pôle Tech & Logiciel, le Studio Créatif, le Pôle Digital Terrain, le Service Client et nos Partenaires Logistiques opèrent sur un même tableau de bord unifié.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono text-rk-text-secondary">
                <div className="p-2.5 rounded-lg bg-rk-base border border-rk-line-soft flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Direction Stratégique</span>
                </div>
                <div className="p-2.5 rounded-lg bg-rk-base border border-rk-line-soft flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Pôle Tech ARKA-PME</span>
                </div>
                <div className="p-2.5 rounded-lg bg-rk-base border border-rk-line-soft flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Studio Créatif & BAT</span>
                </div>
                <div className="p-2.5 rounded-lg bg-rk-base border border-rk-line-soft flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>Digital & Terrain Ydé/Dla</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 h-72 sm:h-80 lg:h-96 relative overflow-hidden bg-rk-inset">
              <img 
                src={polesNetworkHubImg} 
                alt="Architecture topologique des 6 pôles opérationnels Arckaton"
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#0c1322] via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 right-3 bg-rk-base/85 backdrop-blur-md border border-rk-line px-3 py-1.5 rounded-lg text-[11px] font-mono text-rk-text-secondary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Interconnexion Opérationnelle Active</span>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
