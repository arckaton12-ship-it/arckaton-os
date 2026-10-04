import React, { useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'produit', label: 'ARKA-PME' },
  { id: 'realisations', label: 'Réalisations' },
  { id: 'temoignages', label: 'Témoignages' },
  { id: 'blog', label: 'Journal' },
  { id: 'forfaits', label: 'Forfaits' },
  { id: 'apropos', label: 'Agence' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
];

/**
 * Navigation courte, collante sous l'en-tete, uniquement sur mobile.
 * Elle evite l'effet « long scroll » en donnant un acces direct aux
 * sections et en signalant la section en cours de lecture.
 */
export const SectionNav: React.FC = () => {
  const [actif, setActif] = useState('produit');

  useEffect(() => {
    const elements = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const observateur = new IntersectionObserver(
      (entrees) => {
        const visibles = entrees
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visibles[0]) setActif(visibles[0].target.id);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    elements.forEach((el) => observateur.observe(el));
    return () => observateur.disconnect();
  }, []);

  return (
    <nav
      aria-label="Sections du site"
      className="lg:hidden sticky top-[72px] z-40 bg-rk-base/90 backdrop-blur-xl border-b border-rk-line"
    >
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 py-2.5">
        {SECTIONS.map((s) => {
          const estActif = actif === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={estActif ? 'true' : undefined}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap ${
                estActif
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                  : 'text-rk-text-secondary border-rk-line bg-white/[0.04] hover:text-rk-text'
              }`}
            >
              {s.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
};
