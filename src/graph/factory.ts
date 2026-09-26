import { OpenRouterService } from '../services/openrouterService.ts';
import { config } from '../config.ts';
import { buildChatGraph } from './graph.ts';
import { createMemoryService } from '../services/memoryService.ts';
import { PreferenceService } from '../services/preferenceService.ts';

export async function buildGraph() {
  const llmClient = new OpenRouterService(config);
  const memoryService = await createMemoryService();
  const preferenceService = new PreferenceService();

  await preferenceService.setup();

  const graph = buildChatGraph(llmClient, preferenceService, memoryService);

  return {
    graph,
    preferenceService,
  };
}

export const graph = async () => buildGraph();
export default graph;
