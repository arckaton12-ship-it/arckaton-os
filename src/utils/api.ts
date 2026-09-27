/**
 * Accès réseau centralisé vers l'API Arckaton OS.
 *
 * Le navigateur remontait des messages bruts du type
 * "NetworkError when attempting to fetch resource" (Firefox) ou
 * "Failed to fetch" (Chrome) sans aucune indication de la cause. Ces
 * messages surviennent quand le service Render est en veille et doit
 * demarrer a froid, quand la connexion est coupee, ou quand un proxy
 * n'est pas configure en developpement local.
 *
 * On ajoute ici un delai maximal, une nouvelle tentative sur erreur
 * reseau, et un message exploitable par l'utilisateur.
 */

export class ApiError extends Error {
  status: number;
  kind: 'network' | 'timeout' | 'http' | 'parse';

  constructor(message: string, kind: ApiError['kind'], status = 0) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

const DEFAULT_TIMEOUT = 20000;
// Le plan gratuit Render dort apres inactivite : le premier appel paie
// un demarrage a froid qui peut depasser largement 20 s.
const COLD_START_TIMEOUT = 90000;

function authHeaders(): Record<string, string> {
  const t = localStorage.getItem('arckaton_os_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  timeoutMs?: number;
  retries?: number;
}

async function once(path: string, options: RequestOptions): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = { ...(options.auth === false ? {} : authHeaders()) };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  try {
    return await fetch(path, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function apiRequest<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const isColdStartProbe = path === '/api/health';
  const timeoutMs = options.timeoutMs ?? (isColdStartProbe ? COLD_START_TIMEOUT : DEFAULT_TIMEOUT);
  const retries = options.retries ?? (options.method && options.method !== 'GET' ? 0 : 1);

  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response;
    try {
      res = await once(path, { ...options, timeoutMs });
    } catch (err: any) {
      const aborted = err?.name === 'AbortError';
      lastError = new ApiError(
        aborted
          ? `Le serveur n'a pas répondu à temps. Il se réveille peut-être (démarrage à froid) : réessayez dans un instant.`
          : `Impossible de joindre le serveur Arckaton OS. Vérifiez votre connexion internet.`,
        aborted ? 'timeout' : 'network'
      );
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw lastError;
    }

    if (res.status === 204) return undefined as T;

    let payload: any = null;
    const raw = await res.text();
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        // Une route d'API qui renvoie l'index.html arrive ici : c'est le
        // symptome d'un backend absent derriere le proxy ou le domaine.
        if (raw.trim().startsWith('<')) {
          throw new ApiError(
            `La requête a renvoyé une page HTML au lieu de l'API. Le backend n'est pas joignable à cette adresse.`,
            'parse'
          );
        }
        try {
          payload = { error: raw.slice(0, 200) };
        } catch {
          payload = null;
        }
      }
    }

    if (!res.ok) {
      throw new ApiError(
        payload?.error || `Erreur ${res.status}`,
        'http',
        res.status
      );
    }

    return payload as T;
  }

  throw lastError || new ApiError('Requête impossible', 'network');
}

/** Variante POST/PUT/PATCH qui renvoie aussi la réponse HTTP brute. */
export async function apiWrite<T = any>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<T> {
  return apiRequest<T>(path, { method, body, retries: 0 });
}
