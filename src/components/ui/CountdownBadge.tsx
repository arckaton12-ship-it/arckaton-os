import type { ReactNode } from 'react';
import { useCountdown } from '../../utils/countdown';

interface CountdownBadgeProps {
  dateLimite?: string;
  /** Libellé (« Échéance ») à coller avant le décompte, si souhaité. */
  prefixe?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Badge de décompte jours+heures d'un délai. Sans `date_limite`, ne rend
 * rien : le libellé libre historique reste la source d'affichage.
 */
export default function CountdownBadge({
  dateLimite,
  prefixe,
  className = '',
  compact = false,
}: CountdownBadgeProps) {
  const { msRestants, etat, label, dateFormatee } = useCountdown(dateLimite);
  if (!dateFormatee) return null;

  const titre = `${prefixe || 'Échéance'} : ${dateFormatee}`;
  const contenu: ReactNode = compact ? label : `${label} — ${dateFormatee}`;

  return (
    <span
      className={`countdown-badge countdown-badge--${etat} ${className}`.trim()}
      title={titre}
      role="timer"
      aria-label={titre}
    >
      {prefixe ? <span className="countdown-badge__prefixe">{prefixe}</span> : null}
      {contenu}
    </span>
  );
}