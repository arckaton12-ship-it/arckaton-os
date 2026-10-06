import { describe, it, expect, vi, afterEach } from 'vitest';
import { submitPublicLead } from '../src/utils/publicLead';

/**
 * Le formulaire public ne doit jamais bloquer un visiteur : si l'appel serveur
 * echoue, on rend un lien WhatsApp utilisable et on signale `saved: false`,
 * faute de quoi l'interface promettrait un enregistrement qui n'a pas eu lieu.
 */
describe('submitPublicLead', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const payload = {
    name: 'M. Test',
    phone: '+237681462982',
    project_type: 'Site web vitrine UX/UI (Forfait Synergie)',
    source: 'site_v2',
    consentement: true,
  };

  it('signale un enregistrement reel quand le serveur confirme', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, whatsappLink: 'https://wa.me/237681462982?text=ok' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await submitPublicLead(payload);

    expect(res.saved).toBe(true);
    expect(res.whatsappLink).toBe('https://wa.me/237681462982?text=ok');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/leads');
    expect(init.method).toBe('POST');

    // Le client n'envoie ni pole ni statut : le serveur en est seul juge.
    const body = JSON.parse(String(init.body));
    expect(body).not.toHaveProperty('pole_assigned');
    expect(body).not.toHaveProperty('statut');
    expect(body).not.toHaveProperty('client_ref');
    expect(body).not.toHaveProperty('to_numbers');
    expect(body.consentement).toBe(true);
  });

  it('retombe sur un lien WhatsApp local si le serveur refuse (plafond de depot)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) })
    );

    const res = await submitPublicLead(payload);

    expect(res.saved).toBe(false);
    expect(res.whatsappLink).toContain('wa.me/237681462982');
  });

  it('retombe sur un lien WhatsApp local si le reseau echoue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const res = await submitPublicLead(payload);

    expect(res.saved).toBe(false);
    expect(res.whatsappLink).toContain('wa.me/237681462982');
  });

  it('utilise le lien renvoye par le serveur quand il est valide', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })
    );

    const res = await submitPublicLead(payload);

    // `success: true` sans lien : on retombe sur le lien local, jamais sur undefined.
    expect(res.saved).toBe(true);
    expect(res.whatsappLink).toContain('wa.me/237681462982');
  });
});