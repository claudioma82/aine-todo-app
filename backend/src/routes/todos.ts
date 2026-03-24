import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { db } from '../db/client';
import type { Todo } from '../db/schema';

export async function todosRoutes(app: FastifyInstance): Promise<void> {
  // Prepare statements after migrations have run (called from buildApp)
  const selectAll = db.prepare(
    'SELECT id, text, is_complete AS isComplete, created_at AS createdAt FROM todos',
  );
  const selectById = db.prepare(
    'SELECT id, text, is_complete AS isComplete, created_at AS createdAt FROM todos WHERE id = ?',
  );
  const insertTodo = db.prepare(
    'INSERT INTO todos (id, text, is_complete, created_at) VALUES (?, ?, ?, ?)',
  );
  const updateIsComplete = db.prepare('UPDATE todos SET is_complete = ? WHERE id = ?');
  const deleteTodo = db.prepare('DELETE FROM todos WHERE id = ?');

  // GET /api/todos — list all todos
  app.get('/api/todos', async (_request, reply) => {
    const rows = selectAll.all() as unknown as Todo[];
    return reply.send(rows.map((row) => ({ ...row, isComplete: row.isComplete === 1 })));
  });

  // POST /api/todos — create a new todo
  app.post('/api/todos', async (request, reply) => {
    const body = request.body as Record<string, unknown> | null;

    if (!body || !('text' in body)) {
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', message: 'text is required' },
      });
    }

    const text = body.text;

    if (typeof text !== 'string' || text.trim().length === 0) {
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', message: 'text must not be empty' },
      });
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();

    insertTodo.run(id, text.trim(), 0, createdAt);

    return reply.status(201).send({ id, text: text.trim(), isComplete: false, createdAt });
  });

  // PATCH /api/todos/:id — toggle completion
  app.patch('/api/todos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown> | null;

    if (!body || !('isComplete' in body) || typeof body.isComplete !== 'boolean') {
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', message: 'isComplete must be a boolean' },
      });
    }

    const existing = selectById.get(id) as unknown as Todo | undefined;

    if (!existing) {
      return reply.status(404).send({
        error: { code: 'TODO_NOT_FOUND', message: 'The requested todo does not exist' },
      });
    }

    updateIsComplete.run(body.isComplete ? 1 : 0, id);

    return reply.send({
      id: existing.id,
      text: existing.text,
      isComplete: body.isComplete,
      createdAt: existing.createdAt,
    });
  });

  // DELETE /api/todos/:id — remove a todo
  app.delete('/api/todos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = selectById.get(id) as unknown as Todo | undefined;

    if (!existing) {
      return reply.status(404).send({
        error: { code: 'TODO_NOT_FOUND', message: 'The requested todo does not exist' },
      });
    }

    deleteTodo.run(id);

    return reply.status(204).send();
  });
}
