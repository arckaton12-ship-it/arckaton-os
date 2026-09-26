// Diagnostic: reproduit exactement le chemin serveur (dotenv + createClient + select)
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('url =', JSON.stringify(url));
console.log('key len =', key ? key.length : 0, '| prefix =', key ? key.slice(0, 12) : 'AUCUNE');
console.log('cleur contient CR ?', key ? key.includes('\r') : false);
console.log('cleur contient guillemet ?', key ? key.includes('"') : false);

const sb = createClient(url!, key!);
const { data, error, status } = await sb
  .from('content_items')
  .select('*')
  .order('position', { ascending: true });

console.log('status =', status);
console.log('error =', error ? `${error.message} (code ${error.code})` : 'aucun');
console.log('lignes =', Array.isArray(data) ? data.length : 'n/a');
if (Array.isArray(data)) console.log(data.map((r: any) => `${r.kind}/${r.slug}`));
