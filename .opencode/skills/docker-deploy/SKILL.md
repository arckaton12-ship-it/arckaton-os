---
name: docker-deploy
description: Use when deploying, containerizing, or orchestrating services with Docker Compose on the single server - covers port allocation 3000-3008, named volumes for persistent data, healthchecks, and the 8 Go RAM ceiling.
---

# Déploiement Docker

Déploiement sur un serveur unique. Compose orchestre tous les services.

## Contrainte de RAM : 8 Go max

C'est la contrainte qui décide de tout. Avant de proposer une image, additionner
la mémoire de tous les conteneurs.

| Service | Budget RAM |
| --- | --- |
| PostgreSQL + pgvector | 2 Go |
| API Fastify | 1 Go |
| Front Next.js | 1 Go |
| Worker / RAG | 1 Go |
| Redis (si utilisé) | 512 Mo |
| OS + marge | 1,5 Go |

**Refuser** tout service qui dépasse ce budget, et toute image qui embarque un
modèle, un moteur de recherche lourd ou un bundler en plus de celui utilisé au
build. Un LLM local est hors budget : le CPU sature et le service devient
inutilisable.

Poser `mem_limit` sur chaque service pour que l'excès échoue visiblement au
lieu de faire suffered le serveur entier.

## Ports 3000 à 3008

Un port par service, attributed une fois et documenté.

| Port | Service |
| --- | --- |
| 3000 | Front Next.js |
| 3001 | API Fastify |
| 3002 | Worker RAG |
| 3003-3008 | Réserve (staging, admin, outils) |

- Ne jamais réutiliser un port déjà pris par un service en cours d'exécution.
- Vérifier avant de démarrer : `ss -ltnp` ou `docker compose ps`.
- Seul le front est exposé publiquement. L'API reste sur le réseau interne
  Compose et n'est pas publiée.

## Volumes

Les données doivent survivre à un `docker compose down`.

- Un volume nommé par service qui conserve un état : `pgdata`, `uploads`,
  `cache`.
- Jamais de chemin hôte en dur pour un volume de données : un chemin absent
  est créé par Docker avec des droits root, ce qui casse le démarrage du
  conteneur.
- Sauvegarder `pgdata` avec `pg_dump` avant toute migration, pas seulement
  copier le volume.

## Healthchecks

Chaque service exposé doit avoir un healthcheck, sinon un redémarrage
déploie une version qui ne répond pas.

```yaml
healthcheck:
  test: ["CMD", "curl", "-fsS", "http://localhost:3001/health"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 40s
```

- `start_period` couvre le temps de démarrage : une API qui migre au boot est
  marquée unhealthy avant d'être prête.
- Dépendances via `depends_on: condition: service_healthy`, pas un simple
  `service_started`.
- Le endpoint `/health` vérifie ce qui compte vraiment : pour l'API, que la
  connexion à PostgreSQL répond.

## Séquence de déploiement

1. `pg_dump` du volume, horodaté.
2. `docker compose build` sur l'image à jour seulement.
3. `docker compose up -d` sur le service concerné, pas tout le stack.
4. Attendre `service_healthy` avant de déclarer la réussite.
5. Vérifier le endpoint `/health` depuis l'extérieur du réseau Compose.
6. En cas d'échec, revenir au dump précédent et rejouer l'étape 3.

## Secrets

Venir par `env_file` ou secrets Docker Swarm, jamais dans le `docker-compose.yml`
ni dans l'image. Un secret écrit dans un fichier versionné est un secret
compromis, même sur un dépôt privé.
