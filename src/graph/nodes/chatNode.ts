import type { Runtime } from "@langchain/langgraph";
import { OpenRouterService } from "../../services/openrouterService.ts";
import type { GraphState } from "../graph.ts";
import {
  PreferenceExtractionSchema,
  getSystemPrompt,
  getUserPromptTemplate,
  getPreferenceExtractionSystemPrompt,
  getPreferenceExtractionUserPrompt,
} from "../../prompts/v1/chatResponse.ts";
import { AIMessage, HumanMessage } from "langchain";
import { PreferenceService } from "../../services/preferenceService.ts";
import { config } from "../../config.ts";

export function createChatNode(
  llmClient: OpenRouterService,
  preferenceService: PreferenceService,
) {
  return async (
    state: GraphState,
    runtime?: Runtime,
  ): Promise<Partial<GraphState>> => {
    const userId = String(
      runtime?.context?.userId || state.userId || "unknown",
    );
    const userContext =
      state.userContext ?? (await preferenceService.getBasicInfo(userId));
    const systemPrompt = getSystemPrompt(userContext);

    const conversationHistory = state.messages
      .map(
        (msg) =>
          `${HumanMessage.isInstance(msg) ? "User" : "AI"}: ${msg.content}`,
      )
      .join("\n");

    const userMessage = state.messages.at(-1)?.text as string;
    const userPrompt = getUserPromptTemplate(userMessage, conversationHistory);

    // 1) Chat with MCP tools (no structured output — they conflict)
    const chatResult = await llmClient.chatWithTools(systemPrompt, userPrompt);

    if (!chatResult.success) {
      console.error("❌ Falha ao gerar resposta:", chatResult.error);
      return {
        messages: [
          new AIMessage("Desculpe, encontrei um erro. Pode tentar novamente?"),
        ],
      };
    }

    // 2) Preference extraction in a separate structured call (no tools)
    const prefsResult = await llmClient.generateStructured(
      getPreferenceExtractionSystemPrompt(),
      getPreferenceExtractionUserPrompt(userMessage),
      PreferenceExtractionSchema,
    );

    const extracted =
      prefsResult.success &&
      prefsResult.data?.shouldSavePreferences &&
      prefsResult.data.preferences
        ? prefsResult.data.preferences
        : undefined;

    const totalMessages = state.messages.length;
    const needsSummarization = totalMessages >= config.maxMessagesToSummary;

    return {
      // Prefer full tool trail for Studio; fall back to final text.
      messages:
        chatResult.messages.length > 0
          ? chatResult.messages.map((msg) => new AIMessage(msg.content)) //TODO: verificar se é necessário mapear para AIMessage
          : [new AIMessage(chatResult.content)],
      extractedPreferences: extracted,
      needsSummarization,
    };
  };
}
