import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DATABASE_PATH;
if (!dbPath) {
  throw new Error('DATABASE_PATH environment variable is required');
}

// Auto-create parent directory (handles /app/data/ in Docker), skip for :memory:
if (dbPath !== ':memory:') {
  const dbDir = path.dirname(dbPath);
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);
