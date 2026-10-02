// Tests du conseiller IA public : il s'adresse a un client/prospect, jamais
// comme s'il etait un membre de l'equipe ou l'identite d'un pole interne.
//
// Regression observee en production : l'agent public repondait
// « En tant que Direction, je prends en charge votre demande » — la categorie
// interne `pole` servait d'identite au modele.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import {
  app,
  __generateSmartFallbackResponse,
  __formaterContenuPublic,
  __construireInstructionAgentPublic,
  __normaliserRequeteGemini,
} from '../server';

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

// L'agent public ne doit plus reciter de prix/stats/adresse codes en dur :
// sa source unique est le contenu REELLEMENT publie sur le site.
describe('Agent public — ancre sur le contenu publie', () => {
  const items = [
    {
      id: 'cfg', kind: 'config', slug: 'site', published: true, position: 0,
      data: {
        hero: { subtitle: 'Systemes digitaux complets', stat_1_val: '+337%', stat_1_label: 'de conversion' },
        contact: { whatsapp_display: '+237 6 99 00 00 00', address_yaounde: 'Mimboman' },
      },
      created_at: '', updated_at: '',
    },
    {
      id: 'frf', kind: 'forfait', slug: 'synergie', title: 'Synergie', published: true, position: 1,
      data: {
        name: 'Synergie', tagline: 'Le plus choisi',
        creation_price: '750 000 FCFA', monthly_price: '350 000 FCFA',
        creation_features: ['Site 5-8 pages'], monthly_features: ['Reporting mensuel'],
      },
      created_at: '', updated_at: '',
    },
  ];

  it('met le contenu publie en texte (forfaits, chiffres, coordonnees)', () => {
    const texte = __formaterContenuPublic(items) || '';
    expect(texte).toContain('Synergie');
    expect(texte).toContain('750 000 FCFA');
    expect(texte).toContain('+337%');
    expect(texte).toContain('+237 6 99 00 00 00');
  });

  it('injecte le contenu dans l instruction systeme', () => {
    const instr = __construireInstructionAgentPublic('MARQUEUR-CONTENU-XYZ');
    expect(instr).toContain('MARQUEUR-CONTENU-XYZ');
    expect(instr).toContain('CONTENU OFFICIEL');
  });

  it('sans contenu, interdit de citer un prix ou une adresse', () => {
    const instr = __construireInstructionAgentPublic(null);
    expect(instr).toContain('indisponible');
    expect(instr).not.toContain('380 000');
    expect(instr).not.toContain('Mimboman');
  });
});

// Le SDK `@google/genai` attend `systemInstruction` dans `config` : a la
// racine, il l'ignore silencieusement. Les consignes ne parvenaient donc
// jamais au modele.
describe('Gemini — la consigne systeme va bien dans config', () => {
  it('deplace systemInstruction dans config', () => {
    const r = __normaliserRequeteGemini({ systemInstruction: 'REGLES', contents: 'Bonjour' });
    expect(r.contents).toBe('Bonjour');
    expect(r.config.systemInstruction).toBe('REGLES');
    expect(r.systemInstruction).toBeUndefined();
  });

  it('preserve une config existante', () => {
    const r = __normaliserRequeteGemini({
      systemInstruction: 'R',
      contents: 'x',
      config: { temperature: 0.2 },
    });
    expect(r.config).toEqual({ temperature: 0.2, systemInstruction: 'R' });
  });

  it('ne cree pas de config quand il n y a pas de consigne', () => {
    const r = __normaliserRequeteGemini({ contents: 'x' });
    expect(r.config).toBeUndefined();
  });
});
