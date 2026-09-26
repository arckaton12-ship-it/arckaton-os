import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Phone, LayoutDashboard, Menu, X, ArrowUpRight, Sparkles, Eye, Sun, Moon, FileText, Globe } from 'lucide-react';
import { OFFICIAL_KNOWLEDGE } from '../../data/mockData';
import { Currency } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

export const Header: React.FC = () => {
  const { 
    setMode, 
    setIsQuoteModalOpen, 
    setIsAgentModalOpen, 
    openClientPortal, 
    notifications,
    theme,
    toggleTheme,
    currency,
    setCurrency,
    setIsBlueprintModalOpen
  } = useApp();
  const { canBat } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const currencies: { code: Currency; label: string }[] = [
    { code: 'XAF', label: 'FCFA' },
    { code: 'EUR', label: '€' },
    { code: 'USD', label: '$' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#0a0e17]/85 border-b border-white/[0.08] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Identity */}
        <a href="#" className="flex items-center gap-3.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-serif text-xl font-bold text-slate-950 transition-transform duration-300 group-hover:scale-105">
            A
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-2xl font-bold tracking-tight text-white flex items-center">
              arckaton<span className="text-emerald-400">.</span>
            </span>
            <span className="text-[10px] tracking-wider text-slate-400 font-mono -mt-1 flex items-center gap-1.5">
              <span>Systèmes Digitaux</span>
              <span className="w-1 h-1 rounded-full bg-emerald-400/80" />
              <span>Yaoundé</span>
            </span>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#produit" className="hover:text-white transition-colors flex items-center gap-2">
            <span>ARKA-PME</span>
            <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20">
              SaaS
            </span>
          </a>
          <a href="#realisations" className="hover:text-white transition-colors">
            Réalisations
          </a>
          <a href="#temoignages" className="hover:text-white transition-colors">
            Témoignages
          </a>
          <button
            onClick={() => setIsBlueprintModalOpen(true)}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Méthode
          </button>
          <a href="#blog" className="hover:text-white transition-colors flex items-center gap-2">
            <span>Journal de Bord</span>
            <span className="text-[10px] font-mono bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20">
              Blog
            </span>
          </a>
          <a href="#forfaits" className="hover:text-white transition-colors">
            Forfaits & ROI
          </a>
          <a href="#apropos" className="hover:text-white transition-colors">
            L'Agence
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
        </nav>

        {/* Action Controls */}
        <div className="hidden lg:flex items-center gap-2">
          
          {/* Currency Switcher */}
          <div className="flex items-center bg-white/[0.05] p-0.5 rounded-xl border border-white/[0.08] text-[11px] font-mono">
            {currencies.map((c) => (
              <button
                key={c.code}
                onClick={() => setCurrency(c.code)}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                  currency === c.code
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Afficher les tarifs en ${c.code}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Theme Toggle (Day / Night) */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-all cursor-pointer flex items-center justify-center relative group"
            title={theme === 'dark' ? 'Passer en Mode Jour (Light)' : 'Passer en Mode Nuit (Dark)'}
            aria-label="Basculer le thème"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500 group-hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          {/* Méthode / Blueprint Fiche Cadre */}
          <button
            onClick={() => setIsBlueprintModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 rounded-xl border border-white/[0.08] transition-all cursor-pointer"
            title="Consulter la Fiche Cadre & Méthode Officielle Arckaton"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span className="whitespace-nowrap">Méthode</span>
          </button>

          {/* Client Tracking Portal — réservé aux habilités (perm bat) */}
          {canBat && (
            <button
              onClick={() => openClientPortal()}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 rounded-xl border border-white/[0.08] transition-all cursor-pointer"
              title="Suivre mon projet et valider les livrables (BAT)"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span className="whitespace-nowrap">Suivi BAT</span>
            </button>
          )}

          {/* AI Advisor Button */}
          <button
            onClick={() => setIsAgentModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 rounded-xl border border-white/[0.08] transition-all cursor-pointer"
            title="Consulter notre conseiller digital"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="whitespace-nowrap">Conseiller</span>
          </button>

          {/* Quote CTA Button */}
          <button
            onClick={() => setIsQuoteModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Devis</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          {/* Arckaton OS Switcher */}
          <button
            onClick={() => setMode('dashboard')}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-200 bg-white/[0.06] hover:bg-white/[0.12] px-3 py-2 rounded-xl border border-white/[0.12] transition-all cursor-pointer"
            title="Ouvrir le cockpit interne Arckaton OS"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />
            <span className="whitespace-nowrap">Cockpit OS</span>
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile menu trigger + Quick Day/Night Toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          {/* Quick theme toggle on mobile header */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-300 bg-white/[0.04] border border-white/[0.08]"
            aria-label="Basculer thème"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          <button
            onClick={() => setMode('dashboard')}
            className="flex items-center gap-1 text-xs font-medium text-slate-200 bg-white/[0.06] px-2.5 py-1.5 rounded-lg border border-white/[0.1]"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />
            <span>OS</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white rounded-lg bg-white/[0.04] border border-white/[0.08]"
            aria-label="Menu de navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Menu Animated Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="lg:hidden border-b border-white/[0.08] bg-[#0d1322] px-4 pt-3 pb-6 space-y-4 overflow-hidden"
          >
            <nav className="flex flex-col space-y-1.5 text-sm font-medium text-slate-300">
              <a
                href="#produit"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl hover:bg-white/[0.04] flex items-center justify-between"
              >
                <span>ARKA-PME (Logiciel SaaS)</span>
                <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full">
                  Essai 30j
                </span>
              </a>
              <a
                href="#realisations"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl hover:bg-white/[0.04]"
              >
                Réalisations & Cas clients
              </a>
              <a
                href="#temoignages"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl hover:bg-white/[0.04]"
              >
                Témoignages clients
              </a>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsBlueprintModalOpen(true);
                }}
                className="px-3.5 py-2.5 rounded-xl hover:bg-white/[0.04] text-left"
              >
                Méthode & Fiche Cadre
              </button>
              <a
                href="#blog"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl hover:bg-white/[0.04] flex items-center justify-between"
              >
                <span>Journal de Bord (Blog)</span>
                <span className="text-[10px] font-mono bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full">
                  Actu
                </span>
              </a>
              <a
                href="#forfaits"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl hover:bg-white/[0.04]"
              >
                Forfaits & Comparatif
              </a>
              <a
                href="#apropos"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl hover:bg-white/[0.04]"
              >
                L'Agence & Yaoundé
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl hover:bg-white/[0.04]"
              >
                FAQ
              </a>
            </nav>

            <div className="pt-2 flex flex-col gap-2.5">
              {/* Currency Selector Mobile */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <span className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Devise d'affichage</span>
                </span>
                <div className="flex items-center gap-1 bg-white/[0.06] p-1 rounded-lg">
                  {currencies.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setCurrency(c.code)}
                      className={`px-2.5 py-1 text-xs rounded-md font-mono ${
                        currency === c.code
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fiche Cadre & Méthode Mobile */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsBlueprintModalOpen(true);
                }}
                className="w-full bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.1] py-2.5 rounded-xl text-center text-xs font-medium flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Fiche Cadre & Méthode Officielle (PDF)</span>
              </button>

              {canBat && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openClientPortal();
                  }}
                  className="w-full bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.1] py-2.5 rounded-xl text-center text-xs font-medium flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>Suivre mon projet (Espace Client & BAT)</span>
                </button>
              )}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsQuoteModalOpen(true);
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 rounded-xl text-center text-xs shadow-md"
              >
                Demander un devis interactif
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsAgentModalOpen(true);
                }}
                className="w-full bg-white/[0.04] text-slate-300 border border-white/[0.08] py-2.5 rounded-xl text-center text-xs flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Consulter le Conseiller IA</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setMode('dashboard');
                }}
                className="w-full bg-blue-600/20 text-blue-300 border border-blue-500/30 py-2.5 rounded-xl text-center text-xs flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Ouvrir Arckaton OS (Dashboard)</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
