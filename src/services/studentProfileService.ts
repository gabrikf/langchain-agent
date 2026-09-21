import pkg from 'knex';
const { knex } = pkg;
import type { Knex } from 'knex';
import type { ConversationSummary } from '../prompts/v1/summarization.ts';
import type { StudentProfile } from '../prompts/v1/chatResponse.ts';

export class StudentProfileService {
  private db: Knex;
  private isSetup = false;

  constructor(dbPath: string) {
    this.db = knex({
      client: 'better-sqlite3',
      connection: {
        filename: dbPath.replace('file:', ''),
      },
      useNullAsDefault: true,
    });
  }

  async setup(): Promise<void> {
    if (this.isSetup) return;

    const hasTable = await this.db.schema.hasTable('student_profiles');

    if (!hasTable) {
      await this.db.schema.createTable('student_profiles', (table) => {
        table.increments('id').primary();
        table.string('user_id').unique().notNullable();
        table.string('name');
        table.string('course');
        table.string('semester');
        table.json('subjects');
        table.json('technologies');
        table.json('projects');
        table.text('key_profile');
        table.text('important_context');
        table.timestamp('updated_at').defaultTo(this.db.fn.now());
      });
    }

    this.isSetup = true;
  }

  async mergeProfile(userId: string, profile: StudentProfile): Promise<void> {
    await this.setup();

    const existing = await this.getSummary(userId);

    const mergedSubjects = profile.subjects?.length
      ? [...new Set([...(existing?.subjects || []), ...profile.subjects])]
      : existing?.subjects;

    const mergedTechnologies = profile.technologies?.length
      ? [...new Set([...(existing?.technologies || []), ...profile.technologies])]
      : existing?.technologies;

    const mergedProjects = profile.projects?.length
      ? [...new Set([...(existing?.projects || []), ...profile.projects])]
      : existing?.projects;

    const contextParts = [
      existing?.importantContext,
      profile.difficulties && `Dificuldades: ${profile.difficulties}`,
      profile.additionalInfo
    ].filter(Boolean);

    const data = {
      user_id: userId,
      name: profile.name || existing?.name || null,
      course: profile.course || existing?.course || null,
      semester: profile.semester || existing?.semester || null,
      subjects: mergedSubjects ? JSON.stringify(mergedSubjects) : null,
      technologies: mergedTechnologies ? JSON.stringify(mergedTechnologies) : null,
      projects: mergedProjects ? JSON.stringify(mergedProjects) : null,
      key_profile: existing?.keyProfile || null,
      important_context: contextParts.length > 0 ? contextParts.join('. ') : null,
      updated_at: this.db.fn.now(),
    };

    await this.db('student_profiles')
      .insert(data)
      .onConflict('user_id')
      .merge();
  }

  async storeSummary(userId: string, summary: ConversationSummary): Promise<void> {
    await this.setup();

    const data = {
      user_id: userId,
      name: summary.name || null,
      course: summary.course || null,
      semester: summary.semester || null,
      subjects: summary.subjects ? JSON.stringify(summary.subjects) : null,
      technologies: summary.technologies ? JSON.stringify(summary.technologies) : null,
      projects: summary.projects ? JSON.stringify(summary.projects) : null,
      key_profile: summary.keyProfile,
      important_context: summary.importantContext || null,
      updated_at: this.db.fn.now(),
    };

    await this.db('student_profiles')
      .insert(data)
      .onConflict('user_id')
      .merge();
  }

  async getSummary(userId: string): Promise<ConversationSummary | null> {
    await this.setup();

    const row = await this.db('student_profiles')
      .where({ user_id: userId })
      .first();

    if (!row) return null;

    return {
      name: row.name || undefined,
      course: row.course || undefined,
      semester: row.semester || undefined,
      subjects: row.subjects ? JSON.parse(row.subjects) : undefined,
      technologies: row.technologies ? JSON.parse(row.technologies) : undefined,
      projects: row.projects ? JSON.parse(row.projects) : undefined,
      keyProfile: row.key_profile,
      importantContext: row.important_context || undefined,
    };
  }

  async getBasicInfo(userId: string): Promise<string | undefined> {
    const summary = await this.getSummary(userId);
    if (!summary) return undefined;

    const parts: string[] = [];

    if (summary.name) parts.push(`Nome: ${summary.name}`);
    if (summary.course) parts.push(`Curso: ${summary.course}`);
    if (summary.semester) parts.push(`Semestre: ${summary.semester}`);
    if (summary.subjects?.length) {
      parts.push(`Matérias: ${summary.subjects.join(', ')}`);
    }
    if (summary.technologies?.length) {
      parts.push(`Tecnologias: ${summary.technologies.join(', ')}`);
    }
    if (summary.projects?.length) {
      parts.push(`Projetos: ${summary.projects.join(', ')}`);
    }
    if (summary.keyProfile) {
      parts.push(`\nPerfil acadêmico: ${summary.keyProfile}`);
    }

    return parts.length > 0 ? parts.join('\n') : undefined;
  }

  async close(): Promise<void> {
    await this.db.destroy();
  }
}
