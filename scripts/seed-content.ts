// ============================================================
//  Ensemencement du CMS : pousse les valeurs par defaut vers la
//  table content_items via l'API, avec le compte admin.
//
//  Pourquoi un script et pas le clic dans l'interface : la base etait
//  vide (config null, 0 forfait, 0 article). Le front affichait ses
//  valeurs en dur, donc le site public semblait rempli alors que rien
//  n etait partage. Tant que la base n est pas peuplee, toute modif
//  faite dans l interface part dans le vide pour les visiteurs.
//
//  Usage : npx tsx scripts/seed-content.ts
// ============================================================
import { DEFAULT_SITE_CONFIG, INITIAL_BLOG_POSTS } from '../src/data/blogAndTelemetryData';
import { FORFAITS_DATA, INITIAL_REALISATIONS, INITIAL_TEMOIGNAGES } from '../src/data/mockData';

const BASE = process.env.SEED_BASE_URL || 'http://127.0.0.1:3100';
const EMAIL = process.env.SEED_EMAIL || 'test.directeur@arckaton-os.test';
const PASSWORD = process.env.SEED_PASSWORD || 'TestArckaton2026!';

// Garde-fou : cet import ECRAIT le contenu du site. La cible par defaut a
// ete changee de la production vers la pile locale, et l'ecriture sur une
// cible distante demande une option explicite.
const FORCE = process.argv.includes('--force-remote');
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE) && !FORCE) {
  console.error(
    '\n  REFUS : la cible ' + BASE + ' n\'est pas locale.\n' +
    '  Cet import ecrase le contenu du site. Pour forcer :\n' +
    '    SEED_BASE_URL=<url> npx tsx scripts/seed-content.ts --force-remote\n'
  );
  process.exit(1);
}

type Item = { kind: string; slug: string; title: string; data: any };

async function login(): Promise<string> {
  const res = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error('Connexion refusee : HTTP ' + res.status);
  const body: any = await res.json();
  return body.token;
}

(async () => {
  const token = await login();
  console.log('Connecte en tant que ' + EMAIL);

  // Meme decoupage que l application : une ligne par element, la config
  // en une seule ligne "config/site".
  const items: Item[] = [
    { kind: 'config', slug: 'site', title: 'Configuration du site', data: DEFAULT_SITE_CONFIG },
    ...FORFAITS_DATA.map((f: any) => ({ kind: 'forfait', slug: f.id, title: f.name, data: f })),
    ...INITIAL_BLOG_POSTS.map((b: any) => ({ kind: 'blog', slug: b.slug || b.id, title: b.title, data: b })),
    ...INITIAL_REALISATIONS.map((r: any) => ({ kind: 'realisation', slug: r.id, title: r.name, data: r })),
    ...INITIAL_TEMOIGNAGES.map((t: any) => ({ kind: 'temoignage', slug: t.id, title: t.author, data: t })),
  ];

  const res = await fetch(BASE + '/api/content/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ items }),
  });
  const body: any = await res.json();
  if (!res.ok) throw new Error('Import refuse : ' + JSON.stringify(body));

  console.log('Import : ' + (body.imported ?? items.length) + ' element(s)');
  for (const kind of ['config', 'forfait', 'blog', 'realisation', 'temoignage']) {
    console.log('  ' + kind.padEnd(13) + items.filter((i) => i.kind === kind).length);
  }

  // Verification par relecture : on ne se fie pas au retour de l ecriture.
  const check: any = await (await fetch(BASE + '/api/content')).json();
  console.log('\nRelecture publique :');
  for (const k of ['config', 'forfaits', 'blog', 'realisations', 'temoignages']) {
    const v = check[k];
    console.log('  ' + k.padEnd(14) + (Array.isArray(v) ? v.length + ' element(s)' : v ? 'present' : 'VIDE'));
  }
  if (!check.config || !check.forfaits?.length) {
    throw new Error('La base reste vide apres import.');
  }
  console.log('\nCMS desormais servi depuis la base, partage par tous les comptes.');
})();
