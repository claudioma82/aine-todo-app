# Story 1.2: Backend Server Foundation

Status: done

## Story

As a developer,
I want a running Fastify server with security plugins and environment configuration,
so that the API layer is ready to register routes with correct security headers and CORS policy.

## Acceptance Criteria

1. **Given** the backend package, **when** `pnpm dev` is run, **then** the Fastify server starts on `PORT` from environment (default `3000`) and logs a startup message
2. **Given** a `GET /api/health` request, **when** the server is running, **then** it returns `{ "status": "ok" }` with HTTP 200
3. **Given** a request from `CORS_ORIGIN`, **when** `@fastify/cors` is configured, **then** the response includes the correct `Access-Control-Allow-Origin` header
4. **Given** any request, **when** `@fastify/helmet` is registered, **then** HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`, etc.) are present in all responses
5. **Given** an unhandled server error, **when** it propagates to Fastify's global `setErrorHandler`, **then** the response is `{ "error": { "code": "INTERNAL_ERROR", "message": "An unexpected error occurred" } }` with HTTP 500 and no stack trace exposed
6. **Given** `backend/.env.example`, **when** checked, **then** it contains `PORT`, `DATABASE_PATH`, and `CORS_ORIGIN` with example values

## Tasks / Subtasks

- [x] Task 1: Install new backend dependencies (AC: 3, 4)
  - [x] Install `@fastify/cors` and `@fastify/helmet`: `pnpm add --filter backend @fastify/cors @fastify/helmet`
  - [x] Install `dotenv` for loading `.env` in development: `pnpm add --filter backend dotenv`

- [x] Task 2: Create the Fastify app factory — `backend/src/app.ts` (AC: 2, 3, 4, 5)
  - [x] Create `backend/src/app.ts` that exports a `buildApp()` async factory function returning a configured Fastify instance
  - [x] Register `@fastify/helmet` plugin inside `buildApp()`
  - [x] Register `@fastify/cors` plugin inside `buildApp()`, reading `CORS_ORIGIN` from `process.env` (default `http://localhost:5173`)
  - [x] Register the global `setErrorHandler` inside `buildApp()` — returns `{ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }` with status 500; logs original error server-side
  - [x] Register `GET /api/health` route returning `{ status: 'ok' }` with HTTP 200 inside `buildApp()`

- [x] Task 3: Create server entry point — `backend/src/server.ts` (replaces placeholder) (AC: 1)
  - [x] Replace the placeholder `server.ts` with entry point calling `buildApp()`, listening on `PORT` (default `3000`), logging startup message
  - [x] `import 'dotenv/config'` is the first import in `server.ts`

- [x] Task 4: Create plugin files (AC: 3, 4)
  - [x] Create `backend/src/plugins/cors.ts` — fastify-plugin wrapper around `@fastify/cors`
  - [x] Create `backend/src/plugins/helmet.ts` — fastify-plugin wrapper around `@fastify/helmet`

- [x] Task 5: Create environment config files (AC: 6)
  - [x] Create `backend/.env.example` with `PORT=3000`, `DATABASE_PATH=./data/todos.db`, `CORS_ORIGIN=http://localhost:5173`
  - [x] Create `backend/.env` (gitignored) with same values for local development

- [x] Task 6: Write tests — `backend/src/app.test.ts` (AC: 1, 2, 3, 4, 5)
  - [x] Test: `GET /api/health` returns `{ status: 'ok' }` with HTTP 200
  - [x] Test: CORS `Access-Control-Allow-Origin` header present for matching origin
  - [x] Test: `X-Content-Type-Options: nosniff` and `X-Frame-Options` headers present
  - [x] Test: Unhandled error returns `{ error: { code: 'INTERNAL_ERROR', ... } }` with HTTP 500
  - [x] Test: Internal error message is NOT leaked in response body

- [x] Task 7: Update `backend/src/server.test.ts` placeholder (AC: tooling)
  - [x] Replaced trivial placeholder with `buildApp()` smoke test verifying Fastify API surface

- [x] Task 8: Verify all ACs
  - [x] `pnpm --filter backend build` — zero TypeScript errors
  - [x] `pnpm test` — 7/7 tests pass, 0 regressions

## Dev Notes

### Previous Story Learnings (Story 1.1)

- **Backend uses CommonJS** — `tsconfig.json` sets `"module": "CommonJS"`, `"moduleResolution": "Node"`. All imports use CommonJS-compatible patterns. `ts-node` + `nodemon` run on CommonJS.
- **Vitest config scoped to `src/`** — `backend/vitest.config.ts` uses `include: ['src/**/*.test.ts']`. Tests in `dist/` are intentionally excluded.
- **Fastify v5.8.2 is already installed** — do NOT re-install fastify.
- **Installed devDeps**: `typescript ^5.9.3`, `ts-node ^10.9.2`, `nodemon ^3.1.14`, `@types/node ^25.5.0`, `vitest ^4.1.0`
- **Scripts wired**: `"dev": "nodemon --exec ts-node src/server.ts"`, `"build": "tsc"`, `"test": "vitest run"` — do not change these.

### Architecture Requirements (ARCH4, ARCH7)

**ARCH4**: Fastify v5 + `@fastify/cors` + `@fastify/helmet` plugins registered at startup.

**ARCH7**: ALL error responses use this exact format — no exceptions:
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "An unexpected error occurred" } }
```

**ARCH — App factory pattern** (from architecture.md project structure):
The architecture defines TWO files:
- `backend/src/app.ts` — Fastify instance factory (exported for testing) — this is the testable unit
- `backend/src/server.ts` — entry point that calls the factory and starts listening (NOT imported in tests)

This separation is CRITICAL for testing: `app.ts` is imported in tests without starting the HTTP server. `server.ts` is never imported in tests.

### Exact File Structure to Create

```
backend/src/
├── app.ts              ← NEW: Fastify factory (buildApp function)
├── app.test.ts         ← NEW: integration tests against buildApp()
├── server.ts           ← REPLACE placeholder with real entry point
├── server.test.ts      ← REPLACE placeholder or remove
├── plugins/
│   ├── cors.ts         ← NEW: @fastify/cors plugin wrapper
│   └── helmet.ts       ← NEW: @fastify/helmet plugin wrapper
```

### `backend/src/app.ts` — Implementation Guide

```typescript
import Fastify, { FastifyInstance } from 'fastify';
import corsPlugin from '@fastify/cors';
import helmetPlugin from '@fastify/helmet';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  // Security headers
  await app.register(helmetPlugin);

  // CORS
  await app.register(corsPlugin, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  });

  // Global error handler — NEVER exposes internal details
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  // Health check
  app.get('/api/health', async (_request, reply) => {
    return reply.send({ status: 'ok' });
  });

  return app;
}
```

**Key decisions:**
- `Fastify({ logger: true })` — structured logging enabled; errors are logged server-side
- `await app.register(...)` — Fastify v5 plugin registration is async; always `await`
- `setErrorHandler` logs the real error but sends only the safe generic message to the client
- Health route returns `{ status: 'ok' }` — note lowercase `status`, not `"ok"` string with capital

### `backend/src/server.ts` — Implementation Guide

```typescript
import 'dotenv/config';
import { buildApp } from './app.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function start() {
  const app = await buildApp();
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Server listening on port ${PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Important:**
- `import 'dotenv/config'` must be the FIRST import — loads `.env` before anything else reads `process.env`
- `host: '0.0.0.0'` is required so the server is accessible inside Docker containers (not just localhost)
- CommonJS `require('dotenv/config')` is the alternative if ESM import causes issues with ts-node; use `require('dotenv').config()` if needed

### `backend/src/app.test.ts` — Test Implementation Guide

Use Fastify's `inject()` method — it makes HTTP requests without starting the network listener. This is the correct Fastify testing pattern.

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from './app.js';
import { FastifyInstance } from 'fastify';

describe('app', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    app = await buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/health', () => {
    it('returns { status: "ok" } with HTTP 200', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 'ok' });
    });
  });

  describe('security headers', () => {
    it('includes X-Content-Type-Options header', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('CORS', () => {
    it('includes Access-Control-Allow-Origin header for matching origin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/health',
        headers: { origin: 'http://localhost:5173' },
      });
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });

  describe('error handler', () => {
    it('returns INTERNAL_ERROR for unhandled exceptions', async () => {
      // Register a test-only route that throws
      app.get('/test-error', async () => { throw new Error('boom'); });
      const res = await app.inject({ method: 'GET', url: '/test-error' });
      expect(res.statusCode).toBe(500);
      expect(res.json()).toEqual({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      });
    });
  });
});
```

### Plugin Files — Implementation Guide

`backend/src/plugins/cors.ts`:
```typescript
import fp from 'fastify-plugin';
import corsPlugin from '@fastify/cors';
import { FastifyInstance } from 'fastify';

export default fp(async function cors(app: FastifyInstance) {
  await app.register(corsPlugin, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  });
});
```

`backend/src/plugins/helmet.ts`:
```typescript
import fp from 'fastify-plugin';
import helmetPlugin from '@fastify/helmet';
import { FastifyInstance } from 'fastify';

export default fp(async function helmet(app: FastifyInstance) {
  await app.register(helmetPlugin);
});
```

**Note:** If `fastify-plugin` is not installed, install it: `pnpm add --filter backend fastify-plugin`. It is required for plugins to correctly share the Fastify scope. Alternatively, you can register the plugins directly in `app.ts` without plugin wrappers — both approaches are valid. Prefer directness for simplicity at this scope.

### CommonJS Import Compatibility Note

When using `ts-node` with CommonJS, imports of ESM-only packages can fail. Both `@fastify/cors` and `@fastify/helmet` support CommonJS. If you encounter `ERR_REQUIRE_ESM` errors:
1. Check the package version — use a CJS-compatible version
2. Add `"esModuleInterop": true` is already in `tsconfig.base.json` ✅
3. Try `const cors = require('@fastify/cors')` as a fallback

### `.env.example` Content

```
PORT=3000
DATABASE_PATH=./data/todos.db
CORS_ORIGIN=http://localhost:5173
```

`DATABASE_PATH` is included now even though the database isn't created until Story 1.3 — the `.env.example` documents all expected env vars for the service.

### Naming & Convention Rules

- Error codes: `UPPER_SNAKE_CASE` — `INTERNAL_ERROR`, `TODO_NOT_FOUND`, `VALIDATION_ERROR`
- All JSON response fields: `camelCase` — `{ status: 'ok' }`, not `{ Status: 'ok' }`
- Test files: co-located at `backend/src/app.test.ts` — never in a separate `__tests__/` directory
- Never expose `error.message` or `error.stack` from caught exceptions in HTTP responses

### What NOT to Do

- ❌ DO NOT create database schema or Drizzle setup — that is Story 1.3
- ❌ DO NOT add any todo routes — those are Epic 2
- ❌ DO NOT use a single global `isLoading` flag — not applicable here but keep architecture in mind
- ❌ DO NOT call `app.listen()` inside `buildApp()` — the factory only configures, `server.ts` starts
- ❌ DO NOT import `server.ts` in tests — it starts the HTTP listener and will conflict with test port

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

- All 6 ACs satisfied and verified
- App factory pattern correctly implemented: `app.ts` (testable) + `server.ts` (entry point with dotenv first)
- `host: '0.0.0.0'` set in `app.listen()` for Docker container accessibility
- Error handler tests required own `buildApp()` instance per test (routes cannot be added after `app.ready()` in Fastify v5 — this is important for future test authors)
- `fastify-plugin` installed alongside the plugin files; plugins use fp() wrapper for correct scope decoration
- `pnpm build` ✅, `pnpm test` ✅ (7 backend tests + 1 smoke, no regressions)

### File List

- `backend/src/app.ts` (new)
- `backend/src/app.test.ts` (new)
- `backend/src/server.ts` (replaced placeholder)
- `backend/src/server.test.ts` (updated: placeholder → smoke test)
- `backend/src/plugins/cors.ts` (new)
- `backend/src/plugins/helmet.ts` (new)
- `backend/.env.example` (new)
- `backend/.env` (new — gitignored)
