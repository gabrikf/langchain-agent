import type { GraphState } from '../graph.ts';

export const routeAfterChat = (state: GraphState): string =>
  state.extractedProfile ? 'saveProfile' :
  state.needsSummarization ? 'summarize' : 'end';

export const routeAfterSaveProfile = (state: GraphState): string =>
  state.needsSummarization ? 'summarize' : 'end';
