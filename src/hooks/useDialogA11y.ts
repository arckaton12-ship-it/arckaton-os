import { useEffect, useRef } from 'react';

const SELECTEUR_FOCALISABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Comportement clavier d'une boite de dialogue : fermeture sur Echap, focus
 * piege a l'interieur, blocage du defilement de l'arriere-plan, puis retour du
 * focus sur l'element qui avait ouvert la boite. Sans cela, une modale est
 * inutilisable au clavier par une personne non-voyante (WCAG 2.1).
 */
export function useDialogA11y<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose: () => void
) {
  const dialogRef = useRef<T | null>(null);
  const elementPrecedent = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const noeud: HTMLElement | null = dialogRef.current;
    elementPrecedent.current = (document.activeElement as HTMLElement) || null;

    const overflowPrecedent = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const elementsFocalisables = (): HTMLElement[] => {
      if (!noeud) return [];
      return Array.from(noeud.querySelectorAll<HTMLElement>(SELECTEUR_FOCALISABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
    };

    const id = window.setTimeout(() => {
      const elements = elementsFocalisables();
      (elements[0] || noeud)?.focus();
    }, 0);

    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const elements = elementsFocalisables();
      if (elements.length === 0) {
        e.preventDefault();
        noeud?.focus();
        return;
      }
      const premier = elements[0];
      const dernier = elements[elements.length - 1];
      const actif = document.activeElement as HTMLElement | null;
      const horsBoite = !noeud || !actif || !noeud.contains(actif);
      if (e.shiftKey && (actif === premier || horsBoite)) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && (actif === dernier || horsBoite)) {
        e.preventDefault();
        premier.focus();
      }
    };

    document.addEventListener('keydown', surTouche, true);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('keydown', surTouche, true);
      document.body.style.overflow = overflowPrecedent;
      elementPrecedent.current?.focus?.();
    };
  }, [isOpen]);

  return dialogRef;
}
