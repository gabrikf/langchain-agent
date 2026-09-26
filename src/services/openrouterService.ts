import { ChatOpenAI } from "@langchain/openai";
import { config, type ModelConfig } from "../config.ts";
import { SystemMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import type { z } from "zod/v3";
import { createAgent, providerStrategy } from "langchain";
import { getMCPTools } from "./mcpService.ts";

export type LLMResponse = {
  model: string;
  content: string;
};

export type ChatWithToolsResult = {
  success: true;
  content: string;
  /** New AI / tool messages produced by the agent (for graph + Studio). */
  messages: BaseMessage[];
} | {
  success: false;
  error: string;
};

export class OpenRouterService {
  private llmClient: ChatOpenAI;
  private config: ModelConfig;
  private tools: Awaited<ReturnType<typeof getMCPTools>> | null = null;

  constructor(configOverride?: ModelConfig) {
    this.config = configOverride ?? config;
    this.llmClient = new ChatOpenAI({
      apiKey: this.config.apiKey,
      modelName: this.config.models[0],
      temperature: this.config.temperature,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": this.config.httpReferer,
          "X-Title": this.config.xTitle,
        },
      },

      modelKwargs: {
        models: this.config.models,
        provider: this.config.provider,
      },
    });
  }

  async #getTools() {
    if (!this.tools) {
      this.tools = await getMCPTools();
    }
    return this.tools;
  }

  /**
   * Chat agent with MCP tools. Do NOT use responseFormat here —
   * structured JSON and tool_calls cannot share the same completion.
   */
  async chatWithTools(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<ChatWithToolsResult> {
    try {
      const tools = await this.#getTools();
      const agent = createAgent({
        model: this.llmClient,
        tools,
      });

      const inputMessages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ];

      const data = await agent.invoke({ messages: inputMessages });
      const all = data.messages ?? [];
      // Drop the system + human we injected; keep tool trail + final AI.
      const produced = all.slice(inputMessages.length);
      const last = produced.at(-1);
      const content =
        typeof last?.content === "string"
          ? last.content
          : Array.isArray(last?.content)
            ? last.content
                .map((part) =>
                  typeof part === "string"
                    ? part
                    : "text" in part
                      ? String(part.text ?? "")
                      : "",
                )
                .join("")
            : String(last?.content ?? "");

      return {
        success: true,
        content,
        messages: produced,
      };
    } catch (error) {
      console.error("🔴 LLM Error (chatWithTools):", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Structured extraction only — no tools.
   * Used for preference extraction and summarization.
   */
  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodSchema<T>,
  ) {
    try {
      const agent = createAgent({
        model: this.llmClient,
        tools: [],
        responseFormat: providerStrategy(schema),
      });

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ];

      const data = await agent.invoke({ messages });

      return {
        success: true,
        data: data.structuredResponse as T,
      };
    } catch (error) {
      console.error("🔴 LLM Error (generateStructured):", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
