/**
 * Dépôt d'un rendez-vous de cadrage depuis le site public (parcours Essai et
 * Réservation). Même philosophie que `submitPublicLead` : le serveur reste
 * seul juge (pole déduit, créneau vérifié, consentement horodate), et en
 * dernier recours on rend un lien WhatsApp utilisable plutôt que de laisser
 * le visiteur bloqué.
 *
 * Un 409 (créneau pris entre l'affichage et le dépôt) est REJETE explicitement
 * (`conflitCreneau: true`) : l'UI doit retomber sur une liste fraiche.
 */

const BOSS_WHATSAPP = '237681462982';

export interface PublicRdvPayload {
  nom: string;
  telephone: string;
  email?: string;
  motif: string;
  debut_utc: string;
  duree_min: number;
  source?: string;
  consentement: boolean;
}

export interface PublicRdvResult {
  /** true si le RDV est enregistre sur le serveur (visible dans l'agenda). */
  saved: boolean;
  whatsappLink: string;
  rdvRef?: string;
  pole?: string;
  creneauIso?: string;
  conflitCreneau?: boolean;
}

function buildLocalWhatsappLink(payload: PublicRdvPayload): string {
  let creneau = '';
  try {
    creneau = new Date(payload.debut_utc).toISOString().slice(0, 16);
  } catch {
    creneau = '';
  }
  const text = encodeURIComponent(
    `Bonjour Arckaton ! Je suis ${payload.nom}. ` +
      `Je souhaite un RDV de cadrage (${payload.motif}) ` +
      (creneau ? `le ${creneau.replace('T', ' à ')} ` : '') +
      `, mon contact : ${payload.telephone}.`
  );
  return `https://wa.me/${BOSS_WHATSAPP}?text=${text}`;
}

export async function soumettreRdv(payload: PublicRdvPayload): Promise<PublicRdvResult> {
  const fallbackLink = buildLocalWhatsappLink(payload);

  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 409) {
      return { saved: false, whatsappLink: fallbackLink, conflitCreneau: true };
    }

    if (!res.ok) {
      return { saved: false, whatsappLink: fallbackLink };
    }

    const data = (await res.json()) as {
      success?: boolean;
      rdv?: { rdv_ref?: string; pole?: string; debut_utc?: string };
    };
    if (data.success !== true) {
      return { saved: false, whatsappLink: fallbackLink };
    }

    return {
      saved: true,
      whatsappLink: fallbackLink,
      rdvRef: data.rdv?.rdv_ref,
      pole: data.rdv?.pole,
      creneauIso: data.rdv?.debut_utc,
    };
  } catch {
    return { saved: false, whatsappLink: fallbackLink };
  }
}