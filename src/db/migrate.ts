import type { Knex } from 'knex';
import { getDb, closeDb } from './client.ts';

/**
 * Base schema for an industrial asset agent.
 *
 * - user_preferences: operator prefs (units, language, focus assets)
 * - conversation_summaries: long-term chat memory for the agent
 * - assets: machine/equipment registry (MCP will supply live signals later)
 *
 * Vibration / temperature time-series are intentionally NOT stored here —
 * those come from external systems via MCP tools.
 */
export async function migrate(db: Knex = getDb()): Promise<void> {
  if (!(await db.schema.hasTable('user_preferences'))) {
    await db.schema.createTable('user_preferences', (table) => {
      table.increments('id').primary();
      table.string('user_id').unique().notNullable();
      table.string('display_name');
      table.string('role'); // e.g. operator, reliability_engineer, maintenance
      table.string('language').defaultTo('pt-BR');
      table.string('temperature_unit').defaultTo('C'); // C | F
      table.string('vibration_unit').defaultTo('mm/s'); // mm/s | ips | g
      table.jsonb('focus_asset_ids').defaultTo('[]');
      table.jsonb('alert_preferences').defaultTo('{}');
      table.timestamps(true, true);
    });
  }

  if (!(await db.schema.hasTable('conversation_summaries'))) {
    await db.schema.createTable('conversation_summaries', (table) => {
      table.increments('id').primary();
      table.string('user_id').unique().notNullable();
      table.string('display_name');
      table.string('role');
      table.jsonb('assets_discussed').defaultTo('[]');
      table.jsonb('failure_modes').defaultTo('[]');
      table.jsonb('open_actions').defaultTo('[]');
      table.text('key_profile');
      table.text('important_context');
      table.timestamps(true, true);
    });
  }

  if (!(await db.schema.hasTable('assets'))) {
    await db.schema.createTable('assets', (table) => {
      table.increments('id').primary();
      table.string('external_id').unique(); // id from MCP / CMMS / historian
      table.string('name').notNullable();
      table.string('asset_type'); // motor, pump, compressor, fan, gearbox...
      table.string('location');
      table.string('criticality'); // low | medium | high | critical
      table.string('status').defaultTo('unknown'); // healthy | watch | alarm | offline | unknown
      table.jsonb('metadata').defaultTo('{}');
      table.timestamps(true, true);
    });
  }

  console.log('✅ Schema ready: user_preferences, conversation_summaries, assets');
}

async function main(): Promise<void> {
  try {
    await migrate();
  } finally {
    await closeDb();
  }
}

const isDirectRun = process.argv[1]?.includes('migrate');
if (isDirectRun) {
  main().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
}
