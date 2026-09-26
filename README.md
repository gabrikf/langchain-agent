# Industrial Asset Agent

LangGraph agent base for **industrial assets** — vibration, temperature, and failure prevention.

Empty scaffolding ready for MCP tools that will expose live machine signals. PostgreSQL holds preferences, conversation summaries, and an asset registry.

## Architecture

```
src/
  ├── config.ts
  ├── index.ts                         # CLI chat
  ├── db/
  │   ├── client.ts                    # Knex + Postgres
  │   └── migrate.ts                   # Schema: prefs, summaries, assets
  ├── graph/
  │   ├── graph.ts                     # chat -> savePreferences -> summarize
  │   ├── factory.ts
  │   └── nodes/
  ├── prompts/v1/
  │   ├── chatResponse.ts              # Industrial reliability prompts
  │   └── summarization.ts
  ├── services/
  │   ├── memoryService.ts             # LangGraph checkpoint/store (Postgres)
  │   ├── openrouterService.ts
  │   ├── preferenceService.ts         # user_preferences + conversation_summaries
  │   └── assetService.ts              # assets registry (static metadata)
langgraph.json
tests/
```

## Postgres tables

| Table | Purpose |
|-------|---------|
| `user_preferences` | Operator prefs (units, language, focus assets, alerts) |
| `conversation_summaries` | Long-term chat memory for the agent |
| `assets` | Machine/equipment identity + static metadata |

Live vibration / temperature time-series are **not** stored here — attach an MCP later for that.

## Setup

```bash
cp .env.example .env   # set OPENROUTER_API_KEY
npm install
npm run docker:up
npm run db:migrate
npm run chat
# or:
npm run chat:operator
npm run langgraph:serve
```

## Next steps

- Wire MCP tools for vibration / temperature / asset lookups
- Seed `assets` from CMMS / historian IDs (`external_id`)
- Add alerting rules on top of `alert_preferences`
