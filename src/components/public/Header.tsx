import React, { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, X, ArrowUpRight, Sparkles, Eye, Sun, Moon, FileText, Globe, Phone, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Currency } from '../../types';

interface NavItem {
  id: string;
  label: string;
  badge?: string;
  badgeTone?: 'emerald' | 'amber';
  action?: 'blueprint' | 'quote' | 'advisor' | 'bat';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'produit', label: 'ARKA-PME', badge: 'SaaS', badgeTone: 'emerald' },
  { id: 'realisations', label: 'Réalisations' },
  { id: 'temoignages', label: 'Témoignages' },
  { id: 'methode', label: 'Méthode', action: 'blueprint' },
  { id: 'blog', label: 'Journal de Bord', badge: 'Blog', badgeTone: 'amber' },
  { id: 'forfaits', label: 'Forfaits & ROI' },
  { id: 'apropos', label: "L'Agence" },
  { id: 'faq', label: 'FAQ' },
];

export const Header: React.FC = () => {
  const {
    setIsQuoteModalOpen,
    setIsAgentModalOpen,
    openClientPortal,
    theme,
    toggleTheme,
    currency,
    setCurrency,
    setIsBlueprintModalOpen,
  } = useApp();
  const { canBat } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const currencies: { code: Currency; label: string }[] = [
    { code: 'XAF', label: 'FCFA' },
    { code: 'EUR', label: '€' },
    { code: 'USD', label: '$' },
  ];

  // Verrouille le scroll du body quand le menu est ouvert
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Échap ferme le menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const close = () => setMenuOpen(false);

  const runAction = (action?: NavItem['action']) => {
    close();
    if (action === 'blueprint') setIsBlueprintModalOpen(true);
    if (action === 'quote') setIsQuoteModalOpen(true);
    if (action === 'advisor') setIsAgentModalOpen(true);
    if (action === 'bat') openClientPortal();
  };

  return (
    <>
      {/* Barre supérieure épurée : marque + CTA + burger */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#0a0e17]/90 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
          <a href="#" onClick={close} className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-serif text-xl font-bold text-slate-950 transition-transform duration-300 group-hover:scale-105">
              A
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
                arckaton<span className="text-emerald-400">.</span>
              </span>
              <span className="text-[11px] tracking-wider text-slate-400 font-mono mt-0.5">
                SYSTÈMES DIGITAUX · YAOUNDÉ
              </span>
            </div>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="tel:+237681462982"
              className="hidden sm:inline-flex items-center gap-2 text-xs font-medium text-slate-200 hover:text-white px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="whitespace-nowrap">Appeler</span>
            </a>

            <button
              onClick={() => setIsQuoteModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Devis gratuit</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
              className="p-2.5 rounded-xl text-slate-100 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-all cursor-pointer flex items-center justify-center"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Menu burger plein écran */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] lg:z-40"
          >
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={close} />

            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 260 }}
              className="absolute right-0 top-0 h-full w-full sm:w-[400px] bg-[#0b1120] border-l border-white/10 shadow-2xl flex flex-col"
              aria-label="Navigation principale"
            >
              <div className="flex-1 overflow-y-auto px-5 pt-6 pb-4 space-y-6">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-3">Navigation</p>
                  <ul className="space-y-1">
                    {NAV_ITEMS.map((item) => (
                      <li key={item.id}>
                        {item.action ? (
                          <button
                            onClick={() => runAction(item.action)}
                            className="w-full text-left px-3.5 py-3 rounded-xl text-slate-100 hover:text-white hover:bg-white/[0.07] transition-colors flex items-center justify-between text-sm font-medium cursor-pointer"
                          >
                            <span>{item.label}</span>
                            {item.badge && (
                              <span
                                className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                                  item.badgeTone === 'amber'
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </button>
                        ) : (
                          <a
                            href={`#${item.id}`}
                            onClick={close}
                            className="px-3.5 py-3 rounded-xl text-slate-100 hover:text-white hover:bg-white/[0.07] transition-colors flex items-center justify-between text-sm font-medium"
                          >
                            <span>{item.label}</span>
                            {item.badge && (
                              <span
                                className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                                  item.badgeTone === 'amber'
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-white/10">
                  <button
                    onClick={() => runAction('blueprint')}
                    className="w-full bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 py-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Fiche Cadre & Méthode</span>
                  </button>

                  {canBat && (
                    <button
                      onClick={() => runAction('bat')}
                      className="w-full bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 py-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span>Espace Client & BAT</span>
                    </button>
                  )}

                  <button
                    onClick={() => runAction('advisor')}
                    className="w-full bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 py-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Conseiller IA</span>
                  </button>

                  <button
                    onClick={() => runAction('quote')}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-xs shadow-lg cursor-pointer"
                  >
                    Demander un devis interactif
                  </button>
                </div>
              </div>

              {/* Pied de menu : préférences d'affichage */}
              <div className="px-5 py-4 border-t border-white/10 space-y-3 bg-black/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium flex items-center gap-2">
                    <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
                    <span>Devise</span>
                  </span>
                  <div className="flex items-center gap-1 bg-white/[0.06] p-1 rounded-lg border border-white/10">
                    {currencies.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => setCurrency(c.code)}
                        className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer transition-colors ${
                          currency === c.code ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Thème</span>
                  </span>
                  <button
                    onClick={toggleTheme}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-slate-100 hover:bg-white/[0.12] transition-all cursor-pointer flex items-center gap-2 text-xs"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>Jour</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Nuit</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
