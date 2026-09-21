import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { HumanMessage } from '@langchain/core/messages';
import { buildGraph } from '../src/graph/factory.ts';
import { unlinkSync, existsSync } from 'node:fs';

describe('Monitor de Estudos da Faculdade (2022) - Testes E2E', () => {
  let graph: any;
  let profileService: any;
  const testDbPath = './test-faculdade.db';

  before(async () => {
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }

    const built = await buildGraph(testDbPath);
    graph = built.graph;
    profileService = built.profileService;
  });

  after(async () => {
    await profileService.close();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  // it('Deve extrair e salvar o perfil acadêmico do aluno', async () => {
  //   const userId = 'test-gabriel';
  //   const threadId = `${userId}-${Date.now()}`;
  //   const config = {
  //     configurable: { thread_id: threadId },
  //     context: { userId }
  //   };

  //   const response = await graph.invoke(
  //     {
  //       messages: [new HumanMessage('Oi! Sou o Gabriel, faço ADS e em 2022 tô no 4º semestre. Tô apanhando de C#')],
  //       userId,
  //     },
  //     config
  //   );

  //   assert.ok(response.messages.length > 0, 'Deve ter mensagens de resposta');

  //   const lastMessage = response.messages.at(-1);
  //   assert.equal(lastMessage._getType(), 'ai', 'Última mensagem deve ser da IA');

  //   await new Promise(resolve => setTimeout(resolve, 500));

  //   const savedProfile = await profileService.getSummary(userId);

  //   assert.ok(savedProfile, 'Perfil deve estar salvo');
  //   assert.ok(savedProfile.name?.toLowerCase().includes('gabriel'), 'Nome deve estar salvo');
  //   assert.ok(savedProfile.semester?.includes('4'), 'Semestre deve estar salvo');
  // });

  // it('Deve manter múltiplas trocas e fazer sumarização', async () => {
  //   const userId = 'test-sarah';
  //   const threadId = `${userId}-${Date.now()}`;
  //   const config = {
  //     configurable: { thread_id: threadId },
  //     context: { userId }
  //   };

  //   await graph.invoke(
  //     { messages: [new HumanMessage('Oi! Sou a Sarah e estudo Engenharia de Software, gosto muito de Node.js')], userId },
  //     config
  //   );

  //   await graph.invoke(
  //     { messages: [new HumanMessage('Minha matéria mais difícil é Banco de Dados')], userId },
  //     config
  //   );

  //   await new Promise(resolve => setTimeout(resolve, 500));

  //   const savedProfile = await profileService.getSummary(userId);

  //   assert.ok(savedProfile, 'Perfil deve existir');
  //   assert.ok(savedProfile.name?.toLowerCase().includes('sarah'), 'Nome deve estar salvo');
  //   assert.ok(
  //     savedProfile.technologies?.some((t: string) => t.toLowerCase().includes('node')),
  //     'Tecnologias devem estar salvas'
  //   );
  // });

  // it('Deve recuperar o perfil em uma nova sessão', async () => {
  //   const userId = 'test-marcus';
  //   const config = {
  //     configurable: { thread_id: `${userId}-${Date.now()}` },
  //     context: { userId }
  //   };

  //   await graph.invoke(
  //     { messages: [new HumanMessage('Meu nome é Marcus, curso Sistemas de Informação e faço projetos em C# com .NET')], userId },
  //     config
  //   );

  //   await new Promise(resolve => setTimeout(resolve, 500));

  //   const savedProfile = await profileService.getSummary(userId);

  //   assert.ok(savedProfile, 'Deve recuperar informações básicas');
  //   assert.ok(savedProfile.name?.includes('Marcus'), 'Deve incluir nome');
  //   assert.ok(savedProfile.course?.toLowerCase().includes('sistemas'), 'Deve incluir curso');
  //   assert.ok(
  //     savedProfile.technologies?.some((t: string) => t.toLowerCase().includes('c#')),
  //     'Deve incluir tecnologias'
  //   );
  // });

  // it('Deve responder dúvidas técnicas sem extrair perfil', async () => {
  //   const userId = 'test-anonymous';
  //   const config = {
  //     configurable: { thread_id: `${userId}-${Date.now()}` },
  //     context: { userId }
  //   };

  //   const response = await graph.invoke(
  //     { messages: [new HumanMessage('Qual a diferença entre classes abstratas e interfaces em C#?')], userId },
  //     config
  //   );

  //   assert.ok(response.messages.length > 0, 'Deve ter resposta');
  // });

  it('Deve manter histórico da conversa', async () => {
    const userId = 'test-taylor';
    const threadId = `${userId}-${Date.now()}`;
    const config = {
      configurable: { thread_id: threadId },
      context: { userId }
    };

    await graph.invoke(
      {
        messages: [
          new HumanMessage('Oi, sou Taylor e estudo na faculdade'),
          new HumanMessage('Sou o Erick!'),
          new HumanMessage('Estou no 5º semestre'),
          new HumanMessage('Gosto de programar em C#'),
          new HumanMessage('Pode me ajudar com a matéria de POO?'),
          new HumanMessage('Pode me ajudar com a matéria de POO?'),
          new HumanMessage('Pode me ajudar com a matéria de POO?'),
        ],
        userId,
      },
      config
    );

  });

});
