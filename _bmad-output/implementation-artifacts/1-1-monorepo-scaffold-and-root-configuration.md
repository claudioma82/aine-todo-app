# Story 1.1: Monorepo Scaffold and Root Configuration

Status: done

## Story

As a developer,
I want a pnpm workspace monorepo with `frontend/` and `backend/` packages and shared TypeScript configuration,
so that both packages share tooling conventions and can be started from a single root command.

## Acceptance Criteria

1. **Given** a fresh directory, **when** `pnpm install` is run from the root, **then** both `frontend/` and `backend/` node_modules are installed correctly
2. **Given** the monorepo root, **when** `pnpm dev` is run, **then** both the Vite dev server and the Fastify dev server start concurrently via `concurrently`
3. **Given** `tsconfig.base.json` exists at the root, **when** each package's `tsconfig.json` extends it, **then** TypeScript strict mode is enforced across both packages
4. **Given** the root `package.json`, **when** `pnpm build` is run, **then** both packages compile without TypeScript errors
5. **Given** the root `.gitignore`, **when** checked, **then** `node_modules/`, `dist/`, and `.env` files are excluded

## Tasks / Subtasks

- [x] Task 1: Initialise root monorepo (AC: 1, 2, 3, 4, 5)
  - [x] Create `pnpm-workspace.yaml` declaring `frontend` and `backend` packages
  - [x] Create root `package.json` with `name: "todo-app"`, `private: true`, and placeholder `scripts` block
  - [x] Create `tsconfig.base.json` at root with strict TypeScript settings (see Dev Notes)
  - [x] Create root `.gitignore` excluding `node_modules/`, `dist/`, `.env`, `.env.local`, `*.env`

- [x] Task 2: Scaffold backend package (AC: 1, 2, 3, 4)
  - [x] Create `backend/` directory and run `pnpm init` inside it (generates `backend/package.json`)
  - [x] Install backend TypeScript dev dependencies: `typescript`, `ts-node`, `@types/node`, `nodemon`
  - [x] Install initial backend runtime dependency: `fastify` (v5)
  - [x] Create `backend/tsconfig.json` extending `../../tsconfig.base.json` with `outDir: dist`, `rootDir: src`
  - [x] Create minimal `backend/src/server.ts` placeholder (see Dev Notes for exact content)
  - [x] Add `"dev": "nodemon --exec ts-node src/server.ts"` and `"build": "tsc"` scripts to `backend/package.json`

- [x] Task 3: Scaffold frontend package (AC: 1, 2, 3, 4)
  - [x] Run `pnpm create vite@latest frontend -- --template react-ts` to scaffold the Vite React TypeScript project
  - [x] Update `frontend/tsconfig.app.json` to extend `../tsconfig.base.json` (add `"extends": "../tsconfig.base.json"` and keep bundler overrides)
  - [x] Update `frontend/tsconfig.node.json` to extend `../tsconfig.base.json`
  - [x] Verify `frontend/package.json` already has `"dev": "vite"` and `"build": "tsc -b && vite build"` scripts

- [x] Task 4: Configure root orchestration scripts (AC: 1, 2, 4)
  - [x] Add `concurrently` as a root dev dependency: `pnpm add -D -w concurrently`
  - [x] Add `"dev": "concurrently \"pnpm --filter backend dev\" \"pnpm --filter frontend dev\""` to root `package.json`
  - [x] Add `"build": "pnpm --filter backend build && pnpm --filter frontend build"` to root `package.json`
  - [x] Add `"test": "pnpm --filter backend test && pnpm --filter frontend test"` to root `package.json`

- [x] Task 5: Install and configure Vitest (AC: 4 — tooling baseline for all subsequent stories)
  - [x] Add Vitest to backend: `pnpm add -D --filter backend vitest`
  - [x] Add Vitest to frontend: `pnpm add -D --filter frontend vitest @vitest/ui`
  - [x] Add `"test": "vitest run"` script to `backend/package.json`
  - [x] Add `"test": "vitest run --passWithNoTests"` script to `frontend/package.json`
  - [x] Create `backend/vitest.config.ts` scoping tests to `src/**/*.test.ts` (prevents dist/ interference)
  - [x] Create `backend/src/server.test.ts` with a trivial sanity test
  - [x] Run `pnpm test` from root to confirm Vitest executes in both packages

- [x] Task 6: Final verification of all ACs (AC: 1–5)
  - [x] Run `pnpm install` from root — both packages install correctly
  - [x] Run `pnpm build` — zero TypeScript errors in both packages
  - [x] Run `pnpm test` — Vitest passes in both packages (1 test backend, 0 tests frontend with passWithNoTests)
  - [x] Verify `.gitignore` covers `node_modules/`, `dist/`, `.env*`

## Dev Notes

### Critical Architecture Requirements

**ARCH1 — pnpm workspaces:** Structure MUST be `pnpm-workspace.yaml` with `packages: ['frontend', 'backend']` (not Nx, not Turborepo, not npm/yarn workspaces).

**ARCH2 — Frontend scaffold command:** The frontend MUST be initialised with this exact command:
```bash
pnpm create vite@latest frontend -- --template react-ts
```
Do NOT manually create the frontend structure. The Vite scaffolder generates the correct `index.html`, `src/main.tsx`, `src/App.tsx` boilerplate.

**ARCH10 — Vitest:** Is the mandated testing framework. Must be installed in this story as the tooling baseline so all subsequent stories can add tests without additional setup. Test files use `.test.ts` / `.test.tsx` suffix, co-located alongside source files — NEVER in a separate `__tests__/` directory.

### tsconfig.base.json — Exact Content

Create this file at the monorepo root:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Note for frontend package:** Vite React projects typically use `"module": "ESNext"` and `"moduleResolution": "Bundler"` because Vite handles bundling (not Node). The frontend `tsconfig.json` MUST override `module` and `moduleResolution` to be compatible with Vite:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": true
  },
  "include": ["src"]
}
```

**Backend tsconfig.json:**
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["ES2022"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```
The backend uses `CommonJS` module format because `ts-node` + `nodemon` works reliably with CommonJS at Node.js runtime. Fastify v5 supports CommonJS.

### Minimal Backend Placeholder (backend/src/server.ts)

This is a placeholder only — Story 1.2 will replace this with the full Fastify server. Create just enough to have a running dev process:
```typescript
console.log('Backend server starting on port 3000...');
// Story 1.2 will implement the full Fastify server
```
This allows `pnpm dev` to start both processes and satisfy AC 2 without implementing the real server prematurely.

### Vitest Sanity Test (backend/src/server.test.ts)

```typescript
import { describe, it, expect } from 'vitest';

describe('server placeholder', () => {
  it('should have a truthy module', () => {
    expect(true).toBe(true);
  });
});
```
This is a scaffolding test — its only purpose is to confirm Vitest is installed and the test runner is configured correctly. It will be replaced by real tests in Story 1.2.

### Expected Final Directory Structure After This Story

```
todo-app/
├── pnpm-workspace.yaml
├── package.json                # root: dev, build, test scripts + concurrently devDep
├── tsconfig.base.json          # shared strict TS config
├── .gitignore
├── frontend/                   # scaffolded by pnpm create vite
│   ├── package.json
│   ├── tsconfig.json           # extends ../tsconfig.base.json
│   ├── tsconfig.app.json       # if generated by vite template
│   ├── tsconfig.node.json      # if generated by vite template
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       └── ...                 # vite template files
└── backend/
    ├── package.json            # dev, build, test scripts
    ├── tsconfig.json           # extends ../tsconfig.base.json
    └── src/
        ├── server.ts           # placeholder only
        └── server.test.ts      # Vitest sanity test
```

### Naming & Convention Rules (from architecture.md)

- TypeScript identifiers: `camelCase`
- Component files (future): `PascalCase.tsx`
- Config files: lowercase kebab (`tsconfig.base.json`, `pnpm-workspace.yaml`)
- Root scripts must exactly match: `"dev"`, `"build"`, `"test"` — these are referenced by all subsequent stories

### Common Mistakes to Avoid

- ❌ DO NOT create a `frontend/` folder manually — use `pnpm create vite@latest`
- ❌ DO NOT use `--filter=frontend` syntax — use `--filter frontend` (space, not equals)
- ❌ DO NOT set `"module": "NodeNext"` in the frontend tsconfig — Vite uses bundler resolution
- ❌ DO NOT create a separate `__tests__/` directory anywhere — Vitest tests are co-located
- ❌ DO NOT add `@types/react` manually — Vite template includes it
- ❌ DO NOT commit `.env` files — `.gitignore` must cover `.env`, `.env.local`, `*.env`
- ❌ DO NOT use `npm` or `yarn` — `pnpm` exclusively throughout

### pnpm-workspace.yaml Exact Content

```yaml
packages:
  - 'frontend'
  - 'backend'
```

### Root package.json Template

```json
{
  "name": "todo-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"pnpm --filter backend dev\" \"pnpm --filter frontend dev\"",
    "build": "pnpm --filter backend build && pnpm --filter frontend build",
    "test": "pnpm --filter backend test && pnpm --filter frontend test"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```
Exact `concurrently` version will be resolved by pnpm — do not hardcode unless required.

### .gitignore Content

```gitignore
# Dependencies
node_modules/

# Build outputs
dist/

# Environment files
.env
.env.local
.env.*.local
*.env

# Editor
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
pnpm-debug.log*
```

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

- All 5 ACs satisfied and verified via CLI runs
- Vite v8 template uses composite tsconfig references (tsconfig.json → tsconfig.app.json + tsconfig.node.json); both extended with tsconfig.base.json while preserving bundler-mode overrides
- Backend uses CommonJS module format for ts-node/nodemon compatibility; frontend uses ESNext + bundler moduleResolution as required by Vite
- Added `backend/vitest.config.ts` with `include: ['src/**/*.test.ts']` to prevent Vitest picking up compiled `dist/` test files
- Frontend test script uses `--passWithNoTests` so `pnpm test` from root passes before any frontend tests exist
- `pnpm build` ✅, `pnpm test` ✅ (1 backend test, 0 frontend tests), `pnpm install` ✅

### File List

- `pnpm-workspace.yaml`
- `package.json`
- `tsconfig.base.json`
- `.gitignore`
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/vitest.config.ts`
- `backend/src/server.ts`
- `backend/src/server.test.ts`
- `frontend/package.json` (modified: added test script)
- `frontend/tsconfig.app.json` (modified: added extends)
- `frontend/tsconfig.node.json` (modified: added extends)
- `frontend/tsconfig.json` (generated by Vite)
- `frontend/vite.config.ts` (generated by Vite)
- `frontend/index.html` (generated by Vite)
- `frontend/src/` (generated by Vite — main.tsx, App.tsx, etc.)
