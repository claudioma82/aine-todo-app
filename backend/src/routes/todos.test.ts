import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { db } from '../db/client';

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildApp();
  // Clear todos between tests — all tests share the same :memory: db singleton
  db.exec('DELETE FROM todos');
});

afterEach(async () => {
  await app.close();
});

// ─── GET /api/todos ───────────────────────────────────────────────────────────

describe('GET /api/todos', () => {
  it('returns [] when the todos table is empty', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/todos' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('returns todos with isComplete as boolean after inserting rows', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/todos',
      payload: { text: 'Buy milk' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/todos',
      payload: { text: 'Read book' },
    });

    const res = await app.inject({ method: 'GET', url: '/api/todos' });
    expect(res.statusCode).toBe(200);

    const body = res.json<{ id: string; text: string; isComplete: boolean; createdAt: string }[]>();
    expect(body).toHaveLength(2);
    expect(typeof body[0].isComplete).toBe('boolean');
    expect(body[0].isComplete).toBe(false);
  });

  it('maps is_complete integer to boolean false/true', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/todos',
      payload: { text: 'Do laundry' },
    });
    const created = createRes.json<{ id: string }>();

    await app.inject({
      method: 'PATCH',
      url: `/api/todos/${created.id}`,
      payload: { isComplete: true },
    });

    const res = await app.inject({ method: 'GET', url: '/api/todos' });
    const todos = res.json<{ isComplete: boolean }[]>();
    expect(todos[0].isComplete).toBe(true);
    expect(typeof todos[0].isComplete).toBe('boolean');
  });
});

// ─── POST /api/todos ──────────────────────────────────────────────────────────

describe('POST /api/todos', () => {
  it('creates a todo and returns 201 with the new object', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/todos',
      payload: { text: 'Buy milk' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ id: string; text: string; isComplete: boolean; createdAt: string }>();
    expect(body.text).toBe('Buy milk');
    expect(body.isComplete).toBe(false);
    expect(typeof body.isComplete).toBe('boolean');
    expect(body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // UUID v4 format
    expect(body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('trims whitespace from text', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/todos',
      payload: { text: '  Buy eggs  ' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json<{ text: string }>().text).toBe('Buy eggs');
  });

  it('returns 422 when text field is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/todos',
      payload: {},
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'text is required' },
    });
  });

  it('returns 422 when text is empty string', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/todos',
      payload: { text: '' },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'text must not be empty' },
    });
  });

  it('returns 422 when text is whitespace only', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/todos',
      payload: { text: '   ' },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'text must not be empty' },
    });
  });
});

// ─── PATCH /api/todos/:id ─────────────────────────────────────────────────────

describe('PATCH /api/todos/:id', () => {
  it('marks a todo complete and returns the updated object', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/todos',
      payload: { text: 'Exercise' },
    });
    const { id, createdAt } = createRes.json<{ id: string; createdAt: string }>();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/todos/${id}`,
      payload: { isComplete: true },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ id: string; isComplete: boolean; createdAt: string }>();
    expect(body.id).toBe(id);
    expect(body.isComplete).toBe(true);
    expect(typeof body.isComplete).toBe('boolean');
    expect(body.createdAt).toBe(createdAt);
  });

  it('marks a todo incomplete again', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/todos',
      payload: { text: 'Sleep' },
    });
    const { id } = createRes.json<{ id: string }>();

    await app.inject({ method: 'PATCH', url: `/api/todos/${id}`, payload: { isComplete: true } });
    const res = await app.inject({ method: 'PATCH', url: `/api/todos/${id}`, payload: { isComplete: false } });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ isComplete: boolean }>().isComplete).toBe(false);
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/todos/does-not-exist',
      payload: { isComplete: true },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: { code: 'TODO_NOT_FOUND', message: 'The requested todo does not exist' },
    });
  });

  it('returns 422 when isComplete is missing', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/todos/any-id',
      payload: {},
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'isComplete must be a boolean' },
    });
  });

  it('returns 422 when isComplete is not a boolean', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/todos/any-id',
      payload: { isComplete: 1 },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'isComplete must be a boolean' },
    });
  });
});

// ─── DELETE /api/todos/:id ────────────────────────────────────────────────────

describe('DELETE /api/todos/:id', () => {
  it('deletes an existing todo and returns 204', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/todos',
      payload: { text: 'Clean desk' },
    });
    const { id } = createRes.json<{ id: string }>();

    const res = await app.inject({ method: 'DELETE', url: `/api/todos/${id}` });
    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');

    // Confirm it's gone
    const listRes = await app.inject({ method: 'GET', url: '/api/todos' });
    expect(listRes.json()).toEqual([]);
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/todos/ghost-id' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: { code: 'TODO_NOT_FOUND', message: 'The requested todo does not exist' },
    });
  });
});
