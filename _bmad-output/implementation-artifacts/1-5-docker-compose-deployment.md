# Story 1.5: Docker Compose Deployment

Status: done

## Story

As a developer,
I want the full application to run via a single `docker compose up --build` command,
So that the app can be deployed to any Docker-capable environment reproducibly.

## Acceptance Criteria

1. **Given** `backend/Dockerfile`, **when** built, **then** it uses a multi-stage build: install + compile stage (`node:lts`) and runtime stage (`node:lts-alpine`) executing `node dist/server.js`
2. **Given** `frontend/Dockerfile`, **when** built, **then** it uses a multi-stage build: Vite build stage (`node:lts`) and serve stage (`nginx:alpine`)
3. **Given** `frontend/nginx.conf`, **when** reviewed, **then** it serves static assets from `/usr/share/nginx/html` and proxies all `/api/*` requests to `http://backend:3000`
4. **Given** `docker-compose.yml`, **when** reviewed, **then** it defines: `frontend` service (port `80`), `backend` service (port `3000`), and a `db-data` named volume mounted at `/app/data` in the backend container only
5. **Given** `docker compose up --build`, **when** run, **then** the frontend is accessible at `http://localhost` and `GET http://localhost/api/health` returns `{ "status": "ok" }`
6. **Given** `docker compose down` (without `-v`) followed by `docker compose up`, **when** run, **then** the `db-data` volume persists and the database file is intact

## Tasks / Subtasks

- [x] Task 1: Create `backend/Dockerfile` (AC: 1)
  - [x] Stage 1 (`builder`): `node:lts`, copy monorepo root + backend package files, `pnpm install --filter backend`, copy source, run `pnpm --filter backend build`
  - [x] Stage 2 (`runtime`): `node:lts-alpine`, production deps only, copy `dist/` and migrations from builder, `CMD ["node", "backend/dist/server.js"]`

- [x] Task 2: Create `frontend/Dockerfile` (AC: 2)
  - [x] Stage 1 (`builder`): `node:lts`, copy monorepo root + frontend package files, `pnpm install --filter frontend`, copy source, run `pnpm --filter frontend build`
  - [x] Stage 2 (`runtime`): `nginx:alpine`, copy `dist/` to `/usr/share/nginx/html`, copy `nginx.conf`

- [x] Task 3: Create `frontend/nginx.conf` (AC: 3)
  - [x] `location /api/` — `proxy_pass http://backend:3000` with standard proxy headers
  - [x] `location /` — `try_files $uri $uri/ /index.html` for SPA client-side routing

- [x] Task 4: Create `docker-compose.yml` (AC: 4, 5, 6)
  - [x] `backend` service: port 3000, `DATABASE_PATH=/app/data/todos.db`, `db-data` volume at `/app/data`
  - [x] `frontend` service: port 80, `depends_on: backend`
  - [x] `db-data` named volume declared at top level

- [x] Task 5: Create `.dockerignore` at repo root
  - [x] Exclude `node_modules/`, `dist/`, `.env*`, editor files, test files, planning artifacts

## Dev Notes

### Architecture Requirements (ARCH7, ARCH8, ARCH9)

**ARCH7**: Docker Compose orchestrates frontend + backend. Backend mounts `db-data` volume at `/app/data`.
**ARCH8**: Frontend Nginx proxies `/api/*` to `http://backend:3000` — same behaviour as Vite dev proxy.
**ARCH9**: Multi-stage builds minimize runtime image size (only production deps in final layer).

### Key Design Decisions

- `pnpm-lock.yaml` and `pnpm-workspace.yaml` are copied into builder stages — required for `--frozen-lockfile`
- `tsconfig.base.json` is copied — backend and frontend `tsconfig.json` extend it
- Migrations folder (`backend/src/db/migrations`) is copied into the runtime image — required for auto-migrate on startup
- `CORS_ORIGIN=http://localhost` in docker-compose — production frontend origin (port 80, no explicit port)

### Files Created

```
/                         ← repo root
├── .dockerignore         ← NEW
├── docker-compose.yml    ← NEW
backend/
└── Dockerfile            ← NEW
frontend/
├── Dockerfile            ← NEW
└── nginx.conf            ← NEW
```
