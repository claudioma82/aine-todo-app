import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from './app';
import { FastifyInstance } from 'fastify';

describe('app', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    process.env.DATABASE_PATH = ':memory:';
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
    it('includes X-Content-Type-Options: nosniff header', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('includes X-Frame-Options header', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      expect(res.headers['x-frame-options']).toBeDefined();
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
});

// Error handler tests use their own app instance so routes can be added before ready()
describe('app error handler', () => {
  it('returns INTERNAL_ERROR shape for unhandled exceptions with HTTP 500', async () => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    const app = await buildApp();
    // Register test route BEFORE ready()
    app.get('/test-error', async () => {
      throw new Error('deliberate test error');
    });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/test-error' });
    await app.close();

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  });

  it('does not expose internal error details in the response', async () => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    const app = await buildApp();
    app.get('/test-leak', async () => {
      throw new Error('super secret internal message');
    });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/test-leak' });
    await app.close();

    expect(res.body).not.toContain('super secret internal message');
  });
});
