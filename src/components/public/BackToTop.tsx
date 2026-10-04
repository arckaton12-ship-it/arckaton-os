import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Bouton « revenir en haut », uniquement sur mobile, positionne au-dessus
 * de la barre de conversion collante.
 */
export const BackToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 900);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Revenir en haut de la page"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 74px)' }}
      className={`lg:hidden fixed right-4 z-40 w-11 h-11 rounded-full bg-rk-chrome border border-rk-line shadow-lg text-rk-text flex items-center justify-center transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      <ArrowUp className="w-5 h-5" aria-hidden="true" />
    </button>
  );
};
