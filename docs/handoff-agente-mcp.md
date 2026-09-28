# Handoff: agente AFM (LangGraph) + novo MCP

Próximo chat: analisar o MCP atual e desenhar um MCP novo e melhor, alinhado com a arquitetura abaixo.
Projeto do agente: `langchain-agent` (TypeScript, LangGraph, `@langchain/mcp-adapters`, Postgres, OpenRouter).

## Modo de trabalho

**O agente implementa a estrutura. O conteúdo dos prompts e das skills eu escrevo à mão.**

O agente implementa:
- Os 5 nodes, o estado, as arestas e a correção dos problemas listados no fim deste documento.
- A mecânica das skills: leitura de `src/skills/*.md` com frontmatter, índice filtrado por `roles`, tool `load_skill` com validação do nome.
- O carregamento dos prompts a partir de `.md` e a montagem das seções (fixo, skills, contexto do operador).
- Cliente MCP por execução, `confirm` guiado pelas anotações das tools, servidor HTTP com SSE e validação do JWT.

O agente **não** entrega pronto para uso:
- Arquivos de system prompt (agente, extração de preferências, resumo) criados só com os títulos das seções e um `TODO`.
- Pasta `src/skills/` vazia. Skills de exemplo só em fixtures de teste.
- Os prompts atuais em `src/prompts/v1/` ficam como referência. Não migrar o conteúdo deles.

Ordem sugerida, cada etapa testável antes da próxima: MCP novo → grafo mínimo `agent ⇄ tools` com `state.messages` → carregamento de prompts em `.md` → `loadContext` → mecânica das skills → `confirm` → `postProcess` → servidor HTTP + SSE + JWT → token exchange → deploy.

## Decisões

- **Front → agente:** `POST /chat` com resposta SSE. Token OIDC do usuário no `Authorization: Bearer`. O front manda só a mensagem nova, o `thread_id` e o contexto da tela (ativo aberto, fuso).
- **Servidor próprio** (Hono/Fastify) na frente do grafo, com formato de eventos nosso: `token`, `tool_start`, `tool_end`, `confirmation_required`, `done`, heartbeat com `sequence_id`.
- **Agente → MCP:** OAuth 2.0 Token Exchange (RFC 8693). Token curto com `aud=afm-mcp`, `sub=usuário`, sempre no header `Authorization: Bearer`. Sem `SERVICE_TOKEN` fixo, sem repassar o token do usuário direto e sem token em query string ou argumento de tool.
- **Permissão é do back-end**, nunca do LLM. O MCP valida assinatura, `aud`, `exp` e scopes, e responde 401/403.
- **Deploy:** ECS Fargate + RDS Postgres (checkpointer) + Secrets Manager + ALB (idle timeout alto para SSE). Traces no LangSmith via env vars, mascarando dados sensíveis. AgentCore fica como alternativa de runtime.

## Grafo (5 nodes)

`START → loadContext → agent ⇄ tools (confirm antes de escrita) → postProcess → END`

| Node | LLM? | Responsabilidade |
|---|---|---|
| `loadContext` | não | Busca preferências e resumo frescos no Postgres, índice das skills, contexto da tela e token exchange |
| `agent` | sim | `model.bindTools(tools).invoke([system, ...state.messages])`; decide entre tool e resposta final |
| `confirm` | não | `interrupt()` antes de tools de escrita; `Command({ resume })` retoma; recusa volta ao `agent` |
| `tools` | não | Executa tools MCP (cliente criado por execução, com o token do usuário) e `load_skill` |
| `postProcess` | sim, modelo barato | Extrai preferências e resume se passar do limite de tokens (remove mensagens e resultados de tool antigos) |

Toda mensagem roda do `START` ao `END`. O checkpointer (thread) mantém o histórico. Exceção: o resume do `interrupt` continua do `confirm`.

## Skills

- `src/skills/<nome>.md` com frontmatter `name`, `description` e opcional `roles`, mais o passo a passo.
- O system prompt lista só nome e descrição (filtradas pelo papel do usuário). A tool `load_skill({ name })` devolve o conteúdo e valida o nome contra o índice (evita path traversal).
- Regra: passo obrigatório vira node/código; julgamento vira prompt ou skill.

```markdown
---
name: investigar-alarme-vibracao
description: Use quando relatarem alarme ou aumento de vibração em um ativo.
roles: [operator, reliability_engineer]
---
1. Identifique o ativo (contexto da tela ou pergunte).
2. get_events das últimas 24h; get_timeseries de vibração e temperatura (7 dias); get_thresholds.
3. Classifique: desbalanceamento, desalinhamento, folga ou lubrificação.
4. Responda com diagnóstico provável, urgência e próxima inspeção.
5. Ordem de serviço só com confirmação do usuário.
```

## Evolução: agentes especializados (fora do escopo agora)

- Primeiro recurso: skill no agente geral. Especialista só quando precisar de tools, permissões, modelo ou contexto diferentes.
- Especialista = subgrafo próprio (`agent ⇄ tools` com prompt e tools dele), chamado pelo agente geral como tool, devolvendo só o resultado resumido.
- Quando a intenção já é conhecida pela UI (ex.: botão "diagnosticar" num evento), o front manda `agent_id` e uma aresta condicional após o `loadContext` vai direto ao especialista, sem LLM classificando.
- **Já agora:** implementar o loop `agent ⇄ tools ⇄ confirm` como `buildAgentGraph(spec)` reutilizável (spec = nome, arquivo de prompt, modelo, filtro de tools, tools extras), compilado sem checkpointer. O grafo pai (`loadContext → geral → postProcess`) usa esse subgrafo como node. Adicionar especialistas depois vira criar uma spec, sem refatorar.

## System prompt (em .md versionado, não `JSON.stringify`)

Ordem: primeiro o que não muda (ajuda o prompt caching), depois o dinâmico.

```text
Persona e regras fixas (sempre chamar a tool antes de afirmar dados, nunca inventar)
## Skills disponíveis   → índice filtrado por papel + "chame load_skill se uma se aplicar"
## Contexto do operador → preferências, resumo anterior, tela atual
```

Depois do system prompt vão as mensagens reais do estado (`human`, `ai` com tool_calls, `tool`), nunca o histórico achatado em texto.

## O que o novo MCP precisa atender

- Validar o Bearer (JWKS, `aud=afm-mcp`, scopes) e chamar o back-end como o usuário.
- Tools com nome, descrição e schema claros (é pela descrição que o LLM escolhe).
- Anotações `readOnlyHint` / `destructiveHint` em cada tool, para o node `confirm` decidir o que pede aprovação.
- Respostas enxutas (filtradas e paginadas), sem despejar JSON gigante. Erros como resultado de tool com `isError`.
- Tools citadas no prompt atual: `get_events`, `mfm-whoami`, `get_timeseries`, `get_thresholds`, além de overview, ativos e auditoria.

## Problemas no código atual (corrigir na refatoração)

- `src/tools/afm-mcp.ts`: `SERVICE_TOKEN` fixo; `mcpService.ts` cria cliente global e dá `process.exit(1)` em erro.
- `chatNode.ts`: histórico achatado em string, mensagem atual duplicada, ToolMessage convertida em AIMessage, extração de preferências antes da resposta.
- `userContext` fica velho no estado do thread (só busca no banco se estiver vazio).
- `identifyIntent.ts` vazio e fora do grafo (não é necessário por enquanto).

## Skills sugeridas para o próximo chat

`grill-me` (fechar o desenho do MCP), `typescript-strict`, `tdd` / `testing-boss`, `no-workarounds`; MCP `context7` para a documentação do `@modelcontextprotocol/sdk` e do LangGraph.
