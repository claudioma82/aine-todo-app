import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from './app';

describe('buildApp', () => {
  beforeEach(() => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.CORS_ORIGIN = 'http://localhost:5173';
  });

  it('creates a Fastify instance with the expected api surface', async () => {
    const app = await buildApp();
    expect(typeof app.inject).toBe('function');
    expect(typeof app.listen).toBe('function');
    expect(typeof app.close).toBe('function');
    await app.close();
  });
});
