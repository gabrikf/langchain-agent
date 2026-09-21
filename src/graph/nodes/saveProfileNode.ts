import type { Runtime } from '@langchain/langgraph';
import type { GraphState } from '../graph.ts';
import { StudentProfileService } from '../../services/studentProfileService.ts';

export function createSaveProfileNode(profileService: StudentProfileService) {
  return async (state: GraphState, runtime?: Runtime): Promise<Partial<GraphState>> => {
    if(!state.extractedProfile) return {}

    const userId = String(runtime?.context?.userId || state.userId || 'unknown')
    await profileService.mergeProfile(userId, state.extractedProfile)


    return {
      extractedProfile: undefined
    };
  };
}
