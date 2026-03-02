# SaaS Conversational CRM - Perfex

## Vue d'ensemble

Plateforme SaaS B2B multi-tenant. Interface chat web (texte + voix temps reel) pour piloter Perfex CRM via IA locale (Ollama/Llama 3).

**Repo GitHub**: https://github.com/LesComm/crm_saas (prive)

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Node.js + Express (ES Modules) |
| Base de donnees | PostgreSQL 16 |
| Frontend | React (Vite) + Tailwind CSS |
| Temps reel | Socket.io |
| IA (LLM) | Ollama / Llama 3 8B Instruct |
| TTS | ElevenLabs API (streaming) |
| STT | Web Speech API (navigateur) + Whisper (fallback) |
| Auth | JWT (access 15min + refresh 7j) |
| Encryption | AES-256-GCM (cles API CRM) |
| Dev local | Docker Compose (PostgreSQL + Backend + Ollama) |

## Architecture

```
Client React (Vite)     Backend Express + Socket.io
     |                           |
     v                           v
  Chat UI (texte/voix)    Services (auth, chat, crm, ai)
     |                           |
     +--- Socket.io -------------+
                                 |
                    +------------+------------+
                    |            |            |
                 PostgreSQL   Ollama     Perfex CRM
                 (multi-tenant) (local)  (API REST du client)
```

**Philosophie**: "Configuration Over Code Modification"
- Le backend a des fonctions generiques pour l'API Perfex
- L'IA genere un JSON de configuration par tenant (pas de code specifique)
- Ce JSON mappe les intentions utilisateur aux fonctions API

## Structure du projet

```
PROJET SAAS/
├── docker-compose.yml         # Dev local: PostgreSQL + Backend + Ollama
├── .env.example
├── package.json               # npm workspaces
├── CLAUDE.md                  # Ce fichier
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── index.js           # Express + Socket.io bootstrap
│   │   ├── config/            # env, database pool, encryption
│   │   ├── middleware/        # auth JWT, tenantContext, errorHandler, validation
│   │   ├── routes/            # auth, tenant, user, crm, chat, admin
│   │   ├── controllers/      # Gestion HTTP
│   │   ├── services/         # Logique metier (auth, chat, crm, ai/, voice/)
│   │   ├── repositories/     # SQL parametrise (1 par table)
│   │   ├── socket/           # chatHandler, voiceHandler
│   │   ├── perfex/           # Client HTTP generique + catalogue outils
│   │   └── shared/           # constants, errors, validators
│   └── migrations/            # SQL numerotes + runner
├── client/
│   ├── package.json
│   └── src/                   # React + Tailwind + Socket.io
└── docs/
```

## Base de donnees (9 tables)

| Table | Description | PK | Isolation |
|-------|-------------|-----|-----------|
| tenants | Entreprises/organisations | UUID | - |
| users | Utilisateurs (lies au tenant) | UUID | tenant_id FK |
| crm_credentials | URL + cle API cryptee (AES-256-GCM) | UUID | tenant_id FK |
| tenant_ai_configs | JSON des outils IA par tenant | UUID | tenant_id FK |
| conversations | Sessions de chat | UUID | tenant_id FK |
| messages | Messages individuels | UUID | tenant_id FK |
| audit_log | Piste d'audit securite | BIGSERIAL | tenant_id FK |
| refresh_tokens | JWT refresh token rotation | UUID | user_id FK |
| usage_metrics | Metriques par tenant (facturation) | BIGSERIAL | tenant_id FK |

## Commandes

```bash
# Dev local
docker compose up -d                    # Demarrer PostgreSQL + Backend + Ollama
docker compose logs -f backend           # Logs backend (nodemon watch)
docker compose down                      # Arreter

# Migrations
docker compose exec backend node migrations/migrate.js

# Tests
docker compose exec backend npm test

# Git
git add . && git commit -m "description"
git push origin main
```

## Variables d'environnement

Voir `.env.example` pour la liste complete. Cles importantes:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - PostgreSQL
- `JWT_SECRET` - Secret JWT (changer en production!)
- `ENCRYPTION_MASTER_KEY` - Cle AES-256 pour crypter les API keys CRM
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL` - Connexion Ollama
- `ELEVENLABS_API_KEY` - TTS vocal

## Conventions de code

- **ES Modules**: `import/export` (type: "module" dans package.json)
- **async/await** partout
- **SQL parametrise** toujours: `pool.query(sql, [param1, param2])`
- **Isolation tenant**: `WHERE tenant_id = $1` sur CHAQUE requete
- **Format reponse**: `{ success: true, data }` ou `{ success: false, error }`
- **Architecture en couches**: Routes -> Controllers -> Services -> Repositories

## Etat d'avancement

### Phase 1: Fondations (EN COURS)
- [x] Structure de dossiers
- [x] CLAUDE.md
- [x] docker-compose.yml
- [x] .env.example, .gitignore, package.json (root + server + client)
- [x] Migrations SQL (9 tables + runner migrate.js)
- [x] Config backend (env.js, database.js, encryption.js)
- [x] Shared (constants.js, errors.js, validators.js)
- [x] Middleware (auth, tenantContext, errorHandler, validation, rateLimiter)
- [x] Bootstrap Express + Socket.io (index.js)
- [ ] Init git + push GitHub (gh auth en attente)

### Phase 2: API Auth + Tenant (A VENIR)
- [ ] Routes auth (register, login, refresh)
- [ ] Routes tenant CRUD
- [ ] Routes CRM credentials
- [ ] Tests

### Phase 3: Perfex Integration (A VENIR)
- [ ] perfexClient generique
- [ ] perfexModules (catalogue outils)
- [ ] configAgent (generation JSON)
- [ ] toolExecutor (execution outils)

### Phase 4: Chat IA (A VENIR)
- [ ] Ollama service
- [ ] promptBuilder
- [ ] Socket.io chat handler
- [ ] Persistence conversations

### Phase 5: Voice (A VENIR)
- [ ] STT (Web Speech API + Whisper)
- [ ] TTS (ElevenLabs streaming)
- [ ] Socket.io voice handler

### Phase 6: Frontend React (A VENIR)
- [ ] Auth pages
- [ ] Chat page
- [ ] Settings page
- [ ] Admin page

## Fichiers de contexte (experts)

- `backend_security_expert.md` - Zero Trust, isolation multi-tenant, encryption
- `frontend_ux_expert.md` - React Hooks, Tailwind, UX vocal
- `ai_architect_expert.md` - "Config Over Code", function calling, robustesse IA
- `devops_workflow_expert.md` - Local First, Docker, Git, CI/CD
