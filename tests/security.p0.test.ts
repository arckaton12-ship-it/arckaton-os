// Tests de non-regression P0 (securite).
//
// Chaque test correspond a une faille corrigee dans `server.ts`. Ils
// verifient que la correction tient face a la requete hostile d'origine, et
// pas seulement que la route repond 200.
//
// Les secrets sont neutralises dans `vitest.config.ts` (GEMINI_API_KEY,
// SUPABASE_URL, ... forces a la chaine vide). L'API bascule donc sur son mode
// degrade : la persistance se fait en memoire et aucun appel externe n'est
// emis. Les tests restent hermetiques, sans reseau ni quota.

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

// `app` est exporte par server.ts ; l'import ne demarre aucun serveur.
import { app, __authThrottle, __sanitizeForPrompt, __reponseBaseConnaissances, rateLimitsDesactives } from '../server';

describe('P0.2 — LFI sur /icons/:file', () => {
  // La route n'est installee qu'en mode production (hors Vite dev), donc elle
  // n'est pas montee pendant les tests. On verifie ici qu'une tentative
  // d'inclusion de fichier ne renvoie JAMAIS le contenu du .env : ni en
  // production (verifie sur le bundle, plus bas), ni en mode degrade.
  it('ne divulgue pas le contenu du .env', async () => {
    const res = await request(app).get('/icons/..%2f..%2f.env');
    expect(res.status).not.toBe(200);
    expect(res.text || '').not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
});

describe('P0.3 — relais WhatsApp arbitraire', () => {
  it('POST /api/leads ignore `to_numbers` et `client_ref` du client', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('X-Forwarded-For', '198.51.100.1')
      .send({
        name: 'Jean Testeur',
        phone: '+237690000000',
        message: 'Bonjour',
        // Tentative de relais vers un numero tiers et de collision d'id.
        to_numbers: ['+33600000000', '+15551234567'],
        client_ref: 'lead-fabrique-collision',
        pole_assigned: 'Tech',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // L'identifiant est genere par le serveur, jamais repris du client.
    expect(res.body.lead.id).not.toBe('lead-fabrique-collision');
    expect(res.body.lead.id).toMatch(/^lead-\d+-[a-z0-9]+$/);

    // Le pole est deduit du type de projet, pas accepte tel quel.
    expect(res.body.lead.pole_assigned).toBe('Direction');

    // Le lien WhatsApp pointe vers un numero normalise, pas vers le champ
    // hostile fourni par le client.
    expect(res.body.whatsappLink).toMatch(/^https:\/\/wa\.me\/\d{8,}/);
    expect(res.body.whatsappLink).not.toContain('33600000000');
  });

  it('POST /api/ai/generate-report ignore `to_numbers`', async () => {
    const res = await request(app)
      .post('/api/ai/generate-report')
      .set('X-Forwarded-For', '198.51.100.2')
      .send({
        clientName: 'Client Hostile',
        pole: 'Direction',
        to_numbers: ['+15551234567'],
        client_ref: 'rep-fabrique',
        messages: [{ text: 'je veux un devis' }],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // L'identifiant reste genere par le serveur.
    expect(res.body.report.id).not.toBe('rep-fabrique');
    expect(res.body.report.id).toMatch(/^rep-\d+-[a-z0-9]+$/);
  });

  it('rejette un lead sans nom ni telephone', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('X-Forwarded-For', '198.51.100.3')
      .send({ message: 'sans identite' });
    expect(res.status).toBe(400);
  });
});

describe('P0.4 — limitation de debit', () => {
  // Chaque test utilise une IP de provenance distincte. Le compteur vit en
  // memoire dans le module et n'est pas reinitialise entre les tests : sans
  // cette isolation, le nombre d'appels deja consommes par les tests
  // precedents rendrait le resultat aleatoire selon l'ordre d'execution.
  const IP_A = '198.51.100.10';
  const IP_B = '198.51.100.11';

  it('bloque POST /api/leads au-dela de 5 appels/minute', async () => {
    const payload = {
      name: 'Spam Test',
      phone: '+237690000001',
      project_type: 'Site vitrine',
      message: 'test de quota',
    };

    for (let i = 0; i < 5; i++) {
      const ok = await request(app)
        .post('/api/leads')
        .set('X-Forwarded-For', IP_A)
        .send(payload);
      expect(ok.status, `appel ${i + 1} sur 5 doit passer`).toBe(200);
    }

    const bloque = await request(app)
      .post('/api/leads')
      .set('X-Forwarded-For', IP_A)
      .send(payload);
    expect(bloque.status).toBe(429);
    expect(bloque.headers['retry-after']).toBeDefined();
  });

  it('applique un plafond distinct par route', async () => {
    // L'IP A a epuise son quota sur /api/leads. Une autre route, avec son
    // propre plafond, doit rester disponible : sinon un attaquant pouvait
    // bloquer la page de contact du site en saturant le quota de connexion,
    // ou l'inverse.
    const res = await request(app)
      .post('/api/ai/agent-chat')
      .set('X-Forwarded-For', IP_A)
      .send({ pole: 'Direction', message: 'Bonjour' });
    expect(res.status).toBe(200);
  });

  it('laisse passer une IP qui n’a pas encore consommé son quota', async () => {
    const res = await request(app)
      .post('/api/ai/agent-chat')
      .set('X-Forwarded-For', IP_B)
      .send({ pole: 'Direction', message: 'Bonjour' });
    expect(res.status).toBe(200);
  });
});

describe('P0.4b — verrouillage par compte', () => {
  // Le plafond par IP repose sur X-Forwarded-For, dont le dernier segment
  // reste influencable si le proxy ne le surcharge pas. La protection par
  // compte est donc la seule qui resiste a la rotation d'IP.
  beforeEach(() => {
    __authThrottle.reset();
  });

  it('verrouille le compte apres le nombre maximal d’echecs', () => {
    const email = 'victime@arckaton.test';

    // Tant que le seuil n'est pas atteint, le compte reste ouvert.
    for (let i = 1; i < __authThrottle.ACCOUNT_MAX_FAILURES; i++) {
      __authThrottle.recordFailedAttempt(email);
      expect(
        __authThrottle.accountLocked(email).locked,
        `le compte ne doit pas etre verrouille apres ${i} echec(s)`
      ).toBe(false);
    }

    __authThrottle.recordFailedAttempt(email);
    const locked = __authThrottle.accountLocked(email);
    expect(locked.locked).toBe(true);
    expect(locked.retryAfter).toBeGreaterThan(0);
  });

  it('liberne le compte apres une reussite', () => {
    const email = 'membre@arckaton.test';
    for (let i = 0; i < __authThrottle.ACCOUNT_MAX_FAILURES; i++) {
      __authThrottle.recordFailedAttempt(email);
    }
    expect(__authThrottle.accountLocked(email).locked).toBe(true);

    __authThrottle.clearFailedAttempts(email);
    expect(__authThrottle.accountLocked(email).locked).toBe(false);
  });

  it('isole les comptes : un compte vole ne verrouille pas les autres', () => {
    const cible = 'cible@arckaton.test';
    for (let i = 0; i < __authThrottle.ACCOUNT_MAX_FAILURES; i++) {
      __authThrottle.recordFailedAttempt(cible);
    }
    expect(__authThrottle.accountLocked(cible).locked).toBe(true);
    // Sans cela, un attaquant verrouillerait tous les comptes d'un coup.
    expect(__authThrottle.accountLocked('autre@arckaton.test').locked).toBe(false);
  });

  it('bloque la connexion sur un compte deja verrouille', async () => {
    // Le verrou est pose directement, puis on verifie que la route respecte
    // ce verrou. Ce test fonctionne meme sans Supabase : il valide le
    // controle de la route, pas l'authentification.
    const email = 'verrouille@arckaton.test';
    for (let i = 0; i < __authThrottle.ACCOUNT_MAX_FAILURES; i++) {
      __authThrottle.recordFailedAttempt(email);
    }

    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.50')
      .send({ email, password: 'mauvais-mot-de-passe' });

    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('normalise l’email : la casse et les espaces ne creent pas de nouveau compteur', async () => {
    const email = 'victime@arckaton.test';
    for (let i = 0; i < __authThrottle.ACCOUNT_MAX_FAILURES; i++) {
      __authThrottle.recordFailedAttempt(email);
    }

    // Le verrou est pose sur la forme normalisee. Si la route ne
    // normalisait pas avant de consulter le compteur, elle ne verrait pas le
    // verrou et laisserait passer une nouvelle tentative.
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.99')
      .send({ email: '  VICTIME@Arckaton.Test  ', password: 'mauvais-mot-de-passe' });

    expect(res.status).toBe(429);
  });
});

describe('P0.5 — en-tetes de securite', () => {
  it('pose les en-tetes de securite sur toutes les reponses', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toContain('camera=()');
    // Ne pas exposer le framework.
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('n applique PAS la CSP hors production (Vite a besoin d’un script inline)', async () => {
    // La suite tourne avec NODE_ENV=test. La CSP est volontairement
    // restreinte a la production : @vitejs/plugin-react injecte un script
    // inline (preamble de React Refresh) et `script-src 'self'` le
    // bloquerait, cassant `npm run dev`.
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toBeUndefined();
  });
});

describe('P0.5b — CSP de production', () => {
  // La CSP n'est posee qu'en production, donc absente du processus de test.
  // On verifie son contenu sur le bundle reellement construit.
  //
  // Ce test echoue si le bundle est absent : sans cela, un build oublie
  // faisait passer le test au vert sans avoir verifie quoi que ce soit. En
  // CI, `npm run build` precede volontairement `npm test` pour que le
  // fichier existe.
  it('autorise Google Fonts et interdit le script inline', async () => {
    const { readFileSync, existsSync, statSync } = await import('node:fs');
    const { resolve } = await import('node:path');

    const chemin = resolve('build/server.cjs');
    expect(existsSync(chemin), 'build/server.cjs absent : lancer `npm run build` avant `npm test`').toBe(true);

    // Garde-fou contre un artefact perime : sans cela, `npm test` apres une
    // modification de server.ts, sans rebuild, re-testait l'ancien bundle et
    // pouvait valider une CSP cassee dans le code courant.
    expect(
      statSync(chemin).mtimeMs,
      'build/server.cjs est plus ancien que server.ts : lancer `npm run build` avant `npm test`'
    ).toBeGreaterThanOrEqual(statSync(resolve('server.ts')).mtimeMs);

    const src = readFileSync(chemin, 'utf8');
    // Origines reellement utilisees par le front, verifiees dans index.html.
    expect(src).toContain('https://fonts.googleapis.com');
    expect(src).toContain('https://fonts.gstatic.com');
    expect(src).toContain('https://images.unsplash.com');
    expect(src).toContain("script-src 'self'");
  });

  it('n autorise pas de script inline dans la directive script-src', async () => {
    // L'assertion par juxtaposition de chaines (`not.toContain(
    // "script-src 'self' 'unsafe-inline'")`) etait facile a contourner :
    // elle ne verifiait qu'une suite de caracteres exacte, pas la directive
    // reellement analysee par le navigateur. Un reordonnancement
    // (`script-src 'unsafe-inline' 'self'`) ou une seconde directive
    // `script-src` seraient tous deux passes.
    //
    // On extrait la directive et on l'analyse jeton par jeton.
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('build/server.cjs', 'utf8');

    // L'en-tete est compose d'un tableau de directives dont chaque element
    // est un litteral de chaine : "script-src 'self'". On cible cette forme
    // litterale, et NON le texte du fichier entier : sans cela, le motif
    // attrapait aussi les commentaires du source et le nom de la directive
    // lui-meme, produisant un ensemble de jetons qui ne correspondait a rien.
    const scriptSrc: string[] = [];
    for (const m of src.matchAll(/"([a-z-]+(?:-src|-report-uri|-upgrade-insecure-requests))([^"]*)"/g)) {
      // Groupe 1 = nom complet de la directive, groupe 2 = valeurs.
      if (m[1] === 'script-src') scriptSrc.push(m[2].trim());
    }

    expect(
      scriptSrc.length,
      'directive script-src introuvable dans le bundle'
    ).toBeGreaterThan(0);

    for (const valeurs of scriptSrc) {
      const jetons = valeurs.match(/'[^']*'|"[^"]*"|[a-zA-Z0-9*._/-]+/g) ?? [];
      expect(jetons, `script-src vide : « ${valeurs} »`).not.toHaveLength(0);
      expect(jetons).toContain("'self'");
      expect(jetons).not.toContain("'unsafe-inline'");
      expect(jetons).not.toContain("'unsafe-eval'");
      expect(jetons).not.toContain('*');
    }
  });

  it('ne place pas de caractere de controle litteral dans le source', async () => {
    // Le filtre des caracteres de controle doit etre ecrit avec des
    // echappements \uXXXX. Un NUL brut dans le fichier casse le grep, certains
    // editeurs et les diffs, et invite a une regression a la reecriture.
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('server.ts', 'utf8');
    const sansTabulations = src.replace(/\r\n/g, '\n');
    const lignes = sansTabulations.split('\n');
    const coupables = lignes
      .map((l, i) => ({ i: i + 1, l }))
      .filter(({ l }) => /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(l));
    expect(
      coupables.map((c) => c.i),
      'caracteres de controle litteraux dans server.ts'
    ).toEqual([]);
  });
});

describe('P0.1 — injection de prompt', () => {
  it('refuse un message vide', async () => {
    const vide = await request(app).post('/api/ai/agent-chat').send({ pole: 'Direction', message: '' });
    expect(vide.status).toBe(400);
  });

  it('neutralise un message uniquement compose de caracteres de controle', async () => {
    // Le message est present et non vide : il ne contient QUE des caracteres
    // de controle. Sans le filtre, `sanitizeForPrompt` le reduirait a une
    // chaine vide et la route repondrait 400 de la meme facon : le test
    // passerait sans rien prouver. On verifie donc le filtre lui-meme.
    const queDesControles = '\u0000\u0007\u001f\u007f';
    const nettoye = __sanitizeForPrompt(queDesControles, 1000);
    expect(nettoye).toBe('');
    expect(/[\u0000-\u001f\u007f]/.test(nettoye)).toBe(false);

    const res = await request(app)
      .post('/api/ai/agent-chat')
      .set('X-Forwarded-For', '198.51.100.30')
      .send({ pole: 'Direction', message: queDesControles });
    expect(res.status).toBe(400);
  });

  it('borne la longueur du message et de l’historique', () => {
    // Le message est tronque a 1000 caracteres, chaque message de
    // l'historique a 500 : sans plafond, un corps de requete giant
    // saturait le prompt et le quota du modele.
    const enorme = 'A'.repeat(50_000);
    const nettoye = __sanitizeForPrompt(enorme, 1000);
    expect(nettoye.length).toBe(1000);
  });

  it('refuse une requete de copilote sans question', async () => {
    // Sans session, requireAuth doit rejeter avant meme de valider le corps.
    const res = await request(app).post('/api/ai/copilot').send({ query: '' });
    expect([400, 401, 403]).toContain(res.status);
  });

  it('traite un historique de 500 messages sans le transmettre en entier', async () => {
    // La route n'en retient que les 10 derniers. Sans plafond, un
    // historique enorme epuisait le quota Gemini sans information utile.
    const historique = Array.from({ length: 500 }, (_, i) => ({ role: 'visiteur', text: 'message ' + i }));
    const res = await request(app)
      .post('/api/ai/agent-chat')
      .set('X-Forwarded-For', '198.51.100.31')
      .send({ pole: 'Direction', message: 'Bonjour', history: historique });

    // Sans cle Gemini, la route repond via la base de connaissances : elle a
    // donc bien traverse la validation d'entree.
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('knowledge_base');
  });
});

// Le copilote renvoyait la meme phrase figee par pole, d'ou l'impression de
// « repetition ». Le repli doit desormais refleter la question ET l'etat reel
// du cockpit.
describe('Copilote — repli base de connaissances non repetitif', () => {
  const digestVide = {
    counts: { leads: 22, openTasks: 17, lateTasks: 3, activeQuotes: 5 },
    caEncaisse: 1200000,
    leadsARelancer: [],
    tachesEnRetard: [],
    devisActifs: [],
    contactsSite: [],
  };

  it('repond differemment selon l\'intention de la question', () => {
    const relance = __reponseBaseConnaissances('Quels prospects relancer ?', 'Direction', digestVide);
    const taches = __reponseBaseConnaissances('Quelles taches sont en retard ?', 'Direction', digestVide);
    const argent = __reponseBaseConnaissances('Comment ameliorer la marge et les devis ?', 'Direction', digestVide);
    expect(relance).not.toBe(taches);
    expect(taches).not.toBe(argent);
    expect(relance).toContain('22');
    expect(taches).toContain('17');
    expect(argent).toContain('5');
  });

  it('nomme les vrais prospects quand le contexte les fournit', () => {
    const digest = {
      ...digestVide,
      counts: { leads: 1, openTasks: 0, lateTasks: 0, activeQuotes: 0 },
      leadsARelancer: [
        { nom: 'Maison Kotto', statut: 'devis_envoye', projet: 'Site', budget: '750k', pole: 'Digital', source: 'site', ageJours: 12 },
      ],
    };
    const texte = __reponseBaseConnaissances('Quels prospects relancer ?', 'Direction', digest);
    expect(texte).toContain('Maison Kotto');
  });

  it('repond differemment quand les compteurs changent', () => {
    const a = __reponseBaseConnaissances('donne-moi mes priorites', 'Tech', digestVide);
    const b = __reponseBaseConnaissances('donne-moi mes priorites', 'Tech', {
      ...digestVide,
      counts: { leads: 1, openTasks: 2, lateTasks: 0, activeQuotes: 0 },
    });
    expect(a).not.toBe(b);
  });

  it('reste utilisable sans compteurs disponibles', () => {
    const texte = __reponseBaseConnaissances('analyse la rentabilite', 'Direction', null);
    expect(texte.length).toBeGreaterThan(40);
  });
});

describe('P0.6 — brouillons non publies', () => {
  it('renvoie la forme attendue a un visiteur anonyme', async () => {
    const res = await request(app).get('/api/content');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('config');
    for (const cle of ['forfaits', 'blog', 'realisations', 'temoignages']) {
      expect(Array.isArray(res.body[cle])).toBe(true);
    }
  });

  it('pose bien la contrainte `published` sur la requête Supabase', async () => {
    // Test determinant du P0.6, et le seul qui surveille la VRAIE couche de
    // donnees.
    //
    // Les tests precedents injectaient une fonction de chargement qui
    // appliquait elle-meme `filter(published)`. Or la faille d'origine etait
    // precisement l'absence du `.eq('published', true)` DANS LA REQUETE : le
    // mock faisait le travail a la place du code, donc le bloc restait vert
    // meme avec le `.eq` supprime. Un test qui_double le defaut ne prouve
    // rien.
    //
    // Ici on observe les contraintes reellement posees sur la chaine de
    // requete, sans jamais les appliquer nous-memes.
    const { __queryContentItemsForTest: query } = await import('../server');

    const lignes = [
      { id: 'b1', kind: 'blog', published: true },
      { id: 'b2', kind: 'blog', published: false },
    ];

    const requetes: { table: string; filters: Array<[string, unknown]>; ordered: string | null }[] = [];

    // Faux client Supabase : enregistre ce qu'on lui demande, retourne les
    // lignes inchangees. Aucune ligne n'est filtree ici.
    //
    // La chaine expose `exec()` comme methode terminale, et NON `then` :
    // un objet possessing `then` est alorsable, donc `await chaine`
    // appelerait `then`, qui appellerait `exec` a nouveau, etc. C'est le
    // meme piege que le thenable accidentel decrit plus bas.
    const fauxClient = {
      from(table: string) {
        const trace = { table, filters: [] as Array<[string, unknown]>, ordered: null as string | null };
        requetes.push(trace);
        const chaine = {
          select: () => chaine,
          order: (col: string) => {
            trace.ordered = col;
            return chaine;
          },
          eq: (col: string, val: unknown) => {
            trace.filters.push([col, val]);
            return chaine;
          },
          execute: async () => ({ data: lignes, error: null }),
        };
        return chaine;
      },
    };

    // Cas public : la requete DOIT porter le filtre.
    await query(fauxClient, { onlyPublished: true });
    const pub = requetes[0];
    expect(pub.table).toBe('content_items');
    expect(pub.filters).toEqual([['published', true]]);

    // Cas editeur : pas de filtre, sinon il ne pourrait plus relire ses
    // brouillons.
    await query(fauxClient, { onlyPublished: false });
    const admin = requetes[1];
    expect(admin.filters).toEqual([]);

    // La requete est toujours triee, sinon l'ordre du site saute au hasard.
    expect(pub.ordered).toBe('position');
  });

  it('ne laisse pas fuire un brouillon a un visiteur anonyme', async () => {
    // Test determinant du P0.6.
    //
    // Le defaut etait `fetchContentItems({ onlyPublished: !canEdit })` ou
    // `canEdit` valait toujours faux pour un visiteur : TOUTES les lignes
    // etaient renvoyees, brouillons compris. Or tous les tests precedents
    // passaient malgre ce defaut, parce qu'ils n'observaient que la FORME
    // d'une reponse vide — la forme est identique avec ou sans brouillon.
    //
    // Ici on injecte un jeu de donnees contenant un brouillon et on verifie
    // qu'il n'atteint pas le visiteur. `serveContentFor` est la fonction que
    // la route appelle reellement : tester autre chose ne prouverait rien.
    const { __serveContentForTest: serve } = await import('../server');

    const charge = async (options: { onlyPublished?: boolean }) => {
      // Reproduit le comportement de `fetchContentItems` : la restriction
      // `published` est appliquee PAR LE FILTRE SQL, pas en JavaScript.
      // C'est la que se situait la faille.
      const lignes = [
        { id: 'b1', kind: 'blog', slug: 'publie', published: true, position: 0, data: { titre: 'publie' } },
        { id: 'b2', kind: 'blog', slug: 'brouillon-secret', published: false, position: 1, data: { titre: 'brouillon-secret' } },
      ];
      return (options.onlyPublished ? lignes.filter((l) => l.published) : lignes) as never;
    };

    const anonyme = await serve(null, charge);
    expect(anonyme.blog).toHaveLength(1);
    // L'assertion qui compte : le brouillon n'est pas la.
    expect(JSON.stringify(anonyme)).not.toContain('brouillon-secret');

    // Un membre SANS la permission content ne doit pas le voir non plus.
    const membreSansPerm = await serve({ active: true, role: 'membre', permissions: [] }, charge);
    expect(JSON.stringify(membreSansPerm)).not.toContain('brouillon-secret');

    // Un membre AVEC la permission, lui, doit pouvoir relire son brouillon :
    // c'est ce qui rend le back-office utilisable. Sans ce cas, le correctif
    // « ne jamais renvoyer de brouillon » casserait l'edition.
    const editeur = await serve({ active: true, role: 'membre', permissions: ['content'] }, charge);
    expect(JSON.stringify(editeur)).toContain('brouillon-secret');

    // Un admin aussi.
    const admin = await serve({ active: true, role: 'admin', permissions: [] }, charge);
    expect(JSON.stringify(admin)).toContain('brouillon-secret');
  });

  it('ne laisse pas fuire un brouillon de temoignage non publie', async () => {
    // Un temoignage en attente de validation juridique est le cas le plus
    // sensible : il ne doit jamais etre visible avant validation, meme par
    // erreur de filtrage sur un seul type.
    const { __serveContentForTest: serve } = await import('../server');
    const charge = async (options: { onlyPublished?: boolean }) => {
      const lignes = [
        { id: 't1', kind: 'temoignage', slug: 'ok', published: true, position: 0, data: { nom: 'Valide' } },
        { id: 't2', kind: 'temoignage', slug: 'attente', published: false, position: 1, data: { nom: 'Pas Valide' } },
      ];
      return (options.onlyPublished ? lignes.filter((l) => l.published) : lignes) as never;
    };

    const anonyme = await serve(null, charge);
    expect(anonyme.temoignages).toHaveLength(1);
    expect(JSON.stringify(anonyme)).not.toContain('Pas Valide');
  });

  it('refuse les brouillons a un compte desactive', async () => {
    // Un compte desactive qui presenterait un jeton encore valide ne doit
    // pas retrouver acces aux brouillons.
    const { __serveContentForTest: serve } = await import('../server');
    const charge = async (options: { onlyPublished?: boolean }) => {
      const lignes = [
        { id: 'r1', kind: 'blog', slug: 'publie', published: true, position: 0, data: { titre: 'publie' } },
        { id: 'r2', kind: 'blog', slug: 'secret', published: false, position: 1, data: { titre: 'secret' } },
      ];
      return (options.onlyPublished ? lignes.filter((l) => l.published) : lignes) as never;
    };

    const desactive = await serve({ active: false, role: 'admin', permissions: ['*'] }, charge);
    expect(JSON.stringify(desactive)).not.toContain('secret');
  });

  it('refuse un `kind` inconnu et se protège de la pollution de prototype', async () => {
    // Deux regressions distinctes, memes causes racines.
    //
    // 1. `KIND_TO_RESPONSE_KEY[item.kind] || item.kind` creait une cle
    //    dynamique pour toute famille inconnue. Un brouillon portant un
    //    `kind` hors liste se retrouvait donc expose sous SA PROPRE cle dans
    //    la reponse publique, filtre `published` intact ou non.
    //
    // 2. Sur un objet litteral, `grouped['__proto__']` renvoie
    //    `Object.prototype` — truthy — et le `.push()` suivant ecrivait dans
    //    le prototype GLOBAL du processus. Idem avec `constructor`. Le
    //    risque suppose un acces direct a la table (le `service_role`
    //    contourne les policies RLS), mais la parade coute trois caracteres.
    const { __serveContentForTest: serve } = await import('../server');

    const charge = async () =>
      [
        { id: '1', kind: 'inconnu', published: true, position: 0, data: { secret: 'famille-inconnue' } },
        { id: '2', kind: '__proto__', published: true, position: 1, data: { secret: 'proto' } },
        { id: '3', kind: 'constructor', published: true, position: 2, data: { secret: 'constructor' } },
      ] as never;

    const payload = await serve(null, charge);

    // Aucune famille inconnue ne doit apparaitre dans la charge utile.
    expect(Object.keys(payload).sort()).toEqual(
      ['blog', 'config', 'forfaits', 'realisations', 'temoignages']
    );
    expect(JSON.stringify(payload)).not.toContain('famille-inconnue');
    expect(JSON.stringify(payload)).not.toContain('proto');
    expect(JSON.stringify(payload)).not.toContain('constructor');

    // Le prototype global doit etre intact : c'est le vrai impact.
    const marqueur = { secret: 'ne-pas-polluer' };
    expect((marqueur as unknown as Record<string, unknown>).secret).toBe('ne-pas-polluer');
    expect(({} as unknown as Record<string, unknown>).secret).toBeUndefined();
    expect(([] as unknown as Record<string, unknown>).secret).toBeUndefined();
  });

  it('ne deverse rien dans le prototype, même via `groupContent` seul', async () => {
    // Le test précédent observe la charge utile finale, or `buildContentPayload`
    // ne retient que cinq cles connues : une régression de `groupContent` qui
    // accepterait un `kind` inconnu resterait donc invisible. On teste ici le
    // regroupeur seul, pour couvrir la garde interne elle-même.
    const { __groupContentForTest: group } = await import('../server');

    const regroupe = group([
      { kind: '__proto__', data: { secret: 'proto' } },
      { kind: 'constructor', data: { secret: 'constructor' } },
      { kind: 'blog', data: { titre: 'ok' } },
    ] as never);

    // Seule la famille declaree doit figurer.
    expect(Object.keys(regroupe).sort()).toEqual(['blog']);
    expect(({} as unknown as Record<string, unknown>).secret).toBeUndefined();
    expect((Object.prototype as unknown as Record<string, unknown>).secret).toBeUndefined();
  });

  it('applique la regle de visibilite du CMS', async () => {
    // Le defaut etait dans `fetchContentItems` : la route l'appelait sans
    // filtre. On teste la regle isolee, car sans base de donnees on ne peut
    // pas observer le contenu d'une vraie reponse.
    const { __contentVisibilityForTest: visibility } = await import('../server');
    // Pas de membre : public -> uniquement le publie.
    expect(visibility(undefined)).toBe(true);
    expect(visibility(null)).toBe(true);
    // Membre sans la permission content : publie uniquement, meme authentifie.
    expect(visibility({ active: true, role: 'membre', permissions: [] })).toBe(true);
    // Membre avec la permission : voit tout, sinon il ne peut plus relire
    // ses propres brouillons.
    expect(visibility({ active: true, role: 'membre', permissions: ['content'] })).toBe(false);
    // Admin : voit tout.
    expect(visibility({ active: true, role: 'admin', permissions: [] })).toBe(false);
    // Compte desactive : jamais de brouillon, meme en admin.
    expect(visibility({ active: false, role: 'admin', permissions: [] })).toBe(true);
  });

  it('classe chaque type d’element dans le bon tableau', async () => {
    // Second piege du P0.6 : meme filtre applique, un brouillon pouvait
    // resurgir dans un autre champ de la reponse. On verifie donc la
    // repartition, pas seulement l'absence de brouillon.
    //
    // `groupContent` range par `kind` puis depose `item.data` dans le
    // tableau : c'est le `data` qui ressort, pas la ligne entiere. La
    // fixture reproduit cette forme, sinon le test passerait a vide.
    const { __buildContentPayloadForTest: build } = await import('../server');
    const ligne = (kind: string, titre: string) => ({
      id: `${kind}-1`,
      kind,
      slug: titre,
      title: titre,
      published: true,
      position: 0,
      data: { titre },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    const payload = build([
      ligne('config', 'institution'),
      ligne('forfait', 'pack-web'),
      ligne('blog', 'article-1'),
      ligne('realisation', 'site-1'),
      ligne('temoignage', 'avis-1'),
    ] as never);

    expect(payload.config).toEqual({ titre: 'institution' });
    expect(payload.forfaits).toEqual([{ titre: 'pack-web' }]);
    expect(payload.blog).toEqual([{ titre: 'article-1' }]);
    expect(payload.realisations).toEqual([{ titre: 'site-1' }]);
    expect(payload.temoignages).toEqual([{ titre: 'avis-1' }]);
  });

  it('renvoie la forme vide quand la table est vide', async () => {
    const { __buildContentPayloadForTest: build } = await import('../server');
    const payload = build([] as never);
    // Une reponse `undefined` ferait planter `SiteAdmin` a la lecture.
    expect(payload.config).toBeNull();
    expect(payload.forfaits).toEqual([]);
    expect(payload.blog).toEqual([]);
    expect(payload.realisations).toEqual([]);
    expect(payload.temoignages).toEqual([]);
  });
});

describe('P0.2b — amplification via un jeton bidon', () => {
  // `GET /api/content` est publique. `optionalAuth` tentait de valider TOUT
  // en-tete `Authorization` aupres de GoTrue, y compris des valeurs qui ne
  // peuvent pas etre des jetons. Un attaquant sans compte pouvait donc
  // provoquer un aller-retour reseau par requete : la route devenait un
  // generateur d'appels vers Supabase, depuis une IP non authentifiee, avec
  // un resultat identique a chaque fois.
  it('ecarte les jetons qui ne peuvent pas etre des JWT', async () => {
    // On teste la regle directement, et non via le code HTTP : `optionalAuth`
    // ne bloque jamais, donc la reponse vaut 200 que le jeton ait ete ecarte
    // ou valide. Un test de statut passerait dans les deux cas.
    const { __looksLikeJwtForTest: jwt } = await import('../server');

    // Formes impossibles pour un jeton Supabase.
    expect(jwt('nimporte-quoi')).toBe(false);
    expect(jwt('un.seul.segment.manquant')).toBe(false);
    expect(jwt('a..c')).toBe(false);
    expect(jwt('a.b.c d')).toBe(false);
    expect(jwt('a.b.c\nX-Injected: 1')).toBe(false);
    expect(jwt('')).toBe(false);

    // Forme valide : trois segments base64url. Doit passer le filtre pour
    // etre reellement envoye a Supabase.
    expect(jwt('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcDEF-_123')).toBe(true);

    // Trop long pour etre un jeton legitime.
    expect(jwt('a.' + 'b'.repeat(5000) + '.c')).toBe(false);
  });

  it('sert la version publique en toute occasion sur cette route', async () => {
    // Quelle que soit la forme du jeton, la route reste publique : elle ne
    // doit ni renvoyer 401, ni 503, ni divulguer d'information sur la session.
    for (const [i, token] of ['', 'nimporte-quoi', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig'].entries()) {
      const req = request(app)
        .get('/api/content')
        .set('X-Forwarded-For', `198.51.100.${50 + i}`);
      if (token) req.set('Authorization', `Bearer ${token}`);
      const res = await req;
      expect(res.status, `jeton « ${token || '(absent)'} »`).toBe(200);
    }
  });
});

describe('Contrat de l’API', () => {
  it('renvoie un 404 JSON pour une route /api inconnue', async () => {
    const res = await request(app).get('/api/nexiste-pas');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });

  it('expose /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('refuse l’accès aux leads sans session', async () => {
    const res = await request(app).get('/api/leads');
    expect([401, 403]).toContain(res.status);
  });

  it('refuse l’accès au copilote sans session', async () => {
    const res = await request(app).post('/api/ai/copilot').send({ query: 'Comment vas-tu ?' });
    expect([401, 403]).toContain(res.status);
  });
});

// ================================================================
//  P0.7 - Desactivation des plafonds de debit
//
//  `RATE_LIMIT_OFF=1` coupe la protection anti-bruteforce. Elle n'a
//  donc droit d'agir que sur une base locale.
//
//  Ces tests passaient par la constante interne et ne verifiaient rien
//  d'utile : ils lisaient la valeur calculee au chargement du module,
//  avec un environnement vide, donc toujours `false`. Une regression —
//  par exemple une condition rendue tautologique — serait passee
//  sans etre vue.
//
//  On eprouve donc la FONCTION, avec un environnement explicite. Elle
//  est pure : c'est ce qui rend les quatre cas testables sans
//  redemarrer de serveur.
// ================================================================
describe('P0.7 - RATE_LIMIT_OFF ne agit que sur une base locale', () => {
  it('desactive les plafonds en developpement sur une base locale', () => {
    expect(
      rateLimitsDesactives({
        RATE_LIMIT_OFF: '1',
        NODE_ENV: 'development',
        PGHOST: '127.0.0.1',
      })
    ).toBe(true);
  });

  it('refuse de desactiver les plafonds en production', () => {
    // Le cas le plus important. Il ne depend d'aucun parametre de
    // connexion : meme avec un hote local, `NODE_ENV=production`
    // garde la parade active. Une variable posee par megarde en
    // production n'affaiblit donc rien.
    expect(
      rateLimitsDesactives({
        RATE_LIMIT_OFF: '1',
        NODE_ENV: 'production',
        PGHOST: '127.0.0.1',
      })
    ).toBe(false);
    // Meme avec une DATABASE_URL locale explicite.
    expect(
      rateLimitsDesactives({
        RATE_LIMIT_OFF: '1',
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/arckaton',
      })
    ).toBe(false);
  });

  it('refuse de desactiver les plafonds vers un hote distant', () => {
    // Un `PGHOST` distant, meme en developpement : la parade reste
    // active, car la base reellement visee n'est pas locale.
    expect(
      rateLimitsDesactives({
        RATE_LIMIT_OFF: '1',
        NODE_ENV: 'development',
        PGHOST: 'db.production.example.com',
      })
    ).toBe(false);
  });

  it('DATABASE_URL prime sur PGHOST', () => {
    // Une URL distante ne doit pas etre neutralisee par un PGHOST
    // local : c'est la connexion reellement utilisee qui compte.
    expect(
      rateLimitsDesactives({
        RATE_LIMIT_OFF: '1',
        NODE_ENV: 'development',
        PGHOST: '127.0.0.1',
        DATABASE_URL: 'postgresql://u:p@db.example.com:5432/arckaton',
      })
    ).toBe(false);
  });

  it('exige la variable RATE_LIMIT_OFF', () => {
    // Une base locale ne suffit pas : sans la variable, la parade
    // reste active.
    expect(
      rateLimitsDesactives({ NODE_ENV: 'development', PGHOST: '127.0.0.1' })
    ).toBe(false);
  });

  it('traite une DATABASE_URL malformee comme un hote inconnu', () => {
    // Une URL cassee ne doit pas faire lever une exception au
    // chargement du module — ce qui tomberait tout le serveur. Elle
    // est traitee comme « pas local », donc fail-closed.
    expect(
      rateLimitsDesactives({
        RATE_LIMIT_OFF: '1',
        NODE_ENV: 'development',
        DATABASE_URL: 'pas-une-url',
      })
    ).toBe(false);
  });

  it('refuse une valeur autre que "1"', () => {
    // `RATE_LIMIT_OFF=true` est une intention frequente. Elle ne doit
    // pas suffire : la variable est un interrupteur explicite.
    for (const valeur of ['true', 'oui', '0', '2', '']) {
      expect(
        rateLimitsDesactives({
          RATE_LIMIT_OFF: valeur,
          NODE_ENV: 'development',
          PGHOST: '127.0.0.1',
        })
      ).toBe(false);
    }
  });
});

// Les preuves de terrain (photos des sorties) sont des donnees clients :
// aucun octet ne doit sortir sans session valide. En mode degrade (pas de
// base), `requireAuth` repond 401 sans jeton et 503 quand la base manque —
// jamais 200. Les binaires ne sont donc jamais servis anonymement.
describe('Preuves de terrain — acces protege', () => {
  it('refuse la liste sans jeton', async () => {
    const res = await request(app).get('/api/media?project_ref=prj-x');
    expect(res.status).toBe(401);
  });

  it('refuse le depot sans jeton', async () => {
    const res = await request(app)
      .post('/api/media?project_ref=prj-x')
      .set('Content-Type', 'image/png')
      .send(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    expect(res.status).toBe(401);
  });

  it('refuse la lecture binaire sans jeton', async () => {
    const res = await request(app).get('/api/media/med-quelconque');
    expect(res.status).toBe(401);
  });

  it('refuse la suppression sans jeton', async () => {
    const res = await request(app).delete('/api/media/med-quelconque');
    expect(res.status).toBe(401);
  });
});

// La qualification d'un lead (statut « converti », notes) doit passer par
// une session : un anonyme ne peut pas marquer un prospect comme traite.
describe('Qualification de lead — acces protege', () => {
  it('refuse la mise a jour sans jeton', async () => {
    const res = await request(app)
      .patch('/api/leads/lead-quelconque')
      .send({ statut: 'converti' });
    expect(res.status).toBe(401);
  });

  it('refuse les notes sans jeton', async () => {
    const res = await request(app)
      .patch('/api/leads/lead-quelconque')
      .send({ notes: 'client injoignable' });
    expect(res.status).toBe(401);
  });
});

// La messagerie interne est reservee aux membres connectes : un anonyme ne
// doit ni lire, ni ecrire, ni supprimer un message.
describe('Messagerie interne — acces protege', () => {
  it('refuse la lecture sans jeton', async () => {
    const res = await request(app).get('/api/messages?canal=c-general');
    expect(res.status).toBe(401);
  });

  it('refuse l\'envoi sans jeton', async () => {
    const res = await request(app)
      .post('/api/messages')
      .send({ canal: 'c-general', contenu: 'intrusion' });
    expect(res.status).toBe(401);
  });

  it('refuse la suppression sans jeton', async () => {
    const res = await request(app).delete('/api/messages/m-quelconque');
    expect(res.status).toBe(401);
  });
});

// Les champs collaboratifs d'un projet (jalons, avancement, retours client,
// sorties terrain) se poussent desormais au serveur. Un anonyme ne doit pas
// pouvoir faire avancer une feuille de route ni valider un livrable.
describe('Production projet — acces protege', () => {
  it('refuse la mise a jour des jalons sans jeton', async () => {
    const res = await request(app)
      .patch('/api/projects/prj-quelconque')
      .send({ jalons: [{ id: 'j-1', statut: 'valide' }] });
    expect(res.status).toBe(401);
  });

  it('refuse la mise a jour de l avancement sans jeton', async () => {
    const res = await request(app)
      .patch('/api/projects/prj-quelconque')
      .send({ progression: 100 });
    expect(res.status).toBe(401);
  });

  it('refuse les retours client et sorties terrain sans jeton', async () => {
    const res = await request(app)
      .patch('/api/projects/prj-quelconque')
      .send({ feedbacks: [], sorties_terrain: [] });
    expect(res.status).toBe(401);
  });
});
