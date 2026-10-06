import { useEffect, useState } from 'react';

/**
 * Décompte réel des délais (tâches, projets, jalons).
 *
 * Deux champs coexistent dans les modèles :
 *   - `echeance`/`deadline` : libellé libre, « Sous 3 jours », il reste
 *     affiché tel quel — c'est ce que le commercial a promis au client ;
 *   - `date_limite` : date ISO 8601 machine, optionnelle. Sans elle, aucun
 *     décompte ne s'affiche : l'interface retombe sur le libellé.
 *
 * Fuseau : les libellés affichés portent toujours Africa/Douala (UTC+1,
 * sans heure d'été) — le fuseau de l'agence.
 */

export type DelaiEtat = 'sain' | 'proche' | 'critique' | 'depasse';

export const FUSEAU_AGENCE = 'Africa/Douala';

export function parseDateLimite(valeur: string | null | undefined): Date | null {
  if (!valeur || !valeur.trim()) return null;
  const brut = String(valeur).trim();
  // « 2026-12-31 » sans heure : une échéance au jour près doit courir
  // jusqu'à la fin de la journée de Douala, pas jusqu'à minuit UTC.
  const corrigee = /^\d{4}-\d{2}-\d{2}$/.test(brut)
    ? `${brut}T23:59:59.999+01:00`
    : brut;
  const date = new Date(corrigee);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function delaiEtat(msRestants: number): DelaiEtat {
  if (msRestants <= 0) return 'depasse';
  if (msRestants <= 24 * 3600 * 1000) return 'critique';
  if (msRestants <= 72 * 3600 * 1000) return 'proche';
  return 'sain';
}

/** « 2 j 04 h » ; l'échéance passée devient « Délai dépassé ». */
export function delaiLabel(msRestants: number): string {
  if (msRestants <= 0) return 'Délai dépassé';
  const totalMinutes = Math.floor(msRestants / 60000);
  const jours = Math.floor(totalMinutes / (24 * 60));
  const heures = Math.floor((totalMinutes % (24 * 60)) / 60);
  return jours > 0 ? `${jours} j ${String(heures).padStart(2, '0')} h` : `${heures} h ${Math.floor(totalMinutes % 60)} min`;
}

const FORMAT_JOUEUR = new Intl.DateTimeFormat('fr-FR', {
  timeZone: FUSEAU_AGENCE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Lecture seule : format affiché avec fuseau explicite (règle temps). */
export function formateDateLimite(iso: string): string {
  const date = parseDateLimite(iso);
  if (!date) return iso;
  return `${FORMAT_JOUEUR.format(date)} (UTC+1)`;
}

export function formatHeureDouala(iso: string): string {
  return formateDateLimite(iso);
}

/**
 * Tic réglé sur 30 s : le décompte doit rester fidèle jour après jour sans
 * coûter un rendu chaque seconde. `pageHidden` coupe le tic hors onglet.
 */
export function useCountdown(dateLimite?: string): {
  msRestants: number;
  etat: DelaiEtat;
  label: string;
  dateFormatee: string;
} {
  const [maintenant, setMaintenant] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!dateLimite) return;
    const maj = () => setMaintenant(Date.now());
    const id = window.setInterval(maj, 30_000);
    const surVisibilite = () => {
      if (!document.hidden) maj();
    };
    document.addEventListener('visibilitychange', surVisibilite);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', surVisibilite);
    };
  }, [dateLimite]);

  const cible = parseDateLimite(dateLimite);
  if (!cible) {
    return { msRestants: Number.NaN, etat: 'sain', label: '', dateFormatee: '' };
  }
  const msRestants = cible.getTime() - maintenant;
  return {
    msRestants,
    etat: delaiEtat(msRestants),
    label: delaiLabel(msRestants),
    dateFormatee: formateDateLimite(dateLimite),
  };
}

/** Valeur par défaut d'un champ <input type="datetime-local"> : maintenant. */
export function maintenantProcheProchainesMinutes(minutes = 60): string {
  const d = new Date(Date.now() + minutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}