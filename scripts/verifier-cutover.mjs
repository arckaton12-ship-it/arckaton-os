// Verifie de bout en bout que le cutover PostgreSQL + JWT maison
// remplace correctement GoTrue.
//
// Lance le serveur sur un port libre, contre la base locale, dans un
// role applicatif restreint (`arckaton_app`) — jamais comme
// proprietaire. Les assertions portent sur les REponses HTTP, parce
// que c'est ce que voit l'utilisateur ; un test qui ne verifiait que
// la base laisserait passer une route qui repond 200 en renvoyant une
// erreur dans le corps.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as attendre } from 'node:timers/promises';

const PORT = process.env.PORT_TEST || '3137';
const BASE = `http://127.0.0.1:${PORT}`;
const EMAIL = 'admin@arckaton.test';
const MOT_DE_PASSE = 'mot-de-passe-bootstrap-1';

const env = {
  ...process.env,
  PGHOST: '127.0.0.1',
  PGPORT: '5434',
  PGDATABASE: 'arckaton',
  PGUSER: 'arckaton_app',
  PGPASSWORD: 'arckaton_app_local',
  JWT_SECRET: 'secret-de-test-local-uniquement-32-caracteres-min',
  NODE_ENV: 'development',
  PORT,
  LOG_LEVEL: 'silent',
};

const serveur = spawn(
  process.execPath,
  [fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url)), 'server.ts'],
  { env, stdio: ['ignore', 'ignore', 'pipe'], shell: false }
);
let sortieErreur = '';
serveur.stderr.on('data', (b) => { sortieErreur += String(b); });

const resultats = [];
function verifier(nom, condition, detail = '') {
  resultats.push({ nom, ok: Boolean(condition), detail });
  console.log(`${condition ? '  OK  ' : 'ECHEC'} ${nom}${detail ? ' :: ' + detail : ''}`);
}

async function api(chemin, options = {}) {
  const reponse = await fetch(BASE + chemin, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  let corps = null;
  try { corps = await reponse.json(); } catch { corps = null; }
  return { statut: reponse.status, corps };
}

try {
  // Attendre que le serveur ecoute.
  let pret = false;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) { pret = true; break; }
    } catch { /* pas encore demarre */ }
    await attendre(400);
  }
  if (!pret) throw new Error('Le serveur n a pas demarre. ' + sortieErreur.slice(-800));
  console.log('Serveur demarre.\n');

  // ---- 1. Bootstrap --------------------------------------------
  console.log('Bootstrap');
  const etat = await api('/api/auth/bootstrap');
  verifier('GET /api/auth/bootstrap dit qu il faut bootstrap', etat.corps?.needs === true, JSON.stringify(etat.corps));

  const boot = await api('/api/auth/bootstrap', {
    method: 'POST',
    // Numero fictif camerounais : le Tchad n'est plus au perimetre
    // (cf. AGENTS.md). Un `+235 00 00 00 00` donnerait l'impression que
    // le pays est valide alors qu'il ne l'est pas.
    body: JSON.stringify({ name: 'Directeur Test', email: EMAIL, password: MOT_DE_PASSE, phone: '+237 00 00 00 00' }),
  });
  verifier('POST /api/auth/bootstrap cree un jeton', Boolean(boot.corps?.token), `statut ${boot.statut}`);
  verifier('le bootstrap renvoie le membre', boot.corps?.member?.role === 'admin');
  verifier(
    'le hash ne fuit pas dans la reponse',
    JSON.stringify(boot.corps || {}).toLowerCase().indexOf('password_hash') === -1 &&
      JSON.stringify(boot.corps || {}).toLowerCase().indexOf(MOT_DE_PASSE) === -1
  );

  // Un second bootstrap doit etre refuse — la contrainte UNIQUE
  // partielle sur role='admin' tranche, independamment du verrou.
  const boot2 = await api('/api/auth/bootstrap', {
    method: 'POST',
    body: JSON.stringify({ name: 'Intrus', email: 'intrus@arckaton.test', password: MOT_DE_PASSE }),
  });
  verifier('un second bootstrap est refuse', boot2.statut === 409 || boot2.statut === 403, `statut ${boot2.statut}`);

  // ---- 2. Login ------------------------------------------------
  console.log('\nLogin');
  const mauvais = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: 'mauvais' }),
  });
  verifier('mauvais mot de passe -> 401', mauvais.statut === 401, `statut ${mauvais.statut}`);

  const inconnu = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'personne@arckaton.test', password: 'mauvais' }),
  });
  verifier('email inconnu -> 401 (pas 500)', inconnu.statut === 401, `statut ${inconnu.statut}`);

  const login = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: MOT_DE_PASSE }),
  });
  verifier('login reussit', login.statut === 200, `statut ${login.statut} ${JSON.stringify(login.corps).slice(0, 200)}`);
  const token = login.corps?.token;
  verifier('un access token est renvoye', typeof token === 'string' && token.split('.').length === 3);
  verifier('un refresh token est renvoye', typeof login.corps?.refreshToken === 'string');
  verifier('le membre est renvoye', login.corps?.member?.email === EMAIL);
  verifier(
    'le hash ne fuit pas dans la reponse de login',
    JSON.stringify(login.corps || {}).toLowerCase().indexOf('password_hash') === -1
  );

  // ---- 3. Le token donne acces ----------------------------------
  console.log('\nAcces porte par le jeton');
  const auth = { authorization: `Bearer ${token}` };
  const moi = await api('/api/auth/me', { headers: auth });
  verifier('/api/auth/me accepte le jeton', moi.statut === 200 && moi.corps?.member?.email === EMAIL, `statut ${moi.statut}`);

  const membres = await api('/api/members', { headers: auth });
  verifier('GET /api/members accessible a l admin', membres.statut === 200 && Array.isArray(membres.corps?.members), `statut ${membres.statut}`);
  verifier('le hash reste absent de la lecture des membres', JSON.stringify(membres.corps || {}).toLowerCase().indexOf('password_hash') === -1);

  const sansToken = await api('/api/members');
  verifier('sans jeton, /api/members -> 401', sansToken.statut === 401, `statut ${sansToken.statut}`);

  const fauxToken = await api('/api/members', { headers: { authorization: 'Bearer aaa.bbb.ccc' } });
  verifier('jeton falsifie -> 401', fauxToken.statut === 401, `statut ${fauxToken.statut}`);

  // ---- 4. Refresh ----------------------------------------------
  console.log('\nRenouvellement');
  const refresh = await api('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: login.corps.refreshToken }),
  });
  verifier('le refresh aboutit', refresh.statut === 200 && Boolean(refresh.corps?.token), `statut ${refresh.statut}`);
  verifier('un nouveau jeton est emis', refresh.corps?.token !== token);
  verifier('un nouveau refresh est emis', Boolean(refresh.corps?.refreshToken));

  const moiApres = await api('/api/auth/me', { headers: { authorization: `Bearer ${refresh.corps?.token}` } });
  verifier('le jeton renouvele fonctionne', moiApres.statut === 200, `statut ${moiApres.statut}`);

  // Le refresh token ne doit pas servir d'acces.
  const refreshCommeAcces = await api('/api/members', {
    headers: { authorization: `Bearer ${login.corps.refreshToken}` },
  });
  verifier('un refresh token ne donne pas acces a l API', refreshCommeAcces.statut === 401, `statut ${refreshCommeAcces.statut}`);

  const refreshFaux = await api('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: 'aaa.bbb.ccc' }),
  });
  verifier('refresh falsifie -> 401', refreshFaux.statut === 401, `statut ${refreshFaux.statut}`);

  // ---- 5. CRUD membre ------------------------------------------
  console.log('\nCRUD membre');
  const nouvelEmail = `membre-${Date.now()}@arckaton.test`;
  const creation = await api('/api/members', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      name: 'Membre Crew', email: nouvelEmail, password: 'mot-de-passe-membre-1',
      role: 'membre', pole: 'Tech', poste_titre: 'Developpeur',
    }),
  });
  verifier('POST /api/members cree un membre', creation.statut === 201 && Boolean(creation.corps?.member?.id), `statut ${creation.statut} ${JSON.stringify(creation.corps).slice(0, 160)}`);
  const nouvelId = creation.corps?.member?.id;

  // Le membre cree doit pouvoir se connecter : c'est la preuve que
  // POST /api/members ecrit bien des identifiants utilisables, et pas
  // seulement une ligne `members`.
  const loginMembre = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: nouvelEmail, password: 'mot-de-passe-membre-1' }),
  });
  verifier('le membre cree peut se connecter', loginMembre.statut === 200, `statut ${loginMembre.statut}`);

  // Un membre ordinaire ne doit pas lire l'annuaire complet.
  const authMembre = { authorization: `Bearer ${loginMembre.corps?.token}` };
  const liste = await api('/api/members', { headers: authMembre });
  verifier('un membre simple ne lit pas /api/members', liste.statut === 403, `statut ${liste.statut}`);

  // Changement de mot de passe par l'admin.
  const nouveauMdp = 'mot-de-passe-membre-2';
  const patch = await api(`/api/members/${nouvelId}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ password: nouveauMdp }),
  });
  verifier('PATCH /api/members accepte', patch.statut === 200, `statut ${patch.statut}`);

  const ancienMdp = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: nouvelEmail, password: 'mot-de-passe-membre-1' }),
  });
  verifier('l ancien mot de passe ne fonctionne plus', ancienMdp.statut === 401, `statut ${ancienMdp.statut}`);

  const nouveauLogin = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: nouvelEmail, password: nouveauMdp }),
  });
  verifier('le nouveau mot de passe fonctionne', nouveauLogin.statut === 200, `statut ${nouveauLogin.statut}`);

  // Email duplique : la base doit trancher.
  const doublon = await api('/api/members', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ name: 'Doublon', email: nouvelEmail, password: 'x'.repeat(10) }),
  });
  verifier('un email en doublon est refuse', doublon.statut === 409, `statut ${doublon.statut}`);

  // Desactivation : le compte existe mais ne doit plus se connecter.
  const desactive = await api(`/api/members/${nouvelId}`, {
    method: 'PATCH', headers: auth, body: JSON.stringify({ active: false }),
  });
  verifier('PATCH active=false accepte', desactive.statut === 200, `statut ${desactive.statut}`);

  const loginDesactive = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: nouvelEmail, password: nouveauMdp }),
  });
  verifier('un compte desactive ne se connecte plus', loginDesactive.statut === 403, `statut ${loginDesactive.statut}`);

  // Un jeton deja delivre ne doit pas resusciter un compte desactive.
  const tokenAvantDesactivation = nouveauLogin.corps?.token;
  const appelAvecVieuxJeton = await api('/api/members/directory', {
    headers: { authorization: `Bearer ${tokenAvantDesactivation}` },
  });
  verifier(
    'un jeton anterieur ne donne plus acces apres desactivation',
    appelAvecVieuxJeton.statut === 401 || appelAvecVieuxJeton.statut === 403,
    `statut ${appelAvecVieuxJeton.statut}`
  );

  // Suppression.
  const suppression = await api(`/api/members/${nouvelId}`, { method: 'DELETE', headers: auth });
  verifier('DELETE /api/members accepte', suppression.statut === 200, `statut ${suppression.statut}`);

  // ---- 6. Sondes et degradation --------------------------------
  console.log('\nSondes');
  const santeAuth = await api('/api/health', { headers: auth });
  verifier('/api/health authentifie renvoie une base joignable', santeAuth.corps?.base?.joignable === true, JSON.stringify(santeAuth.corps?.base));
  verifier('/api/health signale l auth operationnelle', santeAuth.corps?.base?.authOperationnelle === true);
  verifier('/api/health ne divulgue pas de secret', JSON.stringify(santeAuth.corps || {}).toLowerCase().indexOf('secret-de-test') === -1);
} catch (err) {
  verifier('execution complete', false, err instanceof Error ? err.message : String(err));
  if (sortieErreur) console.log('\n--- stderr ---\n' + sortieErreur.slice(-1500));
} finally {
  serveur.kill();
}

const echecs = resultats.filter((r) => !r.ok);
console.log(`\n${resultats.length - echecs.length} OK / ${echecs.length} ECHEC`);
if (echecs.length) {
  console.log('\nEchecs :');
  for (const e of echecs) console.log('  - ' + e.nom + (e.detail ? ' :: ' + e.detail : ''));
}
process.exit(echecs.length ? 1 : 0);
