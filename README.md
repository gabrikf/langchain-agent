# 🎓 Monitor de Estudos da Faculdade (turma de 2022)

Chat com memória construído com **LangGraph** que funciona como um monitor de estudos para um aluno da faculdade (turma de 2022), com foco no conteúdo de um curso que envolve **Node.js** e **C#**.

O agente conversa sobre matérias, projetos e dúvidas técnicas, e **lembra do aluno** entre sessões (nome, curso, semestre, disciplinas, tecnologias, projetos e dificuldades).

## Arquitetura

```
src/
  ├── config.ts                          # Configuração (modelo, memória, sumarização)
  ├── index.ts                           # Interface de chat no terminal
  ├── graph/
  │   ├── graph.ts                       # StateGraph: chat -> saveProfile -> summarize
  │   ├── factory.ts                     # Monta o grafo com os serviços
  │   └── nodes/
  │       ├── chatNode.ts                # Gera a resposta + extrai o perfil do aluno
  │       ├── saveProfileNode.ts         # Persiste o perfil extraído (SQLite/Knex)
  │       ├── summarizationNode.ts       # Sumariza a conversa e atualiza o perfil
  │       └── edgeConditions.ts          # Roteamento condicional do grafo
  ├── prompts/v1/
  │   ├── chatResponse.ts                # Prompt do monitor + schema do perfil (Zod)
  │   └── summarization.ts               # Prompt/schema de sumarização
  ├── services/
  │   ├── memoryService.ts               # Checkpointer + Store (PostgreSQL)
  │   ├── openrouterService.ts           # Cliente LLM via OpenRouter (saída estruturada)
  │   └── studentProfileService.ts       # Perfil acadêmico persistido (SQLite/Knex)
langgraph.json                           # Registro do grafo no LangGraph CLI/Studio
tests/
  └── chat.e2e.test.ts                   # Testes de integração (LLM real)
```

## Como a memória funciona

Este projeto demonstra **três formas complementares de memória**:

### 1. Memória de conversa (checkpointer)

- **Thread ID**: cada conversa tem um `thread_id` próprio, isolando o histórico
- **Persistência**: mensagens gravadas no PostgreSQL via `PostgresSaver`
- **Replay automático**: ao invocar com o mesmo `thread_id`, o histórico anterior volta ao contexto

### 2. Perfil acadêmico do aluno (store + SQLite)

- O `chatNode` extrai dados do aluno (nome, curso, semestre, matérias, tecnologias, projetos, dificuldades) a cada mensagem
- O `saveProfileNode` faz merge no perfil já existente, sem sobrescrever o que já se sabe
- O `summarizationNode` consolida a conversa em um `keyProfile` e preserva o contexto antigo

### 3. Sumarização (contexto de longo prazo)

- A cada N mensagens (`maxMessagesToSummary`), a conversa é resumida
- O resumo é salvo no perfil e as mensagens antigas são removidas do estado, mantendo só as 2 últimas
- O aluno continua reconhecido mesmo com o histórico enxuto

## Setup

1. **Suba o PostgreSQL** (memória de conversa):

   ```bash
   npm run docker:up
   ```

2. **Instale as dependências**:

   ```bash
   npm install
   ```

3. **Configure o ambiente** (`.env`):

   ```bash
   OPENROUTER_API_KEY=your_openrouter_key_here
   OPENROUTER_HTTP_REFERER=http://localhost:3000
   OPENROUTER_X_TITLE=Faculdade-2022-Assistant
   MODEL=arcee-ai/trinity-large-preview:free   # opcional
   ```

4. **Rode o chat**:

   ```bash
   npm run chat
   # ou, passando um usuário específico:
   npm run chat:aluno
   ```

5. **LangGraph Studio / API**:

   ```bash
   npm run langgraph:serve
   # API: http://localhost:2024
   ```

## Testes

```bash
npm test
```

Os testes de integração usam o LLM real (via OpenRouter), então exigem uma `OPENROUTER_API_KEY` válida.

## Exemplo de uso

```typescript
// Primeira mensagem
await graph.invoke(
  { messages: [new HumanMessage("Oi! Sou o Gabriel, faço ADS e tô no 4º semestre")] },
  { configurable: { thread_id: "aluno-123" }, context: { userId: "aluno-123" } },
);

// Segunda mensagem — o agente lembra de quem é o aluno e do curso dele
await graph.invoke(
  { messages: [new HumanMessage("Me ajuda com a matéria de POO?")] },
  { configurable: { thread_id: "aluno-123" }, context: { userId: "aluno-123" } },
);
```

> **Nota:** o C# é **tópico de domínio** (conteúdo das matérias e das conversas). A implementação do agente é 100% Node.js/TypeScript.

## Troubleshooting

- **`Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@langchain/core'`** ao rodar `npx @langchain/langgraph-cli`: o `.npmrc` usa `legacy-peer-deps=true`, o que impede o npm de instalar peer dependencies do CLI no cache do `npx`. A CLI está instalada localmente como devDependency — use `npm run langgraph:serve` (binário `langgraphjs`).
- **Banco `faculdade_2022` não existe**: se o volume do Postgres já existia com outro nome de banco, remova o volume (`npm run docker:down && rm -rf dbdata && npm run docker:up`) para o `POSTGRES_DB` ser recriado.
