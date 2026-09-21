import {
  StateGraph,
  START,
  END,
  MessagesZodMeta,
} from "@langchain/langgraph";
import { withLangGraph } from "@langchain/langgraph/zod";
import { z } from "zod/v3";

import type { BaseMessage } from '@langchain/core/messages';
import { OpenRouterService } from '../services/openrouterService.ts';
import { createChatNode } from './nodes/chatNode.ts';
import { createSummarizationNode } from './nodes/summarizationNode.ts';
import { createSaveProfileNode } from './nodes/saveProfileNode.ts';
import { routeAfterChat, routeAfterSaveProfile } from './nodes/edgeConditions.ts';
import { StudentProfileService } from "../services/studentProfileService.ts";
import { type MemoryService } from "../services/memoryService.ts";

const ChatStateAnnotation = z.object({
  messages: withLangGraph(
    z.custom<BaseMessage[]>(),
    MessagesZodMeta),
  userContext: z.string().optional(),
  extractedProfile: z.any().optional(),
  needsSummarization: z.boolean().optional(),
  conversationSummary: z.any().optional(),
  userId: z.string().optional(),
});

export type GraphState = z.infer<typeof ChatStateAnnotation>;

export function buildChatGraph(
  llmClient: OpenRouterService,
  profileService: StudentProfileService,
  memoryService: MemoryService,
) {
  const graph = new StateGraph(ChatStateAnnotation)
    .addNode('chat', createChatNode(llmClient, profileService))
    .addNode('saveProfile', createSaveProfileNode(profileService))
    .addNode('summarize', createSummarizationNode(llmClient, profileService))

    .addEdge(START, 'chat')

    .addConditionalEdges(
      'chat',
      routeAfterChat,
      {
        saveProfile: 'saveProfile',
        summarize: 'summarize',
        end: END,
      }
    )

    .addConditionalEdges(
      'saveProfile',
      routeAfterSaveProfile,
      {
        summarize: 'summarize',
        end: END,
      }
    )

    .addEdge('summarize', END);

  return graph.compile({
    checkpointer: memoryService.checkpointer,
    store: memoryService.store,
  });
}
