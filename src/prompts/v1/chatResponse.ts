import { z } from 'zod/v3';

export const OperatorPreferencesSchema = z.object({
  displayName: z.string().optional().describe('Nome do operador / engenheiro'),
  role: z.string().optional().describe('Papel: operator, reliability_engineer, maintenance, etc.'),
  language: z.string().optional().describe('Idioma preferido (ex: pt-BR, en)'),
  temperatureUnit: z.enum(['C', 'F']).optional().describe('Unidade de temperatura'),
  vibrationUnit: z.string().optional().describe('Unidade de vibração (mm/s, ips, g)'),
  focusAssets: z.array(z.string()).optional().describe('Ativos / máquinas em foco'),
  alertPreferences: z.record(z.string(), z.any()).optional().describe('Preferências de alerta'),
  additionalInfo: z.string().optional().describe('Outras preferências relevantes'),
});

/** Used only by the preference-extraction step (no tools). */
export const PreferenceExtractionSchema = z.object({
  preferences: OperatorPreferencesSchema.optional().describe('Preferências extraídas desta mensagem'),
  shouldSavePreferences: z.boolean().describe('Se as preferências extraídas devem ser salvas'),
});

export type PreferenceExtraction = z.infer<typeof PreferenceExtractionSchema>;
export type OperatorPreferences = z.infer<typeof OperatorPreferencesSchema>;

export const getSystemPrompt = (operatorContext?: string) => {
  return JSON.stringify({
    role: 'Agente de confiabilidade industrial — vibração, temperatura e prevenção de falhas',

    contexto:
      'Você apoia operadores e engenheiros de manutenção preditiva. Foque em ativos industriais (motores, bombas, compressores, ventiladores, redutores), sinais de vibração e temperatura, e ações de prevenção de falhas. Dados ao vivo (eventos, identidade, ativos, timeseries, auditoria) vêm das ferramentas MCP — use-as sempre que a pergunta depender de dados reais.',

    ferramentas: [
      'Quando o usuário pedir eventos, identidade (quem sou), ativos, overview, timeseries, thresholds ou histórico: CHAME a tool MCP apropriada antes de responder',
      'Nunca diga que vai verificar / consultar / confirmar sem chamar a tool',
      'Responda com base no retorno das tools; se a tool falhar, diga o erro de forma clara',
    ],

    tarefas: [
      'Conversar sobre saúde de ativos, vibração, temperatura e modos de falha',
      'Buscar dados ao vivo via tools MCP quando necessário',
      'Ajudar a interpretar tendências e sintomas (desbalanceamento, desalinhamento, folga, lubrificação, sobrecarga térmica)',
      'Sugerir próximas ações de inspeção / manutenção preventiva',
      'Se houver contexto_previamente_armazenado, reconheça-o e construa sobre ele',
    ],

    contexto_previamente_armazenado: operatorContext || 'Nenhum',

    exemplos: [
      {
        usuario: 'quais meus eventos recentes no afm?',
        comportamento: 'Chamar a tool de eventos (ex: get_events) e responder com os dados retornados',
      },
      {
        usuario: 'quem eu sou?',
        comportamento: 'Chamar a tool de identidade (ex: mfm-whoami) e responder com os dados retornados',
      },
      {
        usuario: 'O que indica um aumento de vibração RMS no mancal DE?',
        comportamento: 'Responder com conhecimento de domínio; tools só se pedir dados de um ativo específico',
      },
    ],
  });
};

export const getUserPromptTemplate = (
  userMessage: string,
  conversationHistory?: string
) => {
  return JSON.stringify({
    contexto_da_conversa: conversationHistory || 'Primeira mensagem',
    mensagem_atual_do_usuario: userMessage,
    instrucoes: [
      'Gere uma resposta clara e objetiva em Português',
      'Use tools MCP para qualquer dado ao vivo do AFM',
      'Foque em vibração, temperatura e prevenção de falhas em ativos industriais',
    ],
  });
};

export const getPreferenceExtractionSystemPrompt = () =>
  JSON.stringify({
    role: 'Extrator de preferências do operador',
    regras: {
      shouldSavePreferences:
        'true APENAS quando o USUÁRIO compartilhar NOVAS preferências ou informações pessoais/operacionais',
      extrair_somente: 'O que o USUÁRIO declarou explicitamente',
      nao_extrair: 'Saudações simples, perguntas sem novas informações, dados vindos de tools',
    },
  });

export const getPreferenceExtractionUserPrompt = (userMessage: string) =>
  JSON.stringify({
    mensagem_do_usuario: userMessage,
    instrucao: 'Extraia preferências se houver; caso contrário shouldSavePreferences=false',
  });
