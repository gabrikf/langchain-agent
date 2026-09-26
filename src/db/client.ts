import knex, { type Knex } from 'knex';
import { config } from '../config.ts';

let db: Knex | null = null;

export function getDb(): Knex {
  if (!db) {
    db = knex({
      client: 'pg',
      connection: config.memory.dbUri,
      pool: { min: 0, max: 10 },
    });
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}
