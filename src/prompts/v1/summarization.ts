import { z } from 'zod/v3';

export const SummarySchema = z.object({
  name: z.string().optional().describe('Nome do aluno'),
  course: z.string().optional().describe('Curso/faculdade do aluno'),
  semester: z.string().optional().describe('Semestre ou período mencionado'),
  subjects: z.array(z.string()).optional().describe('Matérias/disciplinas mencionadas'),
  technologies: z.array(z.string()).optional().describe('Linguagens e tecnologias citadas (Node.js, C#, .NET...)'),
  projects: z.array(z.string()).optional().describe('Projetos acadêmicos mencionados'),
  keyProfile: z.string().describe('Sumário conciso do perfil acadêmico, interesses técnicos e dificuldades'),
  importantContext: z.string().optional().describe('Qualquer outro contexto importante sobre o aluno'),
});

export type ConversationSummary = z.infer<typeof SummarySchema>;

export const getSummarizationSystemPrompt = () => {
  return JSON.stringify({
    role: 'Sumarizador de conversa sobre a vida acadêmica do aluno (faculdade, turma de 2022, Node.js e C#)',

    tarefa: 'Analisar a conversa e extrair um perfil acadêmico estruturado do aluno',

    campos_para_extrair: {
      name: 'Nome do aluno',
      course: 'Curso/faculdade',
      semester: 'Semestre ou período',
      subjects: 'Todas as matérias/disciplinas mencionadas',
      technologies: 'Todas as linguagens e tecnologias mencionadas',
      projects: 'Todos os projetos acadêmicos mencionados',
      keyProfile: 'Sumário de 2-4 frases sobre o curso, interesses técnicos e dificuldades do aluno',
      importantContext: 'Outros detalhes relevantes'
    },

    regras: [
      'Combinar informações duplicadas',
      'Ser específico sobre matérias e tecnologias',
      'Incluir dificuldades e temas em que o aluno precisa de ajuda',
      'Se atualizando sumário anterior, preservar info não discutida na nova conversa',
      'Incluir apenas informações explicitamente declaradas pelo aluno'
    ]
  });
};

export const getSummarizationUserPrompt = (
  conversationHistory: Array<{ role: string; content: string }>,
  previousSummary?: ConversationSummary
) => {
  return JSON.stringify({
    conversa: conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n'),
    sumario_anterior: previousSummary || 'Nenhum',
    instrucoes: [
      'Atualizar sumário com novas informações desta conversa',
      'Preservar info existente não discutida nas novas mensagens'
    ]
  });
};
