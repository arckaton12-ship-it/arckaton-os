/**
 * Chargement des créneaux de rendez-vous depuis le site public.
 *
 * GET /api/appointments/creneaux est public et ne prend que le mot if.
 * Le pole est DEDUIT par le serveur : le client ne le reçoit que pour
 * affichage, il ne l'envoie jamais.
 *
 * Contrairement a `submitPublicLead`, il ne sert a rien de retomber sur un
 * lien WhatsApp quand le calendrier est indisponible : on LEVE une erreur,
 * et le wizard affiche le message pour réessayer.
 */

export interface CreneauxServis {
  pole: string;
  motif: string;
  creneaux: string[];
}

export async function chargerCreneaux(motif: string): Promise<CreneauxServis> {
  const res = await fetch(`/api/appointments/creneaux?motif=${encodeURIComponent(motif)}`, {
    headers: { Accept: 'application/json' },
  });

  let donnees: { error?: unknown; pole?: unknown; motif?: unknown; creneaux?: unknown } | null = null;
  try {
    donnees = (await res.json()) as { error?: unknown; pole?: unknown; motif?: unknown; creneaux?: unknown };
  } catch {
    donnees = null;
  }

  if (!res.ok) {
    throw new Error(
      donnees && typeof donnees.error === 'string'
        ? donnees.error
        : 'Impossible de charger le calendrier. Réessayez dans un instant.'
    );
  }

  if (!Array.isArray(donnees?.creneaux) || donnees.creneaux.length === 0) {
    throw new Error('Aucun créneau disponible pour le moment.');
  }

  return {
    pole: String(donnees.pole ?? ''),
    motif: String(donnees.motif ?? motif),
    creneaux: donnees.creneaux.filter((c): c is string => typeof c === 'string'),
  };
}