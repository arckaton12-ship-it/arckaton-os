import { LeadStatus } from '../../types';

// Libelles et tons partages entre la vue Cartes et la vue Tableau du CRM.
export const STATUTS: Record<LeadStatus, { label: string; color: string }> = {
  nouveau: { label: 'Nouveau Lead', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  contacte: { label: 'Contact Établi', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  qualifie: { label: 'Besoins Qualifiés', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  devis_envoye: { label: 'Devis Transmis', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  converti: { label: 'Client Signé', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  archive: { label: 'Archivé', color: 'bg-slate-700 text-rk-muted border-slate-600' },
  perdu: { label: 'Sans Suite', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};

export const ORDRE_STATUTS: LeadStatus[] = [
  'nouveau',
  'contacte',
  'qualifie',
  'devis_envoye',
  'converti',
  'perdu',
  'archive',
];
