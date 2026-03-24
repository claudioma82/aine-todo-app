# Story 1.4: Frontend Scaffold and Backend Connectivity

Status: done

## Story

As a developer,
I want a Vite React TypeScript frontend that can communicate with the backend API in development,
So that the full client-server data flow is verified before any UI features are built.

## Acceptance Criteria

1. **Given** the frontend scaffolded via `pnpm create vite@latest frontend -- --template react-ts`, **when** `pnpm dev` is run, **then** the Vite dev server starts on port `5173`
2. **Given** `frontend/vite.config.ts` including a proxy configuration for `/api/*`, **when** the browser makes a request to `/api/*`, **then** it is forwarded to `http://localhost:3000`
3. **Given** the app running at `localhost:5173`, **when** `App.tsx` calls `GET /api/health` on mount, **then** a visible "Connected" indicator is rendered in the browser
4. **Given** `frontend/src/types/todo.ts`, **when** reviewed, **then** it exports a `Todo` interface with: `id: string`, `text: string`, `isComplete: boolean`, `createdAt: string`
5. **Given** `frontend/.env.example`, **when** checked, **then** it contains `VITE_API_URL=http://localhost:3000`

## Tasks / Subtasks

- [x] Task 1: Add proxy config to `frontend/vite.config.ts` (AC: 2)
  - [x] Add `server.proxy` for `/api` → `http://localhost:3000` with `changeOrigin: true`

- [x] Task 2: Create `frontend/src/types/todo.ts` (AC: 4)
  - [x] Export `Todo` interface with `id`, `text`, `isComplete`, `createdAt`

- [x] Task 3: Replace boilerplate `App.tsx` with health-check UI (AC: 3)
  - [x] Call `GET /api/health` on mount via `useEffect`
  - [x] Render "Connected" when response is `{ status: "ok" }`, "Disconnected" otherwise

- [x] Task 4: Create `frontend/.env.example` (AC: 5)
  - [x] Add `VITE_API_URL=http://localhost:3000`

- [x] Task 5: Verify all ACs
  - [x] Run `pnpm --filter frontend build` — zero TypeScript errors
  - [x] Confirm proxy config present in `vite.config.ts`
  - [x] Confirm `src/types/todo.ts` exports `Todo` interface

## Dev Notes

### Architecture Requirements (ARCH1, ARCH6)

**ARCH1**: Frontend is a Vite + React + TypeScript SPA. Dev server on port 5173.
**ARCH6**: In development, Vite proxies `/api/*` to `http://localhost:3000`. In production, Nginx handles the same proxy.

### Previous Story Learnings

- **Frontend uses ESNext/Bundler** module resolution — no `.js` extensions needed, `verbatimModuleSyntax` is on
- **`@types/node`** is installed in devDependencies — needed for `vite.config.ts` server config types
- **`noUnusedLocals` / `noUnusedParameters`** are strict — keep `App.tsx` clean

### Files Modified / Created

```
frontend/
├── .env.example              ← NEW
├── vite.config.ts            ← MODIFIED: proxy added
└── src/
    ├── App.tsx               ← MODIFIED: health check UI
    ├── App.css               ← MODIFIED: minimal styles
    └── types/
        └── todo.ts           ← NEW: Todo interface
```
