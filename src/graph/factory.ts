import { OpenRouterService } from '../services/openrouterService.ts';
import { config } from '../config.ts';
import { buildChatGraph } from './graph.ts';
import { createMemoryService } from '../services/memoryService.ts';
import { StudentProfileService } from '../services/studentProfileService.ts';

export async function buildGraph(dbPath: string = './faculdade.db') {
  const llmClient = new OpenRouterService(config);

  const memoryService = await createMemoryService()
  const profileService = new StudentProfileService(dbPath)
  const graph = buildChatGraph(
    llmClient,
    profileService,
    memoryService
  );

  return {
    graph,
    profileService,
  };
}

export const graph = async () => buildGraph();
export default graph;
