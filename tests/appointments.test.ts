// Tests des rendez-vous : helpers purs et endpoints.
//
// Les helpers tournent dans `npm test`. Les endpoints s'exercent en mode
// degrade (base absente) : le POST /api/appointments persiste en memoire,
// comme /api/leads, ce qui permet de verifier le contrat HTTP sans base.
//
// Les routes authentifiees (GET /api/appointments, notifications) exigent
// une session reelle : `requireAuth` repond 401 sans jeton, et ce 401 est
// justement ce qu'on verifie ici.
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import {
  app,
  __authThrottle,
  __estHeureOuvrable,
  __genererCreneauxDisponibles,
  __deduirePolePublique,
  __validerDemandeRdv,
  __destinatairesNotifRdv,
} from '../server';

// Interprete une heure locale (Africa/Douala) comme un instant UTC.
function aDouala(locale: string): Date {
  return new Date(new Date(`${locale}:00Z`).getTime() - 60 * 60_000);
}

// Le vendredi 16 octobre 2026 et le samedi 17 octobre 2026 (jours reels).
const VENDREDI = aDouala('2026-10-16T10:00');
const SAMEDI = aDouala('2026-10-17T10:00');

describe('estHeureOuvrable', () => {
  it('accepte un creneau en semaine dans les horaires', () => {
    expect(__estHeureOuvrable(VENDREDI)).toBe(true);
  });

  it('refuse le week-end', () => {
    expect(__estHeureOuvrable(SAMEDI)).toBe(false);
  });

  it('refuse un creneau avant 08:00', () => {
    expect(__estHeureOuvrable(aDouala('2026-10-16T07:59'))).toBe(false);
  });

  it('accepte le dernier depart a 18:00 (fin 18:30)', () => {
    expect(__estHeureOuvrable(aDouala('2026-10-16T18:00'))).toBe(true);
  });

  it('refuse un creneau dont la fin depasse 18:30', () => {
    expect(__estHeureOuvrable(aDouala('2026-10-16T18:00'), 60)).toBe(false);
  });

  it('refuse un creneau non aligne sur la demi-heure', () => {
    expect(__estHeureOuvrable(aDouala('2026-10-16T14:17'))).toBe(false);
  });

  it('refuse une date invalide', () => {
    expect(__estHeureOuvrable('pas-une-date')).toBe(false);
  });
});

describe('genererCreneauxDisponibles', () => {
  it('ne propose que des jours ouvrables, alignes, strictement futurs', () => {
    // Partir d'un lundi a 00:00 UTC : aucun creneau ne doit tomber le
    // week-end, tous sont sur :00 et :30, et tous dans le futur.
    const depart = new Date(Date.UTC(2026, 9, 12, 0, 0, 0)); // lundi 12/10
    const creneaux = __genererCreneauxDisponibles(depart, { joursOuvrables: 10 });
    expect(creneaux.length).toBe(10 * 21); // 21 departs de 30 min par jour (jusqu'a 17:00 UTC exclusive)
    for (const c of creneaux) {
      expect(__estHeureOuvrable(c)).toBe(true);
      const jour = new Date(c.getTime() + 60 * 60_000).getUTCDay();
      expect([1, 2, 3, 4, 5]).toContain(jour);
      expect([0, 30]).toContain(c.getUTCMinutes());
      expect(c.getTime()).toBeGreaterThan(depart.getTime());
    }
    const premier = creneaux[0];
    expect(new Date(premier.getTime() + 60 * 60_000).getUTCHours()).toBe(8);
  });
});

describe('deduirePolePublique', () => {
  it('route chaque besoin vers son pole, jamais vers un pole interne interdit', () => {
    expect(__deduirePolePublique('Boutique e-commerce mobile money')).toBe('Tech');
    expect(__deduirePolePublique('Création de logo et identité')).toBe('Creatif');
    expect(__deduirePolePublique('Refonte SEO et vitrine')).toBe('Digital');
    expect(__deduirePolePublique('Formation de mes équipes terrain')).toBe('Client');
    expect(__deduirePolePublique('Je ne sais pas encore')).toBe('Direction');
  });
});

describe('validerDemandeRdv', () => {
  const base = {
    nom: 'Jean Mbarga',
    telephone: '+237691234567',
    motif: 'Site e-commerce',
    consentement: true,
  };

  it('accepte une demande complete sur un creneau valide', () => {
    const creneau = __genererCreneauxDisponibles(new Date())[0];
    const r = __validerDemandeRdv({ ...base, debut_utc: creneau.toISOString(), duree_min: 30 });
    expect(r.ok).toBe(true);
    expect(r.propre?.nom).toBe('Jean Mbarga');
    // Le consentement est enregistre, pas seulement accepte.
    expect(r.propre?.consentement_at).not.toBeNull();
  });

  it('refuse sans nom ni telephone', () => {
    const r = __validerDemandeRdv({ ...base, nom: '', telephone: '' });
    expect(r.ok).toBe(false);
    expect(r.erreurs.join(' ')).toContain('Nom');
    expect(r.erreurs.join(' ')).toContain('téléphone');
  });

  it('refuse un numero invalide', () => {
    const r = __validerDemandeRdv({ ...base, telephone: 'pas-un-numero' });
    expect(r.ok).toBe(false);
    expect(r.erreurs.join(' ')).toContain('téléphone');
  });

  it('refuse sans consentement explicite', () => {
    const creneau = __genererCreneauxDisponibles(new Date())[0];
    const r = __validerDemandeRdv({ ...base, consentement: false, debut_utc: creneau.toISOString() });
    expect(r.ok).toBe(false);
    expect(r.erreurs.join(' ')).toContain('Consentement');
  });

  it('refuse un creneau passe', () => {
    const r = __validerDemandeRdv({ ...base, debut_utc: '2020-01-01T10:00:00Z' });
    expect(r.ok).toBe(false);
    expect(r.erreurs.join(' ')).toContain('créneau');
  });

  it('refuse un creneau le week-end', () => {
    const r = __validerDemandeRdv({ ...base, debut_utc: SAMEDI.toISOString() });
    expect(r.ok).toBe(false);
    expect(r.erreurs.join(' ')).toContain('horaires');
  });
});

describe('destinatairesNotifRdv', () => {
  const membres = [
    { id: 'a', role: 'admin', pole: 'Direction', active: true },
    { id: 'b', role: 'membre', pole: 'Direction', active: true },
    { id: 'c', role: 'membre', pole: 'Tech', active: true },
    { id: 'd', role: 'membre', pole: 'Techno', active: false },
  ];

  it('notifie le siege, la direction et le pole concerne, sans doublon', () => {
    expect(__destinatairesNotifRdv(membres, 'Tech')).toEqual(['a', 'b', 'c']);
  });

  it('ignore les membres inactifs', () => {
    // `d` est inactif : il ne doit pas apparaitre meme pour son pole.
    expect(__destinatairesNotifRdv(membres, 'Techno')).not.toContain('d');
  });
});

describe('POST /api/appointments (mode degrade, sans base)', () => {
  beforeEach(() => {
    // Le rate limit est actif dans les tests (vitest neutralise la base) :
    // on repart d'un compteur neuf entre deux cas.
    __authThrottle.reset();
  });

  // Chaque cas reserve un creneau DISTINCT (le store en memoire n'est pas
  // vide entre deux tests) : sinon deux cas se marcheraient dessus.
  const creneau = (decalageJours = 0) =>
    __genererCreneauxDisponibles(
      new Date(Date.now() + decalageJours * 24 * 3600_000)
    )[0];
  const corps = (extra: Record<string, unknown> = {}, decalageJours = 0) => ({
    nom: 'Jean Mbarga',
    telephone: '+237691234567',
    motif: 'Site e-commerce',
    consentement: true,
    debut_utc: creneau(decalageJours).toISOString(),
    duree_min: 30,
    ...extra,
  });

  it('cree un rendez-vous demande et derive le pole', async () => {
    const res = await request(app).post('/api/appointments').send(corps({}, 0));
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.rdv.rdv_ref).toMatch(/^rdv-/);
    expect(res.body.rdv.statut).toBe('demande');
    expect(res.body.rdv.pole).toBe('Tech');
    expect(res.body.rdv.lead_ref).toMatch(/^lead-/);
  });

  it('renvoie 400 pour une demande incomplete (pas de confirmation partielle)', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({ ...corps({ consentement: false }, 1) });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Consentement');
  });

  it('refuse un creneau deja pris (409)', async () => {
    const premier = await request(app).post('/api/appointments').send(corps({}, 7));
    expect(premier.status).toBe(201);
    const second = await request(app)
      .post('/api/appointments')
      .send(corps({ cle_idempotence: 'autre-cle' }, 7));
    expect(second.status).toBe(409);
    expect(second.body.creneaux.length).toBeGreaterThan(0);
  });

  it('un rejeu avec la meme cle retourne la meme ligne, pas un doublon', async () => {
    const cle = 'mon-rejeu-1';
    const premier = await request(app)
      .post('/api/appointments')
      .send(corps({ cle_idempotence: cle }, 14));
    expect(premier.status).toBe(201);
    const rejeu = await request(app)
      .post('/api/appointments')
      .send(corps({ cle_idempotence: cle }, 14));
    expect(rejeu.status).toBe(200);
    expect(rejeu.body.rdv.rdv_ref).toBe(premier.body.rdv.rdv_ref);
  });

  it('les routes authentifiees exigent une session', async () => {
    const getRdv = await request(app).get('/api/appointments');
    expect(getRdv.status).toBe(401);
    const getNotifs = await request(app).get('/api/notifications');
    expect(getNotifs.status).toBe(401);
  });
});