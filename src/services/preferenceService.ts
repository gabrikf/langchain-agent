import type { Knex } from 'knex';
import { getDb } from '../db/client.ts';
import { migrate } from '../db/migrate.ts';
import type { ConversationSummary } from '../prompts/v1/summarization.ts';
import type { OperatorPreferences } from '../prompts/v1/chatResponse.ts';

export class PreferenceService {
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

  async mergePreferences(userId: string, prefs: OperatorPreferences): Promise<void> {
    await this.setup();

    const existing = await this.getPreferences(userId);

    const mergedFocus = prefs.focusAssets?.length
      ? [...new Set([...(existing?.focus_asset_ids || []), ...prefs.focusAssets])]
      : existing?.focus_asset_ids;

    const data = {
      user_id: userId,
      display_name: prefs.displayName || existing?.display_name || null,
      role: prefs.role || existing?.role || null,
      language: prefs.language || existing?.language || 'pt-BR',
      temperature_unit: prefs.temperatureUnit || existing?.temperature_unit || 'C',
      vibration_unit: prefs.vibrationUnit || existing?.vibration_unit || 'mm/s',
      focus_asset_ids: mergedFocus || [],
      alert_preferences: {
        ...(existing?.alert_preferences || {}),
        ...(prefs.alertPreferences || {}),
      },
      updated_at: this.db.fn.now(),
    };

    await this.db('user_preferences')
      .insert(data)
      .onConflict('user_id')
      .merge();
  }

  async getPreferences(userId: string): Promise<Record<string, any> | null> {
    await this.setup();
    return (await this.db('user_preferences').where({ user_id: userId }).first()) ?? null;
  }

  async storeSummary(userId: string, summary: ConversationSummary): Promise<void> {
    await this.setup();

    const data = {
      user_id: userId,
      display_name: summary.displayName || null,
      role: summary.role || null,
      assets_discussed: summary.assetsDiscussed || [],
      failure_modes: summary.failureModes || [],
      open_actions: summary.openActions || [],
      key_profile: summary.keyProfile,
      important_context: summary.importantContext || null,
      updated_at: this.db.fn.now(),
    };

    await this.db('conversation_summaries')
      .insert(data)
      .onConflict('user_id')
      .merge();
  }

  async getSummary(userId: string): Promise<ConversationSummary | null> {
    await this.setup();

    const row = await this.db('conversation_summaries')
      .where({ user_id: userId })
      .first();

    if (!row) return null;

    return {
      displayName: row.display_name || undefined,
      role: row.role || undefined,
      assetsDiscussed: row.assets_discussed || undefined,
      failureModes: row.failure_modes || undefined,
      openActions: row.open_actions || undefined,
      keyProfile: row.key_profile,
      importantContext: row.important_context || undefined,
    };
  }

  async getBasicInfo(userId: string): Promise<string | undefined> {
    const [prefs, summary] = await Promise.all([
      this.getPreferences(userId),
      this.getSummary(userId),
    ]);

    if (!prefs && !summary) return undefined;

    const parts: string[] = [];

    if (prefs?.display_name || summary?.displayName) {
      parts.push(`Operador: ${prefs?.display_name || summary?.displayName}`);
    }
    if (prefs?.role || summary?.role) {
      parts.push(`Papel: ${prefs?.role || summary?.role}`);
    }
    if (prefs?.temperature_unit) {
      parts.push(`Unidade de temperatura: °${prefs.temperature_unit}`);
    }
    if (prefs?.vibration_unit) {
      parts.push(`Unidade de vibração: ${prefs.vibration_unit}`);
    }
    if (prefs?.focus_asset_ids?.length) {
      parts.push(`Ativos em foco: ${JSON.stringify(prefs.focus_asset_ids)}`);
    }
    if (summary?.assetsDiscussed?.length) {
      parts.push(`Ativos discutidos: ${summary.assetsDiscussed.join(', ')}`);
    }
    if (summary?.failureModes?.length) {
      parts.push(`Modos de falha: ${summary.failureModes.join(', ')}`);
    }
    if (summary?.openActions?.length) {
      parts.push(`Ações abertas: ${summary.openActions.join(', ')}`);
    }
    if (summary?.keyProfile) {
      parts.push(`\nContexto: ${summary.keyProfile}`);
    }

    return parts.length > 0 ? parts.join('\n') : undefined;
  }

  async close(): Promise<void> {
    // shared pool — closed by closeDb() at process exit if needed
  }
}
