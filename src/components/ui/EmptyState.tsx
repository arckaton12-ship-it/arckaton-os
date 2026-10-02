import React from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * Etat vide unifie du cockpit.
 *
 * Remplace les blocs « Aucun ... » disperses, ecrits a chaque fois avec des
 * tailles, des marges et des bordures differentes. Une seule source pour la
 * hierarchie (icone → titre → explication → action) et pour le style, adosse
 * aux jetons semantiques (Mode Nuit / Mode Jour).
 */
interface EmptyStateProps {
  icone: LucideIcon;
  titre: string;
  description?: string;
  action?: React.ReactNode;
  /** `compact` reduit les espacements pour les zones etroites (panneaux internes). */
  taille?: 'normal' | 'compact';
  /** `false` retire le fond et la bordure : a utiliser dans un panneau ou une ligne deja encadres. */
  panneau?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icone: Icone,
  titre,
  description,
  action,
  taille = 'normal',
  panneau = true,
  className = '',
}) => {
  const compact = taille === 'compact';
  return (
    <div
      className={[
        'text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        panneau ? 'bg-rk-panel rounded-2xl border border-rk-line-soft' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full bg-white/[0.04] mb-3 ${
          compact ? 'w-9 h-9' : 'w-11 h-11'
        }`}
      >
        <Icone className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-rk-muted`} aria-hidden="true" />
      </span>
      <p className="text-white font-semibold">{titre}</p>
      {description && (
        <p className={`text-xs text-rk-muted mt-1 ${compact ? '' : 'max-w-sm mx-auto'}`}>{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
};
