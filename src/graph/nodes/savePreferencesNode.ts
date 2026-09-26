import type { Runtime } from '@langchain/langgraph';
import type { GraphState } from '../graph.ts';
import { PreferenceService } from '../../services/preferenceService.ts';

export function createSavePreferencesNode(preferenceService: PreferenceService) {
  return async (state: GraphState, runtime?: Runtime): Promise<Partial<GraphState>> => {
    if (!state.extractedPreferences) return {};

    const userId = String(runtime?.context?.userId || state.userId || 'unknown');
    await preferenceService.mergePreferences(userId, state.extractedPreferences);

    return {
      extractedPreferences: undefined,
    };
  };
}
