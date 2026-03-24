import Fastify, { FastifyInstance } from 'fastify';
import corsPlugin from '@fastify/cors';
import helmetPlugin from '@fastify/helmet';
import { db } from './db/client';
import { todosRoutes } from './routes/todos';
import fs from 'fs';
import path from 'path';

function runMigrations(): void {
  // Track applied migrations in a dedicated table
  db.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      name TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const migrations = [
    {
      name: '0000_fuzzy_black_crow',
      file: path.join(__dirname, 'db/migrations/0000_fuzzy_black_crow.sql'),
    },
  ];

  for (const migration of migrations) {
    const applied = db
      .prepare('SELECT name FROM __migrations WHERE name = ?')
      .get(migration.name);
    if (!applied) {
      const sql = fs.readFileSync(migration.file, 'utf-8');
      db.exec(sql);
      db.prepare('INSERT INTO __migrations (name, applied_at) VALUES (?, ?)').run(
        migration.name,
        new Date().toISOString(),
      );
    }
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  // Run migrations before any plugin or route registration
  runMigrations();

  const app = Fastify({ logger: true });

  // Security headers
  await app.register(helmetPlugin);

  // CORS — reads CORS_ORIGIN from env, falls back to local dev origin
  await app.register(corsPlugin, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  });

  // Global error handler — never exposes internal details to the client
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

  // Todo CRUD routes
  await app.register(todosRoutes);

  return app;
}
