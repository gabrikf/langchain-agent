import { z } from 'zod/v3';

export const SummarySchema = z.object({
  displayName: z.string().optional().describe('Nome do operador'),
  role: z.string().optional().describe('Papel do usuário'),
  assetsDiscussed: z.array(z.string()).optional().describe('Ativos / máquinas discutidos'),
  failureModes: z.array(z.string()).optional().describe('Modos de falha ou sintomas mencionados'),
  openActions: z.array(z.string()).optional().describe('Ações / inspeções pendentes'),
  keyProfile: z.string().describe('Sumário conciso do contexto operacional e prioridades'),
  importantContext: z.string().optional().describe('Qualquer outro contexto importante'),
});

export type ConversationSummary = z.infer<typeof SummarySchema>;

export const getSummarizationSystemPrompt = () => {
  return JSON.stringify({
    role: 'Sumarizador de conversas de manutenção preditiva / confiabilidade industrial',

    tarefa: 'Analisar a conversa e extrair um perfil operacional estruturado',

    campos_para_extrair: {
      displayName: 'Nome do operador',
      role: 'Papel (operator, reliability_engineer, maintenance...)',
      assetsDiscussed: 'Ativos/máquinas mencionados',
      failureModes: 'Modos de falha / sintomas (vibração alta, overheating, etc.)',
      openActions: 'Próximas ações sugeridas ou aceitas',
      keyProfile: 'Sumário de 2-4 frases do contexto operacional',
      importantContext: 'Outros detalhes relevantes',
    },

    regras: [
      'Combinar informações duplicadas',
      'Ser específico sobre ativos e sintomas',
      'Se atualizando sumário anterior, preservar info não discutida na nova conversa',
      'Incluir apenas informações explicitamente declaradas ou acordadas na conversa',
    ],
  });
};

export const getSummarizationUserPrompt = (
  conversationHistory: Array<{ role: string; content: string }>,
  previousSummary?: ConversationSummary
) => {
  return JSON.stringify({
    conversa: conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n'),
    sumario_anterior: previousSummary || 'Nenhum',
    instrucoes: [
      'Atualizar sumário com novas informações desta conversa',
      'Preservar info existente não discutida nas novas mensagens',
    ],
  });
};
