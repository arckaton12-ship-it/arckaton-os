import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { X, Printer, ShieldCheck, CheckCircle2, Download, Layers, Sparkles, Network, ArrowRight, Zap, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OFFICIAL_KNOWLEDGE } from '../../data/mockData';
import { useDialogA11y } from '../../hooks/useDialogA11y';

export const BlueprintModal: React.FC = () => {
  const { isBlueprintModalOpen, setIsBlueprintModalOpen, setIsQuoteModalOpen } = useApp();
  const [activeTab, setActiveTab] = useState<'doctrine' | 'sla' | 'arka'>('doctrine');
  const dialogRef = useDialogA11y<HTMLDivElement>(isBlueprintModalOpen, () => setIsBlueprintModalOpen(false));

  if (!isBlueprintModalOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/80 backdrop-blur-md">
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Fiche cadre et méthode opérationnelle"
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-4xl bg-rk-surface border border-rk-line rounded-3xl shadow-2xl overflow-hidden text-rk-text flex flex-col max-h-[90vh] outline-none"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-rk-line bg-rk-inset">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-bold text-white">
                    Fiche Cadre & Méthode Opérationnelle
                  </h3>
                  <span className="text-[11px] font-mono bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Officiel v2.4
                  </span>
                </div>
                <p className="text-xs text-rk-muted font-light">
                  Cabinet Arckaton • Mimboman, Yaoundé & International
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-rk-text-secondary hover:text-white bg-white/[0.05] hover:bg-white/[0.1] px-3 py-1.5 rounded-xl border border-rk-line transition-colors cursor-pointer"
                title="Imprimer ou enregistrer en PDF"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span>Imprimer / PDF</span>
              </button>
              <button
                onClick={() => setIsBlueprintModalOpen(false)}
                aria-label="Fermer"
                className="p-2 rounded-xl text-rk-muted hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 pt-4 border-b border-rk-line bg-rk-base flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('doctrine')}
              className={`pb-3 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'doctrine'
                  ? 'border-emerald-400 text-emerald-400 font-semibold'
                  : 'border-transparent text-rk-muted hover:text-rk-text'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>1. Méthode des 6 Pôles</span>
            </button>

            <button
              onClick={() => setActiveTab('sla')}
              className={`pb-3 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'sla'
                  ? 'border-emerald-400 text-emerald-400 font-semibold'
                  : 'border-transparent text-rk-muted hover:text-rk-text'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>2. Engagements & SLA Contractuels</span>
            </button>

            <button
              onClick={() => setActiveTab('arka')}
              className={`pb-3 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'arka'
                  ? 'border-emerald-400 text-emerald-400 font-semibold'
                  : 'border-transparent text-rk-muted hover:text-rk-text'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>3. Spécifications ARKA-PME</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="p-6 overflow-y-auto space-y-6 text-rk-text-secondary text-xs sm:text-sm font-light leading-relaxed flex-1">
            
            {/* Tab 1: Doctrine */}
            {activeTab === 'doctrine' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-200 text-xs">
                  <span className="font-semibold text-white block mb-1">
                    « On ne livre pas un simple site web. On livre un système digital complet. »
                  </span>
                  Notre approche s'appuie sur une synchronisation stricte entre la direction, les développeurs, le studio créatif et les équipes de tournage terrain.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-rk-inset border border-rk-line-soft space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Pôle 1 : Direction & Stratégie</span>
                    </div>
                    <p className="text-xs text-rk-text-secondary">
                      Gouvernance globale, cadrage initial, validation du modèle de rentabilité et supervision des jalons de chaque client.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-rk-inset border border-rk-line-soft space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 font-mono text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <span>Pôle 2 : Studio & Créatif</span>
                    </div>
                    <p className="text-xs text-rk-text-secondary">
                      Direction artistique exclusive, logotypes vectoriels, chartes graphiques complètes et validation BAT préalable à toute production.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-rk-inset border border-rk-line-soft space-y-2">
                    <div className="flex items-center gap-2 text-blue-400 font-mono text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>Pôle 3 : Tech & Architecture SaaS</span>
                    </div>
                    <p className="text-xs text-rk-text-secondary">
                      Développement Next.js / Vite, intégration webhooks MTN MoMo & Orange Money, moteur hors-ligne ARKA-PME et serveurs haute disponibilité.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-rk-inset border border-rk-line-soft space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Pôle 4 : Growth & Marketing Digital</span>
                    </div>
                    <p className="text-xs text-rk-text-secondary">
                      SEO local Yaoundé / Douala / CEMAC, gestion des campagnes Meta Ads & Google Ads, tunnels de vente et suivi du ROI commercial.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-rk-inset border border-rk-line-soft space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span>Pôle 5 : Expérience Client & Terrain</span>
                    </div>
                    <p className="text-xs text-rk-text-secondary">
                      6 à 9 sorties terrain par mois avec caméra cinéma et éclairage studio pro pour capturer la réalité des stocks et ateliers des clients.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-rk-inset border border-rk-line-soft space-y-2">
                    <div className="flex items-center gap-2 text-rk-muted font-mono text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span>Pôle 6 : Partenaires & Conseil Externe</span>
                    </div>
                    <p className="text-xs text-rk-text-secondary">
                      Accompagnement juridique (contrats commerciaux, CGV e-commerce), conseil fiscalité locale et réseau d'influenceurs KOL certifiés.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: SLA & Engagements */}
            {activeTab === 'sla' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-4 rounded-xl bg-rk-inset border border-rk-line-soft">
                    <div className="font-serif text-2xl font-bold text-emerald-400">&lt; 2h</div>
                    <div className="text-[11px] text-rk-muted font-mono mt-1">Délai Réponse Support</div>
                  </div>
                  <div className="p-4 rounded-xl bg-rk-inset border border-rk-line-soft">
                    <div className="font-serif text-2xl font-bold text-emerald-400">100%</div>
                    <div className="text-[11px] text-rk-muted font-mono mt-1">Propriété Intellectuelle Client</div>
                  </div>
                  <div className="p-4 rounded-xl bg-rk-inset border border-rk-line-soft">
                    <div className="font-serif text-2xl font-bold text-amber-400">5% / sem</div>
                    <div className="text-[11px] text-rk-muted font-mono mt-1">Pénalité Contractuelle Retard</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-serif text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Garantie de Livraison & Calendrier Contractuel</span>
                  </h4>
                  <p className="text-xs text-rk-text-secondary">
                    Chaque devis signé stipule une date limite de livraison ferme (ex. 14 jours ouvrés pour Initiation, 3 à 4 semaines pour Synergie). Tout retard non imputable au client entraîne une remise automatique de 5% par semaine entamée.
                  </p>

                  <h4 className="font-serif text-base font-bold text-white flex items-center gap-2 pt-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Processus de Validation BAT (Bon À Tirer)</span>
                  </h4>
                  <p className="text-xs text-rk-text-secondary">
                    Aucune mise en production n'est effectuée sans votre validation expresse dans votre Espace Client Arckaton OS. Deux à trois rounds de retouches complets sont inscrits au contrat.
                  </p>

                  <h4 className="font-serif text-base font-bold text-white flex items-center gap-2 pt-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Transmission Complète des Accès</span>
                  </h4>
                  <p className="text-xs text-rk-text-secondary">
                    Dès le solde réglé, nous vous transférons l'intégralité des identifiants : registar du nom de domaine, console Cloud, fichiers Figma et code source sans verrouillage propriétaire.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: ARKA-PME */}
            {activeTab === 'arka' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
                  <span className="font-bold text-white block mb-0.5">Moteur SaaS Résilient Hybride</span>
                  ARKA-PME a été conçu spécifiquement pour le contexte économique camerounais et africain où les coupures de courant et d'internet ne doivent jamais bloquer les ventes.
                </div>

                <div className="space-y-3 text-xs text-rk-text-secondary">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-rk-inset border border-rk-line-soft">
                    <span className="font-mono text-emerald-400 font-bold">01.</span>
                    <div>
                      <strong className="text-white">Encaissement 100% Hors-Ligne :</strong> Les encaissements et sorties de stock s'enregistrent localement sur l'appareil. Dès que la 4G/Wi-Fi revient, la réconciliation s'exécute automatiquement en tâche de fond.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-rk-inset border border-rk-line-soft">
                    <span className="font-mono text-emerald-400 font-bold">02.</span>
                    <div>
                      <strong className="text-white">QR Code & Mobile Money Direct :</strong> Génération dynamique de QR Codes MTN MoMo et Orange Money scannables par le client, réduisant la fraude et les erreurs de monnaie.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-rk-inset border border-rk-line-soft">
                    <span className="font-mono text-emerald-400 font-bold">03.</span>
                    <div>
                      <strong className="text-white">Zéro Matériel Propriétaire Forcé :</strong> Fonctionne sur les téléphones, tablettes ou PC déjà présents dans votre boutique, ainsi que sur les imprimantes thermiques Bluetooth standard (58mm/80mm).
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-rk-inset border border-rk-line-soft">
                    <span className="font-mono text-emerald-400 font-bold">04.</span>
                    <div>
                      <strong className="text-white">Essai 30 Jours Sans Carte Bancaire :</strong> Déploiement initial en 24h avec formation directe de vos vendeurs.
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Bottom Actions */}
          <div className="p-4 sm:p-6 border-t border-rk-line bg-rk-inset flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] font-mono text-rk-muted text-center sm:text-left">
              Arckaton • Immeuble Mimboman, Yaoundé • WhatsApp +237 681 46 29 82
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setIsBlueprintModalOpen(false);
                  setIsQuoteModalOpen(true);
                }}
                className="flex-1 sm:flex-initial bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>Démarrer un projet avec ce cadre</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
