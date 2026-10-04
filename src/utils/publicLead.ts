/**
 * Envoi d'un prospect depuis le site public.
 *
 * Pourquoi ce module existe : les trois formulaires publics (contact, devis,
 * essai) construisaient jusqu'ici un lead **local** (etat React) et un lien
 * WhatsApp. Aucun appel au serveur n'etait fait, alors que `POST /api/leads`
 * existe, est public et persiste le lead en base + file WhatsApp. Consequence :
 * un prospect qui remplissait le formulaire et ne cliquait pas sur WhatsApp
 * etait perdu.
 *
 * Le serveur reste seul juge : il deduit le pole, nettoie les champs et
 * plafonne le depot. Le client n'envoie donc ni `pole_assigned` ni `statut`.
 */

export interface PublicLeadPayload {
  name: string;
  phone: string;
  email?: string;
  project_type?: string;
  budget?: string;
  message?: string;
  source?: string;
  country?: string;
}

export interface PublicLeadResult {
  /** true si le lead est parti sur le serveur (donc visible dans l'OS). */
  saved: boolean;
  whatsappLink: string;
}

/** Numero WhatsApp officiel de l'agence (format international, sans "+"). */
const BOSS_WHATSAPP = '237681462982';

function buildLocalWhatsappLink(payload: PublicLeadPayload): string {
  const text = encodeURIComponent(
    `Bonjour Arckaton ! Je suis ${payload.name}. ` +
      `Mon projet : ${payload.project_type || 'Systeme digital sur mesure'}. ` +
      `Mon contact est le ${payload.phone}. Merci de me recontacter.`
  );
  return `https://wa.me/${BOSS_WHATSAPP}?text=${text}`;
}

/**
 * Best effort : si le reseau ou le serveur echoue, on rend quand meme un lien
 * WhatsApp utilisable. Le visiteur n'est donc jamais bloque, et l'echec est
 * signale (`saved: false`) pour que l'interface ne promette pas une
 * enregistrement qui n'a pas eu lieu.
 */
export async function submitPublicLead(payload: PublicLeadPayload): Promise<PublicLeadResult> {
  const fallbackLink = buildLocalWhatsappLink(payload);

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // 429 = plafond de depot atteint : inutile d'insister.
      return { saved: false, whatsappLink: fallbackLink };
    }

    const data = (await res.json()) as { success?: boolean; whatsappLink?: string };
    return {
      saved: data.success === true,
      whatsappLink: typeof data.whatsappLink === 'string' && data.whatsappLink
        ? data.whatsappLink
        : fallbackLink,
    };
  } catch {
    return { saved: false, whatsappLink: fallbackLink };
  }
}