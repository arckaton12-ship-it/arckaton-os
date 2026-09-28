// ============================================================
//  Audit navigateur du dashboard connecte, via CDP (protocole
//  DevTools) : pas de simulation de clic, on parle directement au
//  navigateur comme le ferait un test Playwright.
//
//  Ce que l on verifie, et que la recette HTTP ne peut pas voir :
//   - la page se rend-elle sans exception JavaScript
//   - les erreurs console (une promesse rejetee en silence ne se voit
//     pas dans le code de retour HTTP)
//   - le texte reellement affiche a-t-il du sens (pas de "undefined",
//     pas de "[object Object]", pas de vide)
//
//  Usage : node audit-nav.cjs <email>
// ============================================================
const { spawn } = require('child_process');
const fs = require('fs');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'https://arckaton-os.onrender.com';
const MDP = 'TestArckaton2026!';
// Port et profil uniques a chaque execution. Sans cela, deux executions
// successives se volent le port de debogage et l audit s attache au
// navigateur d avant : le resultat devient aleatoire, ce qui est pire
// qu un echec franc.
const PORT = 9500 + Math.floor(Math.random() * 500);
const PROFIL = require('os').tmpdir() + '\\edge-audit-' + PORT;
const email = process.argv[2] || 'test.directeur@arckaton-os.test';

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.attentes = new Map(); this.evenements = []; }
  static async connecter(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const c = new CDP(ws);
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && c.attentes.has(m.id)) { c.attentes.get(m.id)(m); c.attentes.delete(m.id); }
      else if (m.method) c.evenements.push(m);
    };
    return c;
  }
  envoyer(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => {
      this.attentes.set(id, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)));
      setTimeout(() => rej(new Error(method + ' : delai depasse')), 40000);
    });
  }
  async evaluer(expression) {
    const r = await this.envoyer('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'exception');
    return r.result.value;
  }
}

(async () => {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: MDP }),
  });
  const b = await r.json();
  if (!b.token) throw new Error('connexion impossible');
  const membre = b.member;
  console.log('Compte : ' + membre.name + ' (' + membre.pole + ')');

  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--user-data-dir=' + PROFIL,
    '--remote-debugging-port=' + PORT, '--window-size=1440,2000', 'about:blank',
  ], { stdio: 'ignore' });

  let cibles = null;
  for (let i = 0; i < 60 && !cibles; i++) {
    await attendre(500);
    try {
      // Preuve d appartenance : le navigateur annonce lui-meme le port
      // sur lequel il ecoute. Un Edge laisse ouvert par un run precedent
      // ne peut donc pas s interposer. On ne ferme JAMAIS les navigateurs
      // de l'utilisateur pour les besoins d un test.
      const version = await (await fetch('http://127.0.0.1:' + PORT + '/json/version')).json();
      if (String(version.webSocketDebuggerUrl || '').indexOf(':' + PORT + '/') === -1) continue;
      const info = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
      cibles = info.filter((t) => t.type === 'page');
      if (!cibles.length) cibles = null;
    } catch {}
  }
  if (!cibles) throw new Error('Edge ne repond pas sur le port ' + PORT);
  const page = cibles[0];
  const cdp = await CDP.connecter(page.webSocketDebuggerUrl);
  await cdp.envoyer('Runtime.enable');
  await cdp.envoyer('Log.enable');
  await cdp.envoyer('Page.enable');

  const etape = async (nom, url) => {
    if (url) { await cdp.envoyer('Page.navigate', { url }); await attendre(5500); }
    const r = await cdp.evaluer(`(() => {
      const t = document.body.innerText || '';
      return {
        titre: document.title,
        longueur: t.length,
        h1: Array.from(document.querySelectorAll('h1,h2')).slice(0,4).map(e=>e.innerText.trim()).filter(Boolean),
        undefined: (t.match(/undefined/g)||[]).length,
        nan: (t.match(/\\bNaN\\b/g)||[]).length,
        objet: (t.match(/\\[object Object\\]/g)||[]).length,
        chargement: /chargement|chargement\\.\\.\\./i.test(t),
        extrait: t.replace(/\\s+/g,' ').slice(0,220)
      };
    })()`);
    console.log('\n[' + nom + '] ' + (url || 'page courante, sans rechargement'));
    console.log('  titre      : ' + r.titre);
    console.log('  titres     : ' + r.h1.join(' | '));
    console.log('  longueur   : ' + r.longueur + ' caracteres affiches');
    console.log('  undefined  : ' + r.undefined + '   NaN: ' + r.nan + '   [object Object]: ' + r.objet);
    console.log('  extrait    : ' + r.extrait);
    return r;
  };

  // 1. Site public, sans session.
  const pub = await etape('public', BASE + '/');

  // 2. Connexion reelle par le formulaire, comme un membre. Injecter un
  //    jeton dans localStorage ne prouverait rien : l'OS bascule en mode
  //    dashboard depuis le flux de connexion, pas depuis le stockage.
  //    L'entree se fait par un bouton du site public, pas par une URL.
  await cdp.envoyer('Page.navigate', { url: BASE + '/' });
  await attendre(3000);
  const connecte = await cdp.evaluer(`(async () => {
    const attendreEl = async (sel, ms) => {
      const t0 = Date.now();
      while (Date.now() - t0 < (ms||15000)) {
        const e = document.querySelector(sel);
        if (e) return e;
        await new Promise(r => setTimeout(r, 200));
      }
      return null;
    };
    // Le bouton d'entree reel de l'OS, sur le site public.
    const boutons = Array.from(document.querySelectorAll('button,a'));
    const entree = boutons.find(e => /ouvrir l'?os/i.test(e.innerText || ''))
             || boutons.find(e => /espace membres/i.test(e.innerText || ''));
    if (!entree) return { ok: false, raison: 'aucun bouton d acces OS sur la page publique' };
    entree.click();
    const pass = await attendreEl('input[type=password]');
    const mail = await attendreEl('input[type=email]');
    if (!mail || !pass) return { ok: false, raison: 'le clic n a pas mene au formulaire (bouton : "' + (entree.innerText||'').trim() + '")' };
    const reactify = (el, v) => {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
      Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    reactify(mail, ${JSON.stringify(email)});
    reactify(pass, ${JSON.stringify(MDP)});
    // React n a pas encore traite les evenements d input au meme instant :
    // soumettre dans la meme boucle envoyait un formulaire vide, d ou les
    // echecs de connexion aleatoires observes avant ce delai.
    await new Promise(r => setTimeout(r, 400));
    pass.focus();
    pass.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    // Attendre un marqueur du DASHBOARD, pas un mot present partout.
    // "ARKA-PME" figure aussi sur le site public : attendre ce mot faisait
    // conclure a une reussite avant meme que la connexion aboutisse, et le
    // parcours des onglets ne trouvait plus aucun bouton.
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      const t = document.body.innerText || '';
      if (/Cockpit Op[ée]rationnel|D[ée]connexion|Cockpit|vue filtr[ée]e sur votre p[ôo]le/.test(t)) break;
      await new Promise(r => setTimeout(r, 400));
    }
    const final = document.body.innerText || '';
    if (!/Cockpit Op[ée]rationnel|D[ée]connexion|Cockpit|vue filtr[ée]e sur votre p[ôo]le/.test(final)) {
      return { ok: false, raison: 'la connexion a echoue : ' + final.replace(/\\s+/g,' ').slice(0, 160) };
    }
    return { ok: true, bouton: (entree.innerText||'').trim() };
  })()`);
  console.log('\n[connexion par le formulaire] ' + (connecte.ok ? 'via "' + connecte.bouton + '"' : 'ECHEC : ' + connecte.raison));
  if (!connecte.ok) throw new Error(connecte.raison);
  await attendre(4500);

  // On relit la page SANS recharger : le mode dashboard est un etat en
  // memoire. Re-naviguer renverrait le membre sur le site public et
  // ferait passer cet audit pour un echec alors que la connexion a
  // reussi.
  const dash = await etape('dashboard connecte', null);

  // 3. Parcours des onglets. C'est la que se revelent les pannes : une
  //    section qui ne se charge pas ne leve aucune erreur reseau si son
  //    appel n est tout simplement pas declenche.
  // Les onglets se succedent, donc on attend un SIGNE, pas une duree.
  // Avec une attente fixe, le test echouait une fois sur deux : quand
  // Google Fonts ne repond pas, la page met plus de temps a se stabiliser
  // et le parcours tombait sur l'onglet precedent.
  const cliquerOnglet = (nom) => cdp.evaluer(`(async () => {
    const el = Array.from(document.querySelectorAll('button,a'))
      .find(e => (e.innerText||'').replace(/\\s+/g,' ').trim().startsWith(${JSON.stringify(nom)}));
    if (!el) return { trouve: false };
    const avant = (document.body.innerText||'').length;
    el.click();
    const t0 = Date.now();
    let dernier = avant, stable = 0, longueur = avant;
    while (Date.now() - t0 < 20000) {
      await new Promise(r => setTimeout(r, 350));
      longueur = (document.body.innerText||'').length;
      stable = (longueur === dernier && longueur !== avant) ? stable + 1 : 0;
      dernier = longueur;
      if (stable >= 2) break;
    }
    const t = document.body.innerText || '';
    return {
      trouve: true, longueur,
      undefined: (t.match(/undefined/g)||[]).length,
      nan: (t.match(/\\bNaN\\b/g)||[]).length,
      objet: (t.match(/\\[object Object\\]/g)||[]).length
    };
  })()`);

  // Onglets a tester : ceux REELLEMENT proposes. La navigation differe
  // selon le role (les membres non admin n'ont pas "Membres &
  // Habilitations"), et un membre de pole a un en-tete different. Tester
  // une liste figee donnait des onglets "absents" a tort, pris pour des
  // pannes alors que le produit fait ce qu il doit.
  const onglets = await cdp.evaluer(`(() => {
    const nav = document.querySelector('nav');
    if (!nav) return [];
    return Array.from(nav.querySelectorAll('button,a'))
      .map(e => (e.innerText||'').replace(/\\s+/g,' ').trim())
      .filter(t => t && t.length < 60);
  })()`);
  console.log('\n=== parcours des onglets ===');
  console.log('  onglets proposes a ce role : ' + (onglets.length ? onglets.join(' | ') : 'AUCUN (navigation introuvable)'));
  if (!onglets.length) throw new Error('navigation de l OS introuvable : la page connectee ne rend pas le cockpit');
  const rapport = [];
  for (const nom of onglets) {
    const r = await cliquerOnglet(nom);
    if (!r.trouve) { console.log('  (absent)  ' + nom); rapport.push({ nom, ok: false }); continue; }
    const vide = r.longueur < 700;
    const sale = r.undefined || r.nan || r.objet;
    const etat = vide ? 'VIDE' : sale ? 'SALE' : 'ok';
    console.log('  ' + etat.padEnd(7) + nom.padEnd(28) + r.longueur + ' car.' + (sale ? '  undefined=' + r.undefined + ' NaN=' + r.nan : ''));
    rapport.push({ nom, ok: etat === 'ok', longueur: r.longueur });
  }
  const problemes = rapport.filter((x) => !x.ok);
  console.log('\nonglets Healthy : ' + (rapport.length - problemes.length) + '/' + rapport.length);

  // 4. Contenu reellement affiche par les deux onglets modifies. On lit
  //    la zone de contenu, pas la barre de navigation, sinon chaque
  //    extrait commence par le menu et ne prouve rien.
  const contenu = async (nom, attendu) => {
    const r = await cliquerOnglet(nom);
    if (!r.trouve) { console.log('  ' + nom + ' : onglet introuvable'); return false; }
    const texte = await cdp.evaluer(`(() => {
      const zone = document.querySelector('main') || document.body;
      return (zone.innerText || '').replace(/\\s+/g,' ');
    })()`);
    console.log('\n[' + nom + ']');
    console.log('  ' + texte.slice(0, 430));
    const manques = (attendu || []).filter((x) => texte.indexOf(x) === -1);
    console.log('  contenu attendu' + (manques.length ? ' MANQUANT : ' + manques.join(', ') : ' : present'));
    return manques.length === 0;
  };

  const okMessagerie = await contenu('Messagerie Interne', [
    'tech-architecture', 'studio-créatif', 'terrain-activations', 'général',
  ]);
  const okCms = await contenu('Gestion Site', ['Live CMS', 'Mode Écriture']);
  // Les forfaits vivent dans un onglet secondaire du CMS : sans le
  // ouvrir, leur absence ne prouve rien.
  const forfaits = await cdp.evaluer(`(async () => {
    const onglet = Array.from(document.querySelectorAll('button'))
      .find(e => /forfaits/i.test((e.innerText||'').trim()));
    if (!onglet) return { trouve: false };
    onglet.click();
    await new Promise(r => setTimeout(r, 2500));
    const zone = document.querySelector('main') || document.body;
    const t = (zone.innerText || '').replace(/\\s+/g,' ');
    return { trouve: true, texte: t, a: t.indexOf('Initiation') >= 0, b: t.indexOf('Synergie') >= 0, c: t.indexOf('Architecture') >= 0 };
  })()`);
  if (!forfaits.trouve) console.log('\n[forfaits] onglet introuvable');
  else {
    console.log('\n[onglet forfaits du CMS]');
    console.log('  ' + (forfaits.texte.slice(forfaits.texte.indexOf('CMS'), forfaits.texte.indexOf('CMS') + 330) || forfaits.texte.slice(0, 300)));
    console.log('  forfaits lus depuis la base : Initiation=' + forfaits.a + ' Synergie=' + forfaits.b + ' Architecture=' + forfaits.c);
  }
  console.log('\nmessagerie : ' + (okMessagerie ? 'canaux bien listes' : 'canaux manquants'));
  console.log('gestion du site : ' + (okCms ? 'panneau CMS vivant, mode ecriture actif' : 'panneau CMS incomplet'));

  // 5. Erreurs remontees par la page elle-meme, avec l'URL fautive.
  const journal = cdp.evenements.filter((e) => e.method === 'Log.entryAdded' || e.method === 'Runtime.exceptionThrown');
  console.log('\n--- journal du navigateur ---');
  const utiles = journal.filter((e) => {
    const ent = e.params?.entry;
    const t = ent?.text || e.params?.exceptionDetails?.text || '';
    return /error|uncaught|failed|refus|403|401|400/i.test(t) && !/favicon|ERR_BLOCKED_BY_CLIENT|fonts\\.(gstatic|googleapis)/i.test(t);
  });
  if (!utiles.length) console.log('  aucune erreur console ni exception JavaScript');
  utiles.slice(0, 12).forEach((e) => {
    const ent = e.params?.entry;
    const t = ent?.text || e.params?.exceptionDetails?.text || '';
    const ou = ent?.url ? '  <- ' + ent.url.replace(BASE, '') : '';
    console.log('  ' + t.replace(/^.*?Failed to load resource: /, 'Requete refusee : ').slice(0, 130) + ou);
  });

  proc.kill();
  try { fs.rmSync(PROFIL, { recursive: true, force: true }); } catch {}
  const souci = pub.undefined || dash.undefined || pub.nan || dash.nan || utiles.length || problemes.length || !okMessagerie || !okCms || !forfaits.trouve || !forfaits.a;
  console.log('\n' + (souci ? 'Anomalies a traiter.' : 'Rendu navigateur conforme, sans erreur console.'));
  if (souci) process.exitCode = 1;
})().catch((e) => { console.error('ECHEC : ' + e.message); process.exit(1); });
