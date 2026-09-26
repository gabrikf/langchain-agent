import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { HumanMessage } from '@langchain/core/messages';
import { buildGraph } from '../src/graph/factory.ts';

describe('Industrial Asset Agent - smoke', () => {
  let graph: any;
  let preferenceService: any;

  before(async () => {
    const built = await buildGraph();
    graph = built.graph;
    preferenceService = built.preferenceService;
  });

  after(async () => {
    await preferenceService.close();
  });

  it('builds the graph and responds to a greeting', async () => {
    const userId = `test-operator-${Date.now()}`;
    const config = {
      configurable: { thread_id: `${userId}-thread` },
      context: { userId },
    };

    const response = await graph.invoke(
      {
        messages: [new HumanMessage('Olá!')],
        userId,
      },
      config,
    );

    assert.ok(response.messages.length > 0, 'should return messages');
    assert.equal(response.messages.at(-1)._getType(), 'ai');
  });
});
