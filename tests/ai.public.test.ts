// Tests du conseiller IA public : il s'adresse a un client/prospect, jamais
// comme s'il etait un membre de l'equipe ou l'identite d'un pole interne.
//
// Regression observee en production : l'agent public repondait
// « En tant que Direction, je prends en charge votre demande » — la categorie
// interne `pole` servait d'identite au modele.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, __generateSmartFallbackResponse } from '../server';

describe('IA publique — le conseiller parle au client', () => {
  it('le repli ne se presente jamais comme un pole ni comme l equipe interne', () => {
    const reply = __generateSmartFallbackResponse('Tech', 'Bonjour, pouvez-vous me rappeler ?');
    expect(reply).not.toMatch(/conseiller du p[oô]le/i);
    expect(reply.toLowerCase()).not.toContain('je prends en charge');
    expect(reply).toContain("conseiller d'Arckaton");
  });

  it('POST /api/ai/agent-chat repond comme a un client, pas a un collegue', async () => {
    const res = await request(app)
      .post('/api/ai/agent-chat')
      .send({ pole: 'Direction', message: 'Bonjour, je suis gerant d une boutique a Douala' });
    expect(res.status).toBe(200);
    const reply: string = res.body.reply || '';
    expect(reply.length).toBeGreaterThan(0);
    // Ne doit jamais endosser l'identite d'un pole interne.
    expect(reply).not.toMatch(/en tant que\s+\*{0,2}(direction|tech|cr[eé]atif)/i);
    expect(reply).not.toMatch(/conseiller du p[oô]le/i);
    expect(reply.toLowerCase()).not.toContain('je prends en charge');
  });
});
