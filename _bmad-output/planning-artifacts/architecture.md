---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['prd.md']
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-03-10'
project_name: 'todo-app'
user_name: 'Claudio'
date: '2026-03-10'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

26 FRs across 5 capability areas:

- **Todo Management (FR1–FR6):** Full CRUD — create, view, toggle completion, delete, persist across sessions.
- **Todo Data Model (FR7–FR10):** `id`, `text`, `status` (complete/incomplete), `createdAt`. Simple, flat structure.
- **UI States & Feedback (FR11–FR16):** Empty, loading, and error states required. Immediate visual feedback on every CRUD operation; retry without data loss; visual distinction for completed items.
- **Responsive Experience (FR17–FR20):** Desktop (≥1024px), tablet (768–1023px), mobile (<768px). All core actions keyboard-operable.
- **API & Data Persistence (FR21–FR26):** 4 REST/JSON endpoints (create, list, update status, delete). Consistent error responses. Data model must not block future auth/multi-user support (FR26).

**Non-Functional Requirements:**

- **Performance:** API CRUD ≤200ms; initial page load ≤2s; UI interactions feel instant with no perceptible lag.
- **Security:** HTTPS end-to-end; server-side input validation and sanitisation; internal errors never exposed to client.
- **Accessibility:** WCAG 2.1 AA for all interactive elements; keyboard-accessible core actions; correct ARIA labelling and contrast ratios.
- **Reliability:** No data loss under normal operation; failed writes must not produce partial/corrupted state; graceful degradation when backend is unavailable.

**Scale & Complexity:**

- Primary domain: Full-stack web (SPA + REST API + persistence)
- Complexity level: Low — single-user, no auth, no real-time, no integrations, one flat data model
- Estimated architectural components: 3 (Frontend SPA, Backend API, Database)
- API surface: 4 endpoints

### Technical Constraints & Dependencies

- Frontend must be deployable as static assets (CDN / static host)
- Client-side rendered SPA — no SSR, no SSE, no WebSockets required
- No native device features (camera, GPS, push notifications)
- No external service integrations in v1
- Modern evergreen browsers only (Chrome, Firefox, Safari, Edge — latest)
- No legacy browser support (IE11 excluded)

### Cross-Cutting Concerns Identified

- **Error handling:** Spans client UI states (FR13, FR15), server response contracts (FR25), and the reliability NFR. Both layers must handle failures consistently.
- **Input validation & sanitisation:** Server-side mandatory (Security NFR); client-side for UX (FR15 — preserve input on failure).
- **HTTPS:** Transport-layer concern — handled at deployment/infrastructure level.
- **Accessibility:** Affects component architecture, focus management, ARIA labelling, and colour contrast decisions across the entire frontend.
- **Data model extensibility (FR26):** The persistence schema must accommodate a future `user_id` foreign key without requiring a migration that breaks existing records.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack TypeScript monorepo — React SPA frontend + Fastify REST API backend + SQLite persistence.

### Starter Options Considered

No single CLI generator covers this exact stack. Evaluated:

- **create-t3-app:** TypeScript-first but bundles tRPC + Next.js — no Fastify/SQLite option, heavier than needed.
- **Nx / Turborepo:** Enterprise monorepo tooling — excessive overhead for a 2-package solo project.
- **fastify-cli (`fastify generate`):** Valid Fastify scaffolder but generates more boilerplate structure than this project requires.
- **pnpm workspaces (manual):** Lightweight monorepo without build orchestration overhead. Full control, minimal abstraction.

### Selected Approach: pnpm Workspaces (Manual Monorepo)

**Rationale for Selection:**
No single starter covers TypeScript + Vite SPA + Fastify + SQLite + monorepo. Manual setup with pnpm workspaces is the correct choice: it avoids unnecessary tooling overhead for a 2-package project, gives full control over each layer, and keeps the stack exactly at the complexity level the PRD calls for.

**Initialization Commands:**

```bash
# Root monorepo
mkdir todo-app && cd todo-app
pnpm init
echo "packages:\n  - 'frontend'\n  - 'backend'" > pnpm-workspace.yaml

# Frontend — React + TypeScript via Vite
pnpm create vite@latest frontend -- --template react-ts

# Backend — Fastify + TypeScript
mkdir backend && cd backend && pnpm init
pnpm add fastify @fastify/cors
pnpm add -D typescript ts-node @types/node nodemon

# Database — Drizzle ORM + SQLite
cd ..
pnpm add --filter backend drizzle-orm better-sqlite3
pnpm add -D --filter backend drizzle-kit @types/better-sqlite3

# Optional: run both dev servers from root
pnpm add -D -w concurrently
```

**Architectural Decisions Provided by This Approach:**

**Language & Runtime:**
- TypeScript throughout — strict mode, shared `tsconfig.base.json` at root
- Node.js runtime for the backend; browser target for the frontend

**Styling Solution:**
- Plain CSS / CSS Modules — no styling framework mandated
- CSS custom properties for theming (supports WCAG AA contrast requirements without a library dependency)

**Build Tooling:**
- Frontend: Vite — fast HMR in development, optimised static asset output for production deployment
- Backend: `ts-node` + `nodemon` for development; `tsc` for production build

**ORM / Data Access:**
- Drizzle ORM — TypeScript-first, schema-as-code, zero magic, excellent SQLite support via `better-sqlite3`
- Schema defined in TypeScript — future `user_id` column addition (FR26) is a single `ALTER TABLE` migration

**Testing Framework:**
- Vitest — shares Vite configuration, TypeScript-native, covers frontend and backend unit tests uniformly
- Testing infrastructure decisions deferred to story-level implementation

**Code Organisation:**

```
todo-app/
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── package.json          # root scripts (dev, build, test)
├── frontend/             # Vite React SPA
│   ├── src/
│   └── vite.config.ts
└── backend/              # Fastify API server
    ├── src/
    │   ├── routes/
    │   ├── db/           # Drizzle schema + client
    │   └── server.ts
    └── tsconfig.json
```

**Development Experience:**
- `concurrently` at root to run both dev servers with a single `pnpm dev` command
- Separate `pnpm dev`, `pnpm build`, `pnpm test` scripts per package and at root level

**Note:** Project initialisation using these commands should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data validation strategy (defines API contract and security posture)
- Frontend state management (defines component architecture)
- Deployment approach (defines environment configuration)

**Important Decisions (Shape Architecture):**
- Error response format (enforces FR25 across all endpoints)
- Security middleware (enforces Security NFR)
- Component organisation pattern (defines frontend structure)

**Deferred Decisions (Post-MVP):**
- Authentication strategy (Phase 3 — data model keeps door open per FR26)
- Rate limiting (relevant when auth/multi-user added)
- API documentation tooling (relevant when API becomes public-facing)
- Global state management (not warranted at MVP scope)

### Data Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Database | SQLite via `better-sqlite3` | Zero infrastructure, single file, sufficient for single-user MVP; FR26 extensibility via future `user_id` column |
| ORM | Drizzle ORM | TypeScript-first, schema-as-code, excellent SQLite support, minimal abstraction |
| Migrations | Drizzle Kit (`drizzle-kit generate` + `drizzle-kit migrate`) | Natural Drizzle companion; schema diffs tracked in version control |
| Input Validation | Fastify JSON Schema (`@fastify/ajv`) | Built-in to Fastify, no extra dependency; JSON Schema objects defined on route options |
| SQLite persistence in Docker | Named Docker volume (`db-data`) mounted at `/app/data/todos.db` | Survives container restarts; survives `docker compose down` (not `down -v`) |

### Authentication & Security

| Decision | Choice | Rationale |
|---|---|---|
| Authentication | None (v1) | Out of scope per PRD; data model does not block future addition (FR26) |
| HTTP security headers | `@fastify/helmet` | Adds XSS protection, HSTS, `X-Frame-Options`, etc. with zero configuration burden |
| CORS | `@fastify/cors` | Configured for `http://localhost:5173` in dev; production origin via environment variable |
| Error responses | Structured JSON — see format below | Enforces FR25: consistent, safe, non-leaking error responses |
| Internal error exposure | Never — all 5xx responses return generic safe message | Security NFR: internal details logged server-side only |

**Error Response Format (all endpoints):**
```json
{
  "error": {
    "code": "TODO_NOT_FOUND",
    "message": "The requested todo does not exist"
  }
}
```

HTTP status conventions:
- `400` — malformed request body
- `404` — resource not found
- `422` — validation failure (schema violation)
- `500` — internal server error (generic message only)

### API & Communication Patterns

| Decision | Choice | Rationale |
|---|---|---|
| API style | REST/JSON | Confirmed by PRD; simple, well-understood, no client library required |
| API documentation | None (documented in architecture.md) | MVP scope; solo developer; no public API consumers |
| Rate limiting | None (v1) | No auth surface to protect at single-user scale |
| HTTP client (frontend) | Native `fetch` API | No additional library needed; sufficient for 4 endpoints |

**API Endpoints:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/todos` | Retrieve all todos |
| `POST` | `/api/todos` | Create a new todo |
| `PATCH` | `/api/todos/:id` | Update a todo's completion status |
| `DELETE` | `/api/todos/:id` | Delete a todo |

All endpoints prefixed `/api` to allow Nginx to distinguish API traffic from static assets.

### Frontend Architecture

| Decision | Choice | Rationale |
|---|---|---|
| State management | Raw `useState` + `fetch` | PRD explicitly states local UI state is sufficient; avoids library overhead |
| Data fetching | Native `fetch` API | No third-party client needed for 4 endpoints |
| Router | None | Single-view SPA; no URL-based navigation in MVP |
| UI state encapsulation | Custom `useTodos` hook | Centralises loading/error/retry logic (FR12, FR13, FR15); keeps components clean |
| Component organisation | Feature-flat under `src/` | Appropriate for project scale |

**Frontend Component Structure:**
```
frontend/src/
├── components/
│   ├── TodoList.tsx
│   ├── TodoItem.tsx
│   ├── AddTodoForm.tsx
│   ├── EmptyState.tsx
│   ├── LoadingState.tsx
│   └── ErrorState.tsx
├── hooks/
│   └── useTodos.ts       # encapsulates fetch, loading, error, retry state
├── api/
│   └── todos.ts          # raw fetch functions (create, list, update, delete)
├── types/
│   └── todo.ts           # Todo type (mirrors backend schema)
└── main.tsx
```

**`useTodos` Hook Responsibilities (covers FR12, FR13, FR15):**
- Manages `loading`, `error`, and `data` state for all operations
- Preserves user input on failed writes (FR15) — input state held in component, not cleared on error
- Exposes retry mechanism by re-invoking the same operation

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|---|---|---|
| Deployment approach | Docker Compose | Self-contained, reproducible, no cloud dependency; single `docker compose up` to run |
| Frontend container | Nginx (multi-stage build) | Vite build output served as static assets; Nginx proxies `/api/*` to backend |
| Backend container | Node.js (LTS) | Runs compiled Fastify server |
| Database persistence | Named Docker volume (`db-data`) | SQLite file survives container restarts |
| Environment configuration | `.env` files per service + Docker Compose `env_file` | Dev/prod parity via environment variables |

**Docker Compose Architecture:**
```
docker-compose.yml
├── frontend service   → Nginx on :80 (serves static assets + proxies /api/* to backend:3000)
├── backend service    → Node on :3000 (Fastify API)
└── db-data volume     → SQLite file at /app/data/todos.db
```

**`docker-compose.yml` outline (to be implemented in story):**
```yaml
services:
  frontend:
    build: ./frontend
    ports: ["80:80"]
    depends_on: [backend]
  backend:
    build: ./backend
    ports: ["3000:3000"]
    volumes:
      - db-data:/app/data
    environment:
      - DATABASE_PATH=/app/data/todos.db
      - CORS_ORIGIN=http://localhost
volumes:
  db-data:
```

### Decision Impact Analysis

**Implementation Sequence:**
1. Monorepo initialisation (pnpm workspaces, root tsconfig)
2. Backend: Fastify server + Drizzle schema + SQLite connection
3. Backend: 4 API routes with JSON Schema validation
4. Backend: Dockerisation + volume mount
5. Frontend: Vite scaffold + component structure
6. Frontend: `useTodos` hook + raw fetch API layer
7. Frontend: Component implementation (CRUD, states, accessibility)
8. Frontend: Nginx Dockerfile + Compose integration
9. End-to-end integration testing

**Cross-Component Dependencies:**
- The `Todo` type in `frontend/src/types/todo.ts` must mirror the Drizzle schema shape exactly — coordinate during schema definition story
- Nginx `/api/*` proxy configuration must match the Fastify port and route prefix — configure together in the Docker story
- JSON Schema validation on the backend defines the contract the frontend `fetch` calls must satisfy

## Implementation Patterns & Consistency Rules

**Critical conflict points identified:** 7 areas where AI agents could make incompatible choices without explicit rules.

### Naming Patterns

**Database Naming Conventions (Drizzle schema → SQLite):**

| Entity | Convention | Example |
|---|---|---|
| Table names | `snake_case`, plural | `todos` |
| Column names | `snake_case` | `id`, `created_at`, `is_complete` |
| Future foreign keys | `{resource}_id` | `user_id` |
| Index names | `idx_{table}_{column}` | `idx_todos_created_at` |

> Drizzle maps `snake_case` DB columns to `camelCase` TypeScript fields automatically via column aliases.

**API Naming Conventions:**

| Entity | Convention | Example |
|---|---|---|
| Resource paths | Plural nouns | `/api/todos` |
| Path parameters | `:id` | `/api/todos/:id` |
| JSON body fields | `camelCase` | `{ "isComplete": true, "createdAt": "..." }` |
| Query parameters | `camelCase` | `?sortBy=createdAt` |

**Code Naming Conventions:**

| Entity | Convention | Example |
|---|---|---|
| React components | `PascalCase` | `TodoItem`, `AddTodoForm` |
| Component files | `PascalCase.tsx` | `TodoItem.tsx` |
| Hook files | `camelCase.ts` | `useTodos.ts` |
| Utility / API files | `camelCase.ts` | `todos.ts` |
| TypeScript types/interfaces | `PascalCase` | `Todo`, `CreateTodoBody` |
| Functions & variables | `camelCase` | `createTodo`, `isLoading` |
| Constants | `UPPER_SNAKE_CASE` | `API_BASE_URL` |
| CSS Module files | `PascalCase.module.css` | `TodoItem.module.css` |

### Structure Patterns

**Test File Location:**
Tests are **co-located** alongside source files:
```
src/
├── components/
│   ├── TodoItem.tsx
│   └── TodoItem.test.tsx     ← co-located
├── hooks/
│   ├── useTodos.ts
│   └── useTodos.test.ts      ← co-located
```
No separate `__tests__/` directory. Test files use `.test.ts` / `.test.tsx` suffix.

**Backend Route Organisation:**
One file per resource under `src/routes/`. Route files export a Fastify plugin:
```
backend/src/
├── routes/
│   └── todos.ts              # all 4 todo endpoints as one Fastify plugin
├── db/
│   ├── schema.ts             # Drizzle table definitions
│   └── client.ts             # Drizzle client singleton
├── plugins/
│   ├── cors.ts
│   └── helmet.ts
└── server.ts                 # registers plugins + routes, exports app
```

**Environment Configuration:**
```
backend/.env          # DATABASE_PATH, PORT, CORS_ORIGIN
backend/.env.example  # committed to repo (no secrets)
frontend/.env         # VITE_API_URL
frontend/.env.example # committed to repo
```
Vite env vars must be prefixed `VITE_` to be accessible in browser code.

### Format Patterns

**API Response Formats:**

Success responses return the resource directly (no wrapper envelope):
```json
// GET /api/todos
[{ "id": "abc123", "text": "Buy milk", "isComplete": false, "createdAt": "2026-03-10T09:00:00.000Z" }]

// POST /api/todos → 201
{ "id": "abc123", "text": "Buy milk", "isComplete": false, "createdAt": "2026-03-10T09:00:00.000Z" }

// PATCH /api/todos/:id → 200
{ "id": "abc123", "text": "Buy milk", "isComplete": true, "createdAt": "2026-03-10T09:00:00.000Z" }

// DELETE /api/todos/:id → 204 (no body)
```

Error responses always use the standard structure (see Core Architectural Decisions):
```json
{ "error": { "code": "TODO_NOT_FOUND", "message": "The requested todo does not exist" } }
```

**Data Format Rules:**

| Field | Format | Example |
|---|---|---|
| IDs | UUID v4 string | `"a1b2c3d4-..."` |
| Dates | ISO 8601 UTC string | `"2026-03-10T09:00:00.000Z"` |
| Completion status | Boolean `isComplete` | `false` / `true` |
| Text fields | Plain string, trimmed | `"Buy milk"` |
| Empty collections | Empty array `[]` | not `null` |

> **`isComplete` is a boolean** in both the API JSON and TypeScript frontend type. The Drizzle schema stores it as SQLite integer (0/1) but maps to `boolean` in TypeScript.

**HTTP Status Codes (enforced):**

| Situation | Code |
|---|---|
| Successful read | `200` |
| Successful create | `201` |
| Successful delete | `204` |
| Bad request body | `400` |
| Resource not found | `404` |
| Validation failure | `422` |
| Server error | `500` |

### Process Patterns

**Error Handling:**

- **Backend:** All route handlers wrapped in try/catch. Caught errors mapped to `{ error: { code, message } }` shape before sending. Raw error objects never sent to client. Fastify's `setErrorHandler` used as global fallback for uncaught exceptions → always returns `500` with generic message.
- **Frontend:** Errors caught at the `useTodos` hook level. Components receive an `error: string | null` prop — never raw `Error` objects. User-facing messages are human-readable strings, not technical codes.

**Loading State Pattern (in `useTodos`):**

Each operation has its own loading flag — not a single global `isLoading`:
```typescript
interface TodosState {
  todos: Todo[];
  isLoading: boolean;         // initial list fetch
  isCreating: boolean;        // POST in flight
  isUpdating: string | null;  // id of todo being patched, or null
  isDeleting: string | null;  // id of todo being deleted, or null
  error: string | null;       // last operation error message
}
```

**Input Preservation on Error (FR15):**
Input state (`inputText`) lives in the `AddTodoForm` component — **not** in `useTodos`. On a failed create, `useTodos` sets `error` but does not clear the input. The form only clears on success.

**Async Pattern:**
All API calls use `async/await` — no `.then()/.catch()` chains. Errors are caught with `try/catch`.

**Validation Timing:**
- **Backend:** JSON Schema validation runs before route handler (Fastify built-in). Route handlers assume valid input.
- **Frontend:** Basic client-side validation (non-empty text) before calling the API — prevents unnecessary round-trips. Server validation is authoritative.

### Enforcement Guidelines

**All AI agents MUST:**
- Use `camelCase` for all TypeScript identifiers and JSON fields
- Use `snake_case` only inside Drizzle schema column definitions
- Return the `Todo` shape as defined in `frontend/src/types/todo.ts` from all API endpoints
- Use the standard error format `{ error: { code, message } }` for all error responses
- Co-locate tests alongside source files — never create a separate `__tests__/` directory
- Use `isComplete: boolean` (not `status: string`, not `completed: boolean`) for completion state
- Prefix all API routes with `/api/`
- Never expose stack traces or internal error messages in API responses

**Anti-Patterns to Avoid:**

| Anti-pattern | Correct pattern |
|---|---|
| `status: "complete"` or `status: "incomplete"` | `isComplete: true/false` |
| Returning `null` for empty todo list | Return `[]` |
| `created_at` in JSON response | `createdAt` in JSON response |
| `POST /api/todo` (singular) | `POST /api/todos` (plural) |
| `{ data: [...], error: null }` response envelope | Direct `[...]` array |
| Global `isLoading` for all operations | Per-operation loading flags |
| Clearing input on API error | Clear input only on success |

## Project Structure & Boundaries

### Complete Project Directory Structure

```
todo-app/
├── pnpm-workspace.yaml
├── package.json                    # root scripts: dev, build, test, lint
├── tsconfig.base.json              # shared TS compiler base config
├── .gitignore
├── .github/
│   └── copilot-instructions.md
├── docker-compose.yml
├── docker-compose.override.yml     # dev overrides (hot reload, port exposure)
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json               # extends tsconfig.base.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── .env.example                # VITE_API_URL=http://localhost:3000
│   ├── .env                        # local only, gitignored
│   ├── Dockerfile                  # multi-stage: build (node) + serve (nginx)
│   ├── nginx.conf                  # serves static assets, proxies /api/* to backend
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── App.module.css
│       ├── types/
│       │   └── todo.ts             # Todo interface — source of truth for frontend type
│       ├── api/
│       │   └── todos.ts            # raw fetch functions: getTodos, createTodo, updateTodo, deleteTodo
│       ├── hooks/
│       │   ├── useTodos.ts         # manages todos[], isLoading, isCreating, isUpdating, isDeleting, error
│       │   └── useTodos.test.ts
│       └── components/
│           ├── AddTodoForm.tsx     # input field + submit; owns inputText state
│           ├── AddTodoForm.module.css
│           ├── AddTodoForm.test.tsx
│           ├── TodoList.tsx        # renders TodoItem list or EmptyState
│           ├── TodoList.module.css
│           ├── TodoList.test.tsx
│           ├── TodoItem.tsx        # single todo row: text, toggle checkbox, delete button
│           ├── TodoItem.module.css
│           ├── TodoItem.test.tsx
│           ├── EmptyState.tsx      # shown when todos[] is empty
│           ├── EmptyState.module.css
│           ├── LoadingState.tsx    # shown during initial fetch
│           ├── LoadingState.module.css
│           ├── ErrorState.tsx      # shown on fetch failure; includes retry button
│           └── ErrorState.module.css
│
└── backend/
    ├── package.json
    ├── tsconfig.json               # extends tsconfig.base.json
    ├── drizzle.config.ts           # Drizzle Kit configuration
    ├── .env.example                # PORT=3000, DATABASE_PATH=./data/todos.db, CORS_ORIGIN=http://localhost:5173
    ├── .env                        # local only, gitignored
    ├── Dockerfile                  # multi-stage: build (node) + run (node:lts-alpine)
    └── src/
        ├── server.ts               # app entry point: registers plugins + routes, starts server
        ├── app.ts                  # Fastify instance factory (exported for testing)
        ├── plugins/
        │   ├── cors.ts             # @fastify/cors — reads CORS_ORIGIN from env
        │   └── helmet.ts           # @fastify/helmet — sensible security header defaults
        ├── routes/
        │   ├── todos.ts            # Fastify plugin: all 4 todo endpoints
        │   └── todos.test.ts       # integration tests: spins up app, calls routes, checks responses
        ├── db/
        │   ├── schema.ts           # Drizzle table definition: todos (id, text, is_complete, created_at)
        │   ├── client.ts           # Drizzle client singleton — reads DATABASE_PATH from env
        │   └── migrations/         # generated by drizzle-kit — committed to version control
        └── types/
            └── todo.ts             # CreateTodoBody, UpdateTodoBody — JSON Schema + TS type
```

### Architectural Boundaries

**API Boundary — Frontend ↔ Backend:**
- All requests cross the `/api/*` boundary as HTTP/JSON
- In Docker: Nginx proxies `/api/*` → `backend:3000`
- In local dev: Frontend calls `VITE_API_URL` directly (e.g. `http://localhost:3000`)
- The `Todo` type in `frontend/src/types/todo.ts` is independently defined (not imported from backend) — must stay in sync with Drizzle schema shape

**Component Boundary — `useTodos` hook:**
- `useTodos` is the single integration point between components and the API layer
- Components never call `fetch` directly — they consume `useTodos` state and callbacks
- `api/todos.ts` functions are called only by `useTodos`

**Data Boundary — Drizzle schema → API response:**
- `backend/src/db/schema.ts` is the authoritative data model
- Route handlers in `routes/todos.ts` map Drizzle rows to API response shape (snake_case → camelCase, integer → boolean for `isComplete`)
- No raw Drizzle row objects are ever sent in API responses

**Container Boundary — Docker Compose:**
- `frontend` container: Nginx only — no Node process, no direct DB access
- `backend` container: Node + Fastify — sole owner of the SQLite file
- SQLite file lives exclusively in the `db-data` named volume, mounted at `/app/data/todos.db` inside the `backend` container only

### Requirements to Structure Mapping

**FR1–FR6 (Todo Management → CRUD):**
- Backend: `backend/src/routes/todos.ts` (all 4 endpoints)
- Frontend hook: `frontend/src/hooks/useTodos.ts` (createTodo, deleteTodo, toggleTodo, fetchTodos)
- Frontend API: `frontend/src/api/todos.ts`

**FR7–FR10 (Todo Data Model):**
- DB schema: `backend/src/db/schema.ts`
- Backend types: `backend/src/types/todo.ts`
- Frontend type: `frontend/src/types/todo.ts`

**FR11–FR16 (UI States & Feedback):**
- `EmptyState.tsx` → FR11
- `LoadingState.tsx` → FR12
- `ErrorState.tsx` → FR13 (includes retry button → FR15)
- `TodoItem.tsx` visual distinction → FR16
- Per-operation loading flags in `useTodos` → FR14

**FR17–FR20 (Responsive Experience):**
- CSS Modules on all components + responsive rules in each `.module.css`
- `App.module.css` for layout-level breakpoints (≥1024px / 768–1023px / <768px)
- Keyboard operability via native `<button>` and `<input>` elements → FR20

**FR21–FR26 (API & Data Persistence):**
- `backend/src/routes/todos.ts` → FR21–FR25
- `backend/src/db/schema.ts` — no `userId` column but table designed to accept it → FR26

### Integration Points

**Internal Communication:**
```
App.tsx
  └── useTodos (hook)
        └── api/todos.ts (fetch functions)
              └── HTTP /api/* → Nginx → Fastify routes
                    └── Drizzle client → SQLite file (Docker volume)
```

**Data Flow — Create Todo:**
1. User types in `AddTodoForm` → `inputText` state (local to form)
2. Submit → `useTodos.createTodo(text)` → sets `isCreating: true`
3. `api/todos.ts:createTodo(text)` → `POST /api/todos` with `{ text }`
4. Fastify JSON Schema validates body → route handler inserts via Drizzle → returns `201` with `Todo`
5. Hook: appends new todo to `todos[]`, sets `isCreating: false`; form clears `inputText`
6. On error: hook sets `error: string`, `isCreating: false`; form keeps `inputText` intact

**External Integrations:** None (v1).

### Development Workflow Integration

**Local Development (without Docker):**
```bash
# From monorepo root
pnpm dev   # runs concurrently: vite dev server (:5173) + nodemon backend (:3000)
```
Frontend Vite dev server proxies `/api/*` to `localhost:3000` via `vite.config.ts` proxy setting.

**Production (Docker Compose):**
```bash
docker compose up --build   # builds both images, starts services, attaches db-data volume
```
Frontend Nginx on `:80` serves static assets and proxies `/api/*` to `backend:3000`.

**Database Migrations:**
```bash
# Generate migration after schema change
pnpm --filter backend drizzle-kit generate

# Apply migrations (runs at backend startup via server.ts)
pnpm --filter backend drizzle-kit migrate
```
Migrations auto-run on backend startup via `migrate()` call in `server.ts` before routes are registered.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices are mutually compatible. Fastify v5 + Drizzle ORM + `better-sqlite3` is a well-established pairing. Vite + React + TypeScript introduces no conflicts with the backend stack. `@fastify/ajv` (JSON Schema) integrates natively. `@fastify/helmet` and `@fastify/cors` are standard plugins with no version conflicts.

**Pattern Consistency:** The `camelCase` (TypeScript/JSON) ↔ `snake_case` (DB) mapping boundary is explicitly owned by `routes/todos.ts` — no ambiguity. Per-operation loading flags are consistent with the raw `useState` approach (no external state library managing this). The error format `{ error: { code, message } }` is defined uniformly for all 5 HTTP status codes.

**Structure Alignment:** The directory structure maps directly onto every architectural decision. No circular dependencies exist between layers: `components → hooks → api → HTTP → routes → db`.

### Requirements Coverage Validation ✅

All 26 functional requirements are architecturally supported:

| FR Group | Coverage |
|---|---|
| FR1–FR6 Todo CRUD | `routes/todos.ts` + `useTodos.ts` + `api/todos.ts` |
| FR7–FR10 Data model | `db/schema.ts` (id, text, is_complete, created_at) |
| FR11 Empty state | `EmptyState.tsx` |
| FR12 Loading state | `LoadingState.tsx` + `isLoading` flag |
| FR13 Error state | `ErrorState.tsx` + `error: string \| null` in hook |
| FR14 Immediate feedback | Per-operation flags: `isCreating`, `isUpdating`, `isDeleting` |
| FR15 Retry / preserve input | `inputText` in `AddTodoForm` (cleared only on success); `error` in `useTodos` |
| FR16 Visual distinction | `TodoItem.tsx` + CSS Module completed styles |
| FR17–FR19 Responsive | CSS Modules + `App.module.css` breakpoints (≥1024px / 768–1023px / <768px) |
| FR20 Keyboard access | Native `<button>` + `<input>` elements |
| FR21–FR25 API endpoints | 4 REST endpoints with JSON Schema validation + standard error contract |
| FR26 No auth block | Schema accepts future `user_id` column without breaking existing records |

All NFRs are architecturally addressed:

| NFR | Architectural support |
|---|---|
| ≤200ms API | SQLite single-table, no joins — trivially achievable |
| ≤2s page load | Vite static output served by Nginx |
| HTTPS | TLS termination at Nginx layer (implementation-time config) |
| Input sanitisation | Fastify JSON Schema rejects malformed input before route handler |
| Safe error responses | Global `setErrorHandler` + explicit mapping in routes — no raw errors exposed |
| WCAG 2.1 AA | Native semantic HTML + ARIA labelling — architecturally unblocked |
| No data loss | Named Docker volume; failed writes do not corrupt state |
| Graceful degradation | `ErrorState.tsx` + hook-level error catching — no uncaught rejections |

### Gap Analysis Results

**Critical gaps:** None.

**Minor notes (no action required — handled at implementation story level):**
- Nginx TLS configuration (SSL certificates, `:443` listener) is deferred to the Docker implementation story
- `drizzle.config.ts` content (schema path, output dir) is a one-line config — handled in the DB setup story

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analysed
- [x] Scale and complexity assessed (Low — single-user, no auth, no real-time)
- [x] Technical constraints identified (static frontend, SQLite volume persistence)
- [x] Cross-cutting concerns mapped (error handling, validation, HTTPS, accessibility, FR26)

**✅ Architectural Decisions**
- [x] Critical decisions documented (validation strategy, state management, deployment)
- [x] Full technology stack specified (TypeScript, React+Vite, Fastify, Drizzle, SQLite, Docker Compose)
- [x] Integration patterns defined (Nginx proxy, `useTodos` boundary, fetch layer)
- [x] Performance and security NFRs addressed

**✅ Implementation Patterns**
- [x] Naming conventions established (7 conflict points resolved)
- [x] Structure patterns defined (co-located tests, one route file per resource)
- [x] Communication patterns specified (`useTodos` state shape, per-operation flags)
- [x] Process patterns documented (error handling, input preservation, async style)

**✅ Project Structure**
- [x] Complete directory structure defined (all files and directories named)
- [x] Component boundaries established (`useTodos` as sole API integration point)
- [x] Integration points mapped (frontend↔backend, container↔volume, routes↔db)
- [x] Requirements to structure mapping complete (all 26 FRs mapped to files)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — low-complexity project, narrow scope, all decisions made, no ambiguous integration points.

**Key Strengths:**
- Minimal dependency footprint — no unnecessary libraries
- All 7 AI agent conflict points explicitly resolved
- Complete data flow documented (create todo walkthrough)
- FR26 extensibility maintained without over-engineering
- Docker Compose provides full local reproducibility with zero cloud dependencies

**Areas for Future Enhancement (Post-MVP):**
- Add `userId` foreign key to `todos` table for Phase 3 multi-user support
- Introduce a router (React Router or TanStack Router) for Phase 2 filtered views
- Replace SQLite with PostgreSQL if concurrent write volume grows
- Add OpenAPI documentation when API becomes public-facing

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components — especially the anti-patterns table
- Respect layer boundaries: components never call `fetch` directly; routes never return raw Drizzle rows
- Refer to this document for all architectural questions before making independent decisions

**First Implementation Priority:**
```bash
mkdir todo-app && cd todo-app
pnpm init
echo "packages:\n  - 'frontend'\n  - 'backend'" > pnpm-workspace.yaml
pnpm create vite@latest frontend -- --template react-ts
```
