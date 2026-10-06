// Endpoint public des créneaux de rendez-vous : le serveur reste la seule
// source de vérité du calendrier (fuseau Africa/Douala, capacité d'un RDV
// actif par créneau × pôle). Le pôle est dérivé du motif, jamais demandé au
// client (même règle que POST /api/appointments et /api/leads).
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, __estHeureOuvrable } from '../server';

const baseConfiguree =
  Boolean(process.env.PGUSER && process.env.PGPASSWORD) ||
  Boolean(process.env.DATABASE_URL);

async function creneauxPour(motif: string) {
  return request(app).get('/api/appointments/creneaux').query({ motif });
}

describe('GET /api/appointments/creneaux', () => {
  it('exige un motif', async () => {
    const res = await request(app).get('/api/appointments/creneaux');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Motif');
  });

  it('derive le pole depuis le motif, jamais fourni par le client', async () => {
    const tech = await creneauxPour('Site e-commerce avec paiement Mobile Money');
    expect(tech.status).toBe(200);
    expect(tech.body.pole).toBe('Tech');

    const creatif = await creneauxPour('Création de logo et identité visuelle');
    expect(creatif.status).toBe(200);
    expect(creatif.body.pole).toBe('Creatif');
  });

  it("ne propose que des creneaux ouvrables, futurs et alignes sur la demi-heure", async () => {
    const res = await creneauxPour('Site e-commerce');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.creneaux)).toBe(true);
    expect(res.body.creneaux.length).toBeGreaterThan(0);

    const depart = Date.now() + 60 * 60_000;
    for (const iso of res.body.creneaux as string[]) {
      const t = new Date(iso).getTime();
      expect(__estHeureOuvrable(iso)).toBe(true);
      expect(t).toBeGreaterThan(depart);
      expect(new Date(iso).getUTCMinutes() % 30).toBe(0);
      expect(new Date(iso).getUTCSeconds()).toBe(0);
    }
  });

  it.skipIf(baseConfiguree === false)(
    'ecarte un creneau deja reserve (demande) pour ce pole',
    async () => {
      // On pose un rendez-vous, puis le meme creneau ne doit plus apparaitre.
      const creneaux = (await creneauxPour('Site e-commerce')).body.creneaux as string[];
      const pris = creneaux[0];

      const depot = await request(app).post('/api/appointments').send({
        nom: 'Jean Mbarga',
        telephone: '+237691234567',
        motif: 'Site e-commerce',
        consentement: true,
        debut_utc: pris,
        duree_min: 30,
      });
      expect(depot.status).toBe(201);

      const apres = (await creneauxPour('Site e-commerce')).body.creneaux as string[];
      expect(apres).not.toContain(pris);
    }
  );
});