# Arckaton — Agence Digitale & Arckaton OS

Base unifiée (export AI Studio repensé) : **site public** + **dashboard/cockpit Arckaton OS** dans un seul projet React 19 + Vite + Tailwind v4, serveur Express (`server.ts`) pour l'IA (Gemini) et la persistance.

## Stack
- Front : React 19, Vite 6, TypeScript, Tailwind v4, motion, lucide-react
- Back : Express (`server.ts`), `@google/genai` (agent conseiller + copilote), `@supabase/supabase-js` (persistance)
- Mode site public / dashboard commutable via l'interface (`RoleSwitcher`)

## Démarrage local

```bash
npm install
# copier .env.example vers .env puis renseigner :
#   GEMINI_API_KEY  (obligatoire pour l'agent IA)
#   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (optionnel, voir ci-dessous)
npm run dev      # serveur Express + Vite sur http://localhost:3000
```

Production :
```bash
npm run build   # vite build + esbuild server.ts -> dist/ (front + server.cjs)
npm start       # node dist/server.cjs (sert le SPA + les API sur le port 3000)
```

## Persistance Supabase (stockage durable)

Sans clés Supabase, l'app fonctionne mais les leads/rapports restent en mémoire (perdus au redémarrage) et dans le localStorage du navigateur.

Pour une vraie persistance partagée :
1. Crée un projet : https://supabase.com/dashboard > New project
2. Settings > API : copie `Project URL`, `anon key`, `service_role key`
3. Exécute `supabase/schema.sql` dans le SQL Editor (tables `leads`, `agent_reports`, `whatsapp_outbox` + RLS)
4. Renseigne dans `.env` (⚠️ jamais commité) : `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`

La clé `service_role` est utilisée **côté serveur uniquement** (Express) : elle n'apparaît jamais dans le bundle client.

## Flux synchronisés (site → dashboard)
- `POST /api/leads` : chaque formulaire (devis interactif, essai ARKA 30j, contact) persiste le lead, l'assigne à un pôle et inscrit une notification WhatsApp en **file idempotente** (`whatsapp_outbox`, `unique(client_ref, to_number)`).
- `POST /api/ai/generate-report` : la synthèse générée par l'agent IA est persistée et notifiée au pôle concerné.
- `GET /api/leads` et `GET /api/reports` : le dashboard se synchronise (bouton refresh / ouverture dashboard).
- Le consommateur final des notifications WhatsApp (provider WhatsApp Business API) lira les lignes `status='pending'` de `whatsapp_outbox`. En attendant, le retour client contient un lien `wa.me` pré-rempli (fallback manuel immédiat).

## Scripts
- `npm run dev` : serveur de dev complet (Vite + API)
- `npm run build` : build production (front + `dist/server.cjs`)
- `npm start` : lance le build production
- `npm run lint` : vérification TypeScript (`tsc --noEmit`)

## Origine du projet
App exportée depuis AI Studio : https://ai.studio/apps/f43b481b-65b4-4f7b-970d-78350412d739