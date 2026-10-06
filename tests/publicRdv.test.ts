// Adjusteurs réseau du parcours créneaux : le client reçoit le pole du
// serveur (jamais il ne le propose), et un 409 sur le RDV est signalé à
// l'UI pour relancer une liste fraiche.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { chargerCreneaux } from '../src/utils/publicCreneaux';
import { soumettreRdv } from '../src/utils/publicRdv';

afterEach(() => {
  vi.unstubAllGlobals();
});

const RDV = {
  nom: 'Jean Mbarga',
  telephone: '+237691234567',
  motif: 'Site e-commerce',
  debut_utc: '2026-10-16T08:00:00.000Z',
  duree_min: 30,
  consentement: true,
};

describe('chargerCreneaux', () => {
  it('retourne le pole deduit par le serveur et la liste des creneaux', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ pole: 'Tech', motif: 'Site e-commerce', creneaux: ['a', 'b'] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await chargerCreneaux('Site e-commerce');

    expect(res.pole).toBe('Tech');
    expect(res.creneaux).toEqual(['a', 'b']);
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain('/api/appointments/creneaux?motif=');
    expect(decodeURIComponent(url)).toContain('motif=Site e-commerce');
  });

  it('leve une erreur exploitable quand le serveur refuse', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'Motif requis' }) })
    );
    await expect(chargerCreneaux('')).rejects.toThrow('Motif requis');
  });

  it('leve une erreur si aucun creneau ne revient', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ pole: 'Tech', creneaux: [] }) })
    );
    await expect(chargerCreneaux('Site')).rejects.toThrow('Aucun créneau');
  });
});

describe('soumettreRdv', () => {
  it('sauvegarde et expose la reference du rendez-vous', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        rdv: { rdv_ref: 'rdv-1', pole: 'Tech', debut_utc: RDV.debut_utc },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await soumettreRdv(RDV);

    expect(res.saved).toBe(true);
    expect(res.rdvRef).toBe('rdv-1');
    expect(res.pole).toBe('Tech');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/appointments');
    expect(JSON.parse(String(init.body)).consentement).toBe(true);
  });

  it('signale un conflit de creneau (409) pour que l UI relance', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Ce créneau vient d’être pris.' }),
      })
    );
    const res = await soumettreRdv(RDV);
    expect(res.saved).toBe(false);
    expect(res.conflitCreneau).toBe(true);
  });

  it('retombe sur WhatsApp si le reseau echoue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const res = await soumettreRdv(RDV);
    expect(res.saved).toBe(false);
    expect(res.whatsappLink).toContain('wa.me/237681462982');
  });
});