import { useCallback, type KeyboardEvent } from 'react';

/**
 * Rend une region horizontale defilante (carrousel tactile) operable au
 * clavier. Sans cela, un carrousel au doigt est inaccessible : la zone
 * defilante n'a pas de role, pas de nom, et les fleches ne font rien
 * (WCAG 2.1.1).
 *
 * A poser sur le conteneur :
 *   <div ref={...} role="region" aria-label="..." tabIndex={0} onKeyDown={onKeyDown}>
 */
export function useCarouselKeyboard() {
  return useCallback((e: KeyboardEvent<HTMLElement>) => {
    const el = e.currentTarget;
    // On avance d'une carte : 80 % de la largeur visible, ce qui correspond
    // au pas d'un element dans les carrousels (w-[86%] avec scroll-snap).
    const step = Math.max(240, Math.round(el.clientWidth * 0.8));

    switch (e.key) {
      case 'ArrowRight':
        el.scrollBy({ left: step, behavior: 'smooth' });
        break;
      case 'ArrowLeft':
        el.scrollBy({ left: -step, behavior: 'smooth' });
        break;
      case 'Home':
        el.scrollTo({ left: 0, behavior: 'smooth' });
        break;
      case 'End':
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
        break;
      default:
        return;
    }
    // On empeche le defilement de la page par les fleches, qui est le
    // comportement attendu sur un carrousel.
    e.preventDefault();
  }, []);
}