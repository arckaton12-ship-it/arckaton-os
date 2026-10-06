// Compte client (Espace Client & BAT) + decompte des delais.
//
// Deux niveaux (comme migrate.demarrage.test.ts) :
//   - `npm test` : mode degrade, sans base. Le portail doit repondre 503
//     quand la base est absente, mais d'abord valider sa requete (400) —
//     un visiteur qui tape mal son code ne doit pas attendre 500 ;
//   - `npm run test:db` : base reelle. Le couple telephéne + code ouvre le
//     projet, et seuls les champs sûrs sortent (jamais les notes internes).
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app, __assurerCompteClient } from '../server';
import { from, enLigne, query, closePool } from '../src/db/adapter';
import {
  parseDateLimite,
  delaiEtat,
  delaiLabel,
  FUSEAU_AGENCE,
} from '../src/utils/countdown';

const baseConfiguree =
  Boolean(process.env.PGUSER && process.env.PGPASSWORD) ||
  Boolean(process.env.DATABASE_URL);

afterAll(async () => {
  await closePool();
});

describe('portail client — protocole public', () => {
  it('refuse une demande sans numero (400, avant tout acces base)', async () => {
    const res = await request(app)
      .post('/api/client-portal/access')
      .send({ code: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('numéro');
  });

  it('refuse un code qui nest pas 6 chiffres (400)', async () => {
    const res = await request(app)
      .post('/api/client-portal/access')
      .send({ phone: '+237681462982', code: '12' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('6 chiffres');
  });

  it.skipIf(baseConfiguree)('sans base, repond 503 apres validation', async () => {
    const res = await request(app)
      .post('/api/client-portal/access')
      .send({ phone: '+237681462982', code: '483920' });
    expect(res.status).toBe(503);
  });
});

describe.skipIf(!baseConfiguree)('portail client — base reelle', () => {
  it('ouvre le projet du client avec un couple telephone + code valide', async () => {
    const secret = String(100000 + Math.floor(Math.random() * 900000));
    const telephone = '+2376' + String(Math.floor(10000000 + Math.random() * 89999999));

    const { data } = await from('projects')
      .insert({
        project_ref: 'prj-test-portail',
        client_name: 'Client Portail Test',
        client_phone: telephone,
        service: 'Site web vitrine',
        client_secret: secret,
        deliverables: [],
        statut: 'en_cours',
        progression: 40,
      })
      .select('*');

    const projet = enLigne<{ project_ref: string }>(data);

    try {
      const res = await request(app)
        .post('/api/client-portal/access')
        .send({ phone: telephone, code: secret });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.project.client_name).toBe('Client Portail Test');
      expect(res.body.project.progression).toBe(40);
      // Champs sûrs uniquement : pas de notes internes, pas d'email.
      expect(res.body.project).not.toHaveProperty('notes_internes');
      expect(res.body.project).not.toHaveProperty('client_email');

      const mauvais = await request(app)
        .post('/api/client-portal/access')
        .send({ phone: telephone, code: '000000' });
      expect(mauvais.status).toBe(401);
      expect(mauvais.body).not.toHaveProperty('project');
    } finally {
      if (projet) {
        await query('DELETE FROM projects WHERE project_ref = $1', ['prj-test-portail']);
      }
    }
  });

  it('la validation dun devis accepte genere un code sur le devis et le projet', async () => {
    const telephone = '+2376' + String(Math.floor(10000000 + Math.random() * 89999999));

    // Un projet deja lie par telephone porte le code genere.
    await from('projects').insert({
      project_ref: 'prj-test-compte',
      client_name: 'Client Compte Test',
      client_phone: telephone,
      service: 'E-commerce',
      deliverables: [],
      statut: 'en_cours',
    });

    try {
      const sb = { from };
      const code = await __assurerCompteClient(sb, {
        quote_ref: 'q-pas-dans-la-base',
        project_ref: null,
        client_phone: telephone,
      });

      expect(code).toMatch(/^\d{6}$/);

      const { data: projet } = await query(
        'SELECT client_secret FROM projects WHERE project_ref = $1',
        ['prj-test-compte']
      );
      expect(enLigne<{ client_secret: string }>(projet)?.client_secret).toBe(code);
    } finally {
      await query('DELETE FROM projects WHERE project_ref = $1', ['prj-test-compte']);
    }
  });
});

describe('countdown — delais', () => {
  it('une date sans heure court jusquà 23h59 précise douala (UTC+1)', () => {
    const target = parseDateLimite('2026-12-31');
    expect(target).not.toBeNull();
    // 31/12 fin de journée à +01:00 => 23:59:59.999 UTC du 31/12.
    expect(target!.toISOString()).toBe('2026-12-31T22:59:59.999Z');
  });

  it('est invalide sur une chaine illisible', () => {
    expect(parseDateLimite('javais pas pensé')).toBeNull();
    expect(parseDateLimite('')).toBeNull();
    expect(parseDateLimite(null)).toBeNull();
  });

  it('qualifie les etats de retard', () => {
    const h = 3600 * 1000;
    expect(delaiEtat(-5 * h)).toBe('depasse');
    expect(delaiEtat(0)).toBe('depasse');
    expect(delaiEtat(10 * h)).toBe('critique');
    expect(delaiEtat(48 * h)).toBe('proche');
    expect(delaiEtat(10 * 24 * h)).toBe('sain');
  });

  it('formate le decompte en jours et heures', () => {
    const j = 24 * 3600 * 1000;
    expect(delaiLabel(2 * j + 4 * 3600 * 1000)).toBe('2 j 04 h');
    expect(delaiLabel(-30 * 1000)).toBe('Délai dépassé');
    expect(delaiLabel(0)).toBe('Délai dépassé');
  });

  it('le fuseau explicite de lagence est Africa/Douala', () => {
    expect(FUSEAU_AGENCE).toBe('Africa/Douala');
  });
});