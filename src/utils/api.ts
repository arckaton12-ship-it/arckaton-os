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

const TOKEN_KEY = 'arckaton_os_token';
const REFRESH_KEY = 'arckaton_os_refresh';

// ── Renouvellement de session ────────────────────────────────────────────
//
// Le jeton d'accès Supabase expire au bout d'environ une heure. Avant, la
// seule chose stockée était ce jeton : au-delà, l'interface affichait
// encore l'utilisateur connecté alors que chaque appel API répondait 401
// "Session invalide ou expirée".

/** Date d'expiration d'un JWT, en millisecondes, ou null si illisible. */
function tokenExpiryMs(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload?.exp !== 'number') return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

let refreshInFlight: Promise<string | null> | null = null;

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem('arckaton_os_member');
  window.dispatchEvent(new CustomEvent('arckaton:session-expired'));
}

/** Renouvelle le jeton d'accès. Une seule requête à la fois. */
export function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) {
    // Session ouverte avant la mise en place du refresh token : elle ne peut
    // pas être renouvelée. On la ferme proprement pour renvoyer vers l'écran
    // de connexion, sinon l'utilisateur reste devant une interface qui ne
    // charge plus rien.
    if (localStorage.getItem(TOKEN_KEY)) clearSession();
    return Promise.resolve(null);
  }

  refreshInFlight = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        // Refresh token périmé : on efface la session pour que
        // l'utilisateur se reconnecte au lieu de rester bloqué.
        if (res.status === 401) clearSession();
        return null;
      }
      const data = await res.json().catch(() => null);
      if (!data?.token) return null;
      localStorage.setItem(TOKEN_KEY, data.token);
      if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
      return data.token as string;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

let keepAliveStarted = false;

/**
 * Maintient la session en vie sans dépendre d'une action de l'utilisateur.
 * Les appels API lisent le jeton depuis localStorage de façon synchrone :
 * on renouvelle donc en amont, plutôt que d'intercepter chaque réponse.
 */
export function startSessionKeepAlive(): () => void {
  if (keepAliveStarted) return () => {};
  keepAliveStarted = true;

  const renew = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const exp = tokenExpiryMs(token);
    if (exp === null) return;
    if (Date.now() >= exp - 300000) void refreshAccessToken();
  };

  const onVisible = () => {
    if (document.visibilityState === 'visible') renew();
  };

  // Au chargement, au retour sur l'onglet, puis périodiquement.
  renew();
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', renew);
  const timer = window.setInterval(renew, 4 * 60 * 1000);

  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', renew);
    window.clearInterval(timer);
    keepAliveStarted = false;
  };
}

function authHeaders(): Record<string, string> {
  const t = localStorage.getItem(TOKEN_KEY);
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
      // Session expirée : on tente un renouvellement puis un seul nouvel
      // essai. Sans cela, l'onglet affiche une erreur et une liste vide,
      // ce qui laisse croire que les données ont disparu.
      if (res.status === 401 && options.auth !== false) {
        const renewed = await refreshAccessToken();
        if (renewed) {
          try {
            const retry = await once(path, { ...options, timeoutMs });
            if (retry.status === 204) return undefined as T;
            if (retry.ok) {
              const retryRaw = await retry.text();
              if (!retryRaw) return undefined as T;
              try {
                return JSON.parse(retryRaw) as T;
              } catch {
                // Réponse non JSON après renouvellement : on laisse remonter
                // l'erreur d'origine plutôt que de masquer la panne.
              }
            }
          } catch {
            // le nouvel essai échoue : on remonte l'erreur d'origine
          }
        }
      }
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

// ── Preuves de terrain (binaires) ────────────────────────────────────────
//
// `apiRequest` ne convient pas ici : il sérialise le corps en JSON, or
// une photo se transmet telle quelle. Ces deux appels réutilisent la
// même gestion de session (en-tête Authorization, renouvellement sur
// 401) sans passer par JSON.

function withQuery(path: string, query: Record<string, string>): string {
  const qs = new URLSearchParams(query).toString();
  return qs ? `${path}?${qs}` : path;
}

/** Envoie un fichier en corps brut. `mime` devient le Content-Type. */
export async function apiUpload<T = any>(
  path: string,
  file: Blob,
  query: Record<string, string>
): Promise<T> {
  const url = withQuery(path, query);
  const doOnce = () =>
    fetch(url, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });

  let res = await doOnce();
  if (res.status === 401) {
    const renewed = await refreshAccessToken();
    if (renewed) res = await doOnce();
  }

  const raw = await res.text();
  let payload: any = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }
  if (!res.ok) {
    throw new ApiError(payload?.error || `Échec de l'envoi (${res.status})`, 'http', res.status);
  }
  return payload as T;
}

/** Récupère un binaire protégé et le rend sous forme d'URL locale. */
export async function apiBlobUrl(path: string): Promise<string> {
  const doOnce = () => fetch(path, { headers: authHeaders() });

  let res = await doOnce();
  if (res.status === 401) {
    const renewed = await refreshAccessToken();
    if (renewed) res = await doOnce();
  }
  if (!res.ok) {
    throw new ApiError(`Média indisponible (${res.status})`, 'http', res.status);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
