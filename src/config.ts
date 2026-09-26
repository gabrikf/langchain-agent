export type ModelConfig = {
  apiKey: string;
  httpReferer: string;
  xTitle: string;

  provider: {
    sort: {
      by: string;
      partition: string;
    };
  };

  models: string[];
  temperature: number;

  memory: {
    dbUri: string;
  };
  maxMessagesToSummary: number;
};

console.assert(process.env.OPENROUTER_API_KEY, 'OPENROUTER_API_KEY is not set in environment variables');
const model = process.env.MODEL || 'arcee-ai/trinity-large-preview:free';

export const config: ModelConfig = {
  apiKey: process.env.OPENROUTER_API_KEY!,
  httpReferer: process.env.OPENROUTER_HTTP_REFERER || '',
  xTitle: process.env.OPENROUTER_X_TITLE || 'Industrial Asset Agent',
  models: [model],
  provider: {
    sort: {
      by: 'throughput',
      partition: 'none',
    },
  },
  temperature: 0.4,
  memory: {
    dbUri:
      process.env.DATABASE_URL ||
      'postgresql://postgres:mysecretpassword@localhost:5432/industrial_assets',
  },
  maxMessagesToSummary: 6,
};
