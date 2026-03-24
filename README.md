# Todo App

A full-stack todo application built as a pnpm monorepo. The backend exposes a REST API using Fastify with a SQLite database; the frontend is a React SPA served by Vite in development and nginx in production.

## Features

- List all todos with loading, empty, and error states
- Add a new todo via a form (input is preserved on failure)
- Toggle completion status via a checkbox
- Delete individual todos
- Optimistic-style per-item loading states (disable controls while a mutation is in-flight)
- Accessible: `aria-label` attributes on interactive controls and an `aria-live` error banner for mutation failures

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8 |
| Backend | Node.js, Fastify 5, TypeScript |
| Database | SQLite via Node.js built-in `node:sqlite` (Node.js ≥ 22) |
| Monorepo | pnpm workspaces v10 |
| Containerization | Docker, Docker Compose, nginx |
| Testing | Vitest 4 (backend & frontend) |

---

## Project Structure

```
todo-app/
├── package.json            # Root — workspace scripts (dev, build, test)
├── pnpm-workspace.yaml     # pnpm workspace declaration
├── tsconfig.base.json      # Shared TypeScript base config
├── docker-compose.yml      # Docker Compose orchestration
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example        # Required environment variables
│   └── src/
│       ├── server.ts       # Entry point — reads PORT, starts Fastify
│       ├── app.ts          # App factory — migrations, plugins, routes
│       ├── db/
│       │   ├── client.ts   # SQLite connection (reads DATABASE_PATH)
│       │   ├── schema.ts   # Todo type
│       │   └── migrations/ # SQL migration files
│       ├── routes/
│       │   └── todos.ts    # CRUD route handlers
│       └── plugins/
│           ├── cors.ts
│           └── helmet.ts
└── frontend/
    ├── Dockerfile
    ├── nginx.conf          # Proxies /api/* → backend, SPA fallback
    ├── package.json
    ├── .env.example        # Optional environment variables
    └── src/
        ├── App.tsx
        ├── types/todo.ts   # Shared Todo interface
        ├── hooks/useTodos.ts
        └── components/
            ├── AddTodoForm.tsx
            ├── TodoItem.tsx
            ├── EmptyState.tsx
            ├── LoadingState.tsx
            └── ErrorState.tsx
```

---

## Prerequisites

- **Node.js ≥ 22** (required for `node:sqlite` built-in)
- **pnpm ≥ 10** (`corepack enable` then `corepack prepare pnpm@latest --activate`)
- **Docker & Docker Compose** (for containerised deployment)

---

## Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
# Optionally:
cp frontend/.env.example frontend/.env
```

`backend/.env` defaults:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the Fastify server binds to |
| `DATABASE_PATH` | `./data/todos.db` | Path to the SQLite database file |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

`frontend/.env` defaults:

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Backend base URL (build-time reference) |

> In development the React app proxies `/api/*` calls to the backend; the Vite dev server handles this transparently.

### 3. Start both services

```bash
pnpm dev
```

This runs `backend` (nodemon + ts-node, port 3000) and `frontend` (Vite, port 5173) concurrently.

You can also start each service individually:

```bash
pnpm --filter backend dev
pnpm --filter frontend dev
```

---

## Docker

Build and start both services with a single command:

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend (nginx) | http://localhost |
| Backend (Fastify) | http://localhost:3000 |

nginx proxies all `/api/*` requests to the backend container. The SQLite database is persisted in a named Docker volume (`db-data`).

Environment variables used by the backend container (see `docker-compose.yml`):

| Variable | Value in Compose |
|---|---|
| `PORT` | `3000` |
| `DATABASE_PATH` | `/app/data/todos.db` |
| `CORS_ORIGIN` | `http://localhost` |

---

## API Reference

Base path: `/api`

### Health check

```
GET /api/health
```

Response `200`:
```json
{ "status": "ok" }
```

---

### List todos

```
GET /api/todos
```

Response `200`:
```json
[
  {
    "id": "uuid",
    "text": "Buy milk",
    "isComplete": false,
    "createdAt": "2026-03-23T10:00:00.000Z"
  }
]
```

---

### Create todo

```
POST /api/todos
Content-Type: application/json

{ "text": "Buy milk" }
```

Response `201`:
```json
{
  "id": "uuid",
  "text": "Buy milk",
  "isComplete": false,
  "createdAt": "2026-03-23T10:00:00.000Z"
}
```

Response `422` (validation failure):
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "text is required" } }
```

---

### Toggle completion

```
PATCH /api/todos/:id
Content-Type: application/json

{ "isComplete": true }
```

Response `200` — updated todo object.
Response `404` if the todo does not exist.

---

### Delete todo

```
DELETE /api/todos/:id
```

Response `204` (no body).
Response `404` if the todo does not exist.

---

## Testing

Run all tests from the repo root:

```bash
pnpm test
```

Or per package:

```bash
pnpm --filter backend test   # vitest run
pnpm --filter frontend test  # vitest run --passWithNoTests
```

Run backend tests with coverage:

```bash
pnpm --filter backend test --coverage
```

### Backend coverage (23 tests across 4 files)

| File | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| **All files** | **95.23%** | **88.88%** | **100%** | **95.16%** |
| src/app.ts | 100% | 75% | 100% | 100% |
| src/db/client.ts | 57.14% | 50% | 100% | 57.14% |
| src/routes/todos.ts | 100% | 100% | 100% | 100% |

> The uncovered lines in `client.ts` are the directory-creation guard (`mkdirSync`) that only runs when `DATABASE_PATH` is not `:memory:` — a path exercised only in production with a real file path.

---

## Build

```bash
pnpm build
```

- **Backend**: `tsc` compiles `src/` → `dist/`; migrations are copied to `dist/db/migrations/`.
- **Frontend**: `tsc -b && vite build` compiles and bundles to `dist/`.
