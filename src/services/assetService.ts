import type { Knex } from 'knex';
import { getDb } from '../db/client.ts';
import { migrate } from '../db/migrate.ts';

export type Asset = {
  id?: number;
  externalId?: string;
  name: string;
  assetType?: string;
  location?: string;
  criticality?: string;
  status?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Thin registry for industrial assets.
 * Live vibration / temperature signals are expected from MCP tools later —
 * this table only holds identity and static metadata.
 */
export class AssetService {
  private db: Knex;
  private isSetup = false;

  constructor(db: Knex = getDb()) {
    this.db = db;
  }

  async setup(): Promise<void> {
    if (this.isSetup) return;
    await migrate(this.db);
    this.isSetup = true;
  }

  async upsert(asset: Asset): Promise<void> {
    await this.setup();

    const data = {
      external_id: asset.externalId || null,
      name: asset.name,
      asset_type: asset.assetType || null,
      location: asset.location || null,
      criticality: asset.criticality || null,
      status: asset.status || 'unknown',
      metadata: asset.metadata || {},
      updated_at: this.db.fn.now(),
    };

    if (asset.externalId) {
      await this.db('assets')
        .insert(data)
        .onConflict('external_id')
        .merge();
      return;
    }

    await this.db('assets').insert(data);
  }

  async list(limit = 50): Promise<Asset[]> {
    await this.setup();
    const rows = await this.db('assets').select('*').limit(limit);
    return rows.map(mapRow);
  }

  async findByName(name: string): Promise<Asset | null> {
    await this.setup();
    const row = await this.db('assets').whereILike('name', `%${name}%`).first();
    return row ? mapRow(row) : null;
  }
}

function mapRow(row: any): Asset {
  return {
    id: row.id,
    externalId: row.external_id || undefined,
    name: row.name,
    assetType: row.asset_type || undefined,
    location: row.location || undefined,
    criticality: row.criticality || undefined,
    status: row.status || undefined,
    metadata: row.metadata || {},
  };
}
