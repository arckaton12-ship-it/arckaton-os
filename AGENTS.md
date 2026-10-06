# AGENTS.md

## Contexte

Agence de sciences appliquées au numérique opérant au **Cameroun**.

- **Entité opérationnelle** : Cameroun (`CM`, indicatif `+237`). Siège à
  **Douala** (Bonanjo, face Chambre de Commerce), bureau à **Yaoundé** (Bastos).
  Arckaton est la filiale technologique de **SLOMAH SARL**, dont le RC et le
  NIU publiés sont ceux de la société mère.

**L'ouverture au Tchad est un projet à part, pas un fait acquis.** Le contenu
public, les coordonnées, les clients et les données de la base sont
strictement camerounais. Ne pas introduire de `+235`, de « Tchad » ou de RC
tchadien tant que la décision n'est pas prise et documentée : ce serait
inventer une identité légale, des coordonnées et des clients qui n'existent pas
dans la base.

> Historique : une version de ce fichier décrivait un siège au Tchad avec
> `+235` et un RC tchadien. Cela ne correspondait à aucune donnée réelle — le
> contenu, les tests et la base sont camerounais depuis le début. Le Tchad est
> donc retiré du périmètre pour l'instant, pas « en attente de validation ».

**L'adaptation se fait par client, pas par agence.** Le format de téléphone et
l'opérateur Mobile Money dépendent du `country_id` du **client** : MTN MoMo et
Orange Money au Cameroun. Devise : XAF, donc aucune conversion n'est requise.

- **Stack** : React 19 + Vite, Express, PostgreSQL, Node.js
- **Contrainte matérielle** : 8 Go de RAM maximum sur le serveur

Toute proposition qui dépasse cette RAM est à rejeter ou à rediscuter avant
écriture de code.

> Historique : ce fichier décrivait une stack Next.js / Fastify / Docker, alors
> qu'aucun `next.config.js`, `Dockerfile` ni dépendance Fastify n'existe dans le
> dépôt. C'est corrigé : décrire la stack réelle est une condition pour qu'un
> prochain agent ne parte pas sur une stack fantôme.

## Règles

- TypeScript strict, activé dans `tsconfig.json` (`"strict": true`).
- **Pas de `any`.** Un type incertain se résout avec `unknown` et une
  validation à la frontière, pas avec un `any` ni un cast silencieux.
- Répondre en français.
- Chaque endpoint a un test. Un endpoint livré sans test est un endpoint
  incomplet.

## Architecture

- **Front** : React 19 + Vite (application unique : site public et OS `/os`)
- **API** : Express (`server.ts`), construit en `build/server.cjs` pour le
  déploiement
- **Base de données** : PostgreSQL, migrations SQL dans `migrations/`
- **Auth** : JWT et rôles (`requireAuth`, `requirePerm`), mots de passe bcrypt
  en base
- **IA** : cascade Gemini (`GEMINI_API_KEY`) puis Groq (`GROQ_API_KEY`) en
  secours. Sans clé, repli sur la base de connaissances locale et
  `aiEnabled: false` — jamais d'invention de chiffre.
- **Temps** : fuseau `Africa/Douala` (UTC+1). Toute heure affichée à un
  visiteur porte son fuseau explicite.

## Interdits

- **Pas de SaaS.** Pas de dépendance à un service tiers propriétaire pour une
  fonctionnalité cœur de métier.
  - **Exception autorisée : les passerelles de paiement.** Africa's Talking est
    le seul SaaS admis, parce qu'il n'existe pas d'alternative locale pour le
    Mobile Money au Cameroun. Tout le reste de la chaîne de
    paiement — stock, états, idempotence, rapprochement facture — reste
    interne.
- **Pas de données hardcodées.** Tout doit être dynamique, servi depuis la
  base ou une API. Un tableau de données figé dans le code est un défaut, pas
  un raccourci.
- **Pas de LLM local.** 8 Go de RAM sont insuffisants : le CPU sature et le
  service devient inutilisable. Les appels LLM passent par une API externe :
  Gemini en premier, Groq en secours.

## Paiements

Africa's Talking : **MTN MoMo et Orange Money** (opérateurs présents au
Cameroun ; Airtel Money n'y existe pas). Voir la skill
`africastalking-integration` pour le workflow d'intégration.

## IA

- Cascade d'appels : **Gemini** (`GEMINI_API_KEY`, modèle `gemini-2.0-flash`)
  puis **Groq** (`GROQ_API_KEY`, modèle `llama-3-3-70b-versatile`) en secours.
- Sans clé : repli sur la base de connaissances locale et `aiEnabled: false`.
  **Jamais d'invention de chiffre, de prix ou de nom.**
- `pgvector` est activé si l'extension est disponible ; **aucun usage RAG à ce
  jour** — ne pas le présenter comme une fonctionnalité livrée.
- **Pas de Dify, pas de Ollama, pas de LLM local.**
