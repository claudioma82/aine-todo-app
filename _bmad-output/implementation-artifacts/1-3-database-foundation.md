# Story 1.3: Database Foundation

Status: done

## Story

As a developer,
I want Drizzle ORM and SQLite configured with the todos table schema and automatic migration on startup,
so that the backend has a working persistence layer ready for API route implementation.

## Acceptance Criteria

1. **Given** `backend/src/db/schema.ts`, **when** reviewed, **then** it defines a `todos` table with columns: `id` (text, primary key, UUID), `text` (text, not null), `is_complete` (integer, not null, default `0`), `created_at` (text, not null, ISO timestamp)
2. **Given** `backend/src/db/client.ts`, **when** the Drizzle client is imported, **then** it reads `DATABASE_PATH` from the environment and creates a `better-sqlite3` connection
3. **Given** `server.ts` startup, **when** the server starts, **then** Drizzle Kit migrations run automatically before routes are registered
4. **Given** `backend/drizzle.config.ts`, **when** Drizzle Kit runs, **then** it reads schema from `src/db/schema.ts` and outputs migration files to `src/db/migrations/`
5. **Given** a fresh database after migration, **when** the `todos` table is queried, **then** it returns an empty array `[]` (not `null`)
6. **Given** `DATABASE_PATH` pointing to `/app/data/todos.db` in Docker, **when** the `/app/data/` directory does not yet exist, **then** the server creates it automatically before connecting

## Tasks / Subtasks

- [x] Task 1: Install database dependencies (AC: 1, 2, 3, 4)
  - [x] Install Drizzle ORM and better-sqlite3: `pnpm add --filter backend drizzle-orm better-sqlite3`
  - [x] Install Drizzle Kit and types: `pnpm add -D --filter backend drizzle-kit @types/better-sqlite3`

- [x] Task 2: Create the Drizzle schema — `backend/src/db/schema.ts` (AC: 1)
  - [x] Define the `todos` table using `sqliteTable` from `drizzle-orm/sqlite-core`
  - [x] Add column `id`: text, primary key
  - [x] Add column `text`: text, not null
  - [x] Add column `is_complete`: integer, not null, default `0`
  - [x] Add column `created_at`: text, not null

- [x] Task 3: Create the Drizzle client — `backend/src/db/client.ts` (AC: 2, 6)
  - [x] Import `Database` from `better-sqlite3` and `drizzle` from `drizzle-orm/better-sqlite3`
  - [x] Read `DATABASE_PATH` from `process.env` (no default — must be set)
  - [x] Auto-create the parent directory of `DATABASE_PATH` if it does not exist (using `fs.mkdirSync` with `{ recursive: true }`)
  - [x] Create the `better-sqlite3` connection and export the Drizzle client as `db`

- [x] Task 4: Generate and commit the initial migration (AC: 3, 4)
  - [x] Create `backend/drizzle.config.ts` pointing to `src/db/schema.ts` with output to `src/db/migrations/`
  - [x] Run `pnpm --filter backend exec drizzle-kit generate` to generate the initial migration SQL file
  - [x] Confirm `src/db/migrations/` directory is created with a `.sql` migration file

- [x] Task 5: Wire auto-migration into app startup — update `backend/src/app.ts` (AC: 3, 5)
  - [x] Import `migrate` from `drizzle-orm/better-sqlite3/migrator` and the `db` client in `app.ts`
  - [x] Call `migrate(db, { migrationsFolder: path.join(__dirname, 'db/migrations') })` at the TOP of `buildApp()`, before any plugin registration
  - [x] Import `path` from Node.js `path` module for the `__dirname` resolution

- [x] Task 6: Write tests — `backend/src/db/schema.test.ts` and update `backend/src/app.test.ts` (AC: 1, 2, 5)
  - [x] Create `backend/src/db/schema.test.ts`: verify the schema exports a `todos` table with the correct column names
  - [x] Update `backend/src/app.test.ts`: set `DATABASE_PATH` to an in-memory SQLite path (`:memory:`) in `beforeEach` so tests do not touch the filesystem
  - [x] Add a test in `app.test.ts` confirming the health endpoint still returns 200 after migration runs (proves migration doesn't crash startup)

- [x] Task 7: Verify all ACs
  - [x] Run `pnpm --filter backend build` — zero TypeScript errors
  - [x] Run `pnpm --filter backend test` — all tests pass (9/9)
  - [x] Confirm `src/db/migrations/` contains at least one `.sql` file
  - [x] Confirm `backend/drizzle.config.ts` exists and is valid

## Dev Notes

### Previous Story Learnings (Stories 1.1 & 1.2)

- **Backend uses CommonJS** — `tsconfig.json` sets `"module": "CommonJS"`, `"moduleResolution": "Node"`. All imports use CommonJS-compatible patterns. Do NOT use `.js` extensions on imports.
- **Fastify v5 testing pattern** — use `app.inject()` via `buildApp()` factory. Routes/test-only routes must be registered BEFORE `app.ready()` is called.
- **Test scope** — `backend/vitest.config.ts` includes `src/**/*.test.ts`. Tests in `dist/` are excluded.
- **Environment loading** — `dotenv` is loaded by `server.ts` as the first import. Tests must set `process.env` values themselves in `beforeEach` — they do NOT load `.env` automatically.
- **Currently installed backend deps**: `fastify ^5.8.2`, `@fastify/cors`, `@fastify/helmet`, `dotenv`, `fastify-plugin`

### Architecture Requirements (ARCH5, ARCH11)

**ARCH5**: SQLite via `better-sqlite3`; ORM is Drizzle ORM; migrations generated and applied via Drizzle Kit; **migrations auto-run on server startup**.

**ARCH11**: `isComplete` field is **boolean** in TypeScript/JSON; stored as **integer (0/1)** in SQLite; mapping happens in the route handler (Epic 2). In the schema: `is_complete` is `integer`, **not** `boolean`. The Drizzle column type must be `integer` here.

### Exact File Structure to Create

```
backend/
├── drizzle.config.ts         ← NEW: Drizzle Kit configuration
└── src/
    ├── app.ts                ← MODIFIED: add migrate() call at top of buildApp()
    └── db/
        ├── schema.ts         ← NEW: todos table definition
        ├── client.ts         ← NEW: Drizzle client singleton
        └── migrations/       ← GENERATED by drizzle-kit generate
            └── 0000_*.sql    ← generated migration file (commit this)
```

### `backend/src/db/schema.ts` — Exact Implementation

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const todos = sqliteTable('todos', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  isComplete: integer('is_complete').notNull().default(0),
  createdAt: text('created_at').notNull(),
});
```

**Critical naming rules (from architecture.md):**
- DB column names: `snake_case` — `is_complete`, `created_at`
- TypeScript field names (Drizzle aliases): `camelCase` — `isComplete`, `createdAt`
- Drizzle maps them automatically: `todos.isComplete` in TypeScript → `is_complete` in SQL
- Table name: `todos` (plural, lowercase)
- Do NOT add `autoIncrement` or `serial` — id is a UUID text set by the application

### `backend/src/db/client.ts` — Exact Implementation

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DATABASE_PATH;
if (!dbPath) {
  throw new Error('DATABASE_PATH environment variable is required');
}

// Auto-create parent directory (handles /app/data/ in Docker)
const dbDir = path.dirname(dbPath);
fs.mkdirSync(dbDir, { recursive: true });

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
```

**Why throw if missing?** The server must fail fast with a clear error if misconfigured, rather than silently creating a database at an unexpected location.

**`:memory:` in tests:** When `DATABASE_PATH=:memory:`, `path.dirname(':memory:')` returns `'.'` and `fs.mkdirSync('.', { recursive: true })` is a no-op — safe for tests.

### `backend/drizzle.config.ts` — Exact Implementation

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
} satisfies Config;
```

**Note:** `dialect: 'sqlite'` is required by Drizzle Kit v0.30+. Older versions use `driver: 'better-sqlite3'` — use `dialect` with the current version.

### Wiring Migration into `app.ts`

Add this at the very top of `buildApp()`, before plugin registration:

```typescript
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './db/client';
import path from 'path';

export async function buildApp(): Promise<FastifyInstance> {
  // Run migrations first — before any routes or plugins
  migrate(db, { migrationsFolder: path.join(__dirname, 'db/migrations') });

  const app = Fastify({ logger: true });
  // ... rest of buildApp
}
```

**`__dirname` works in CommonJS** — this is why `"module": "CommonJS"` was used. In ESM you'd need `import.meta.url` + `fileURLToPath`. Our setup uses CommonJS, so `__dirname` is available.

**`migrate()` is synchronous** (better-sqlite3 is a synchronous driver) — do NOT `await` it.

### Test Strategy for Database

Tests must NOT use the real filesystem database. Set `process.env.DATABASE_PATH = ':memory:'` in `beforeEach`:

```typescript
beforeEach(async () => {
  process.env.DATABASE_PATH = ':memory:';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  app = await buildApp();
  await app.ready();
});
```

The `:memory:` path creates a fresh in-memory SQLite database for each test — isolated, fast, no file cleanup needed.

**Important:** Each `buildApp()` call creates a new Drizzle client (new `better-sqlite3` connection to `:memory:`). The in-memory DB is destroyed when the connection closes. This is correct behaviour for tests.

### `backend/src/db/schema.test.ts` — Test Guide

```typescript
import { describe, it, expect } from 'vitest';
import { todos } from './schema';

describe('todos schema', () => {
  it('exports a todos table', () => {
    expect(todos).toBeDefined();
  });

  it('has the correct table name', () => {
    expect(todos[Symbol.for('drizzle:Name')]).toBe('todos');
  });
});
```

**Alternatively** (simpler): just verify the export exists and is an object — Drizzle's compile-time types ensure correctness at build time.

### Naming & Convention Rules

- Column names in schema: `snake_case` (SQL layer) — `is_complete`, `created_at`
- TypeScript aliases in schema: `camelCase` — `isComplete`, `createdAt`
- `db` export from `client.ts` is the single Drizzle client instance used everywhere
- Migration files are auto-named by Drizzle Kit (e.g. `0000_initial.sql`) — commit them to version control
- Do NOT manually edit generated `.sql` migration files

### What NOT to Do

- ❌ DO NOT use `boolean` for `is_complete` in the Drizzle schema — use `integer()` as per ARCH11
- ❌ DO NOT `await migrate()` — `better-sqlite3` is synchronous; `migrate()` returns void
- ❌ DO NOT hard-code the database path — always read from `DATABASE_PATH` env var
- ❌ DO NOT skip the `mkdirSync` — Docker containers won't have `/app/data/` pre-created
- ❌ DO NOT create todo CRUD logic here — that is Epic 2 (Stories 2.1–2.4)
- ❌ DO NOT use `__tests__/` directory — all tests co-located with source files

### Running the Migration Generator

After creating the schema and `drizzle.config.ts`, generate the migration:
```bash
pnpm --filter backend exec drizzle-kit generate
```
Or if that fails:
```bash
cd backend && npx drizzle-kit generate
```
This creates `src/db/migrations/0000_*.sql`. Commit this file — it is the authoritative migration applied at startup.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
