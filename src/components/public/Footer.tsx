import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Phone, Mail, MapPin, Globe, LayoutDashboard, ArrowUp } from 'lucide-react';
import { OFFICIAL_KNOWLEDGE } from '../../data/mockData';

export const Footer: React.FC = () => {
  const { setMode } = useApp();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#050814] text-slate-400 text-xs border-t border-white/10 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/5">
          
          {/* Col 1: Identity */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-serif text-xl font-bold text-slate-950">
                A
              </div>
              <span className="font-serif text-2xl font-bold text-white tracking-tight">
                arckaton<span className="text-emerald-400">.</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              On ne livre pas un site. On livre un système digital complet. Agence digitale et éditeur du logiciel SaaS ARKA-PME pour PME africaines et internationales.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
              <Globe className="w-3.5 h-3.5" />
              <span>Livraison partout dans le monde ðŸŒ</span>
            </div>
          </div>

          {/* Col 2: Solutions */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
              Systèmes & Solutions
            </h4>
            <ul className="space-y-2">
              <li><a href="#produit" className="hover:text-emerald-400 transition-colors">Logiciel ARKA-PME (30j gratuit)</a></li>
              <li><a href="#forfaits" className="hover:text-emerald-400 transition-colors">Forfait Initiation (380k FCFA)</a></li>
              <li><a href="#forfaits" className="hover:text-emerald-400 transition-colors">Forfait Synergie (750k FCFA)</a></li>
              <li><a href="#forfaits" className="hover:text-emerald-400 transition-colors">Forfait Architecture (2,9M FCFA)</a></li>
              <li><a href="#realisations" className="hover:text-emerald-400 transition-colors">E-commerce Mobile Money MTN/Orange</a></li>
            </ul>
          </div>

          {/* Col 3: Expertises */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
              Pôles d'Expertise
            </h4>
            <ul className="space-y-2">
              <li><span className="text-blue-400">Pôle Tech :</span> Web & Architecture SaaS</li>
              <li><span className="text-purple-400">Pôle Studio :</span> Direction Artistique & Identité</li>
              <li><span className="text-amber-400">Pôle Growth :</span> SEO Local & Sorties Terrain</li>
              <li><span className="text-rose-400">Pôle Client :</span> Onboarding & Support 24h</li>
              <li><span className="text-slate-300">Pôle Direction :</span> Stratégie & ROI Agence</li>
            </ul>
          </div>

          {/* Col 4: Contact & Direct OS Access */}
          <div className="space-y-4">
            <h4 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
              Siège & Coordonnées
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>{OFFICIAL_KNOWLEDGE.agency.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{OFFICIAL_KNOWLEDGE.agency.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>{OFFICIAL_KNOWLEDGE.agency.email}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setMode('dashboard')}
                className="text-[11px] font-mono text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Espace réservé aux membres habilités"
              >
                <LayoutDashboard className="w-3 h-3" />
                <span>Arckaton OS — Espace Membres</span>
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-[11px] font-mono">
          <div>
            &copy; {new Date().getFullYear()} Arckaton Technologies — Filiale Technologique de <span className="text-slate-400">SLOMAH SARL</span>. Tous droits réservés. Mentions Légales & Confidentialité.
          </div>
          <div className="flex items-center gap-4">
            <span>Yaoundé • Cameroun</span>
            <span>•</span>
            <button
              onClick={scrollToTop}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <span>Haut de page</span>
              <ArrowUp className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
