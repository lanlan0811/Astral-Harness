import {
  DashScopeChatModel,
  DeepSeekChatModel,
  OllamaChatModel,
  OpenAIChatModel,
} from "@agentscope-ai/agentscope/model";
import type { ChatModelBase } from "@agentscope-ai/agentscope/model";
import type { ProviderConfig } from "./settings.js";

/**
 * Build the chat model from the user's provider config.
 *
 * 0.0.15 ships no Anthropic model at all, so Anthropic is reachable only through an
 * OpenAI-compatible proxy configured as `custom` — or by implementing `ChatModelBase`.
 */
export function createChatModel(config: ProviderConfig, apiKey: string): ChatModelBase {
  switch (config.providerId) {
    case "deepseek":
      return new DeepSeekChatModel({
        modelName: config.modelName,
        apiKey,
        stream: true,
        maxRetries: 2,
      });
    case "dashscope":
      return new DashScopeChatModel({
        modelName: config.modelName,
        apiKey,
        stream: true,
        maxRetries: 2,
      });
    case "ollama":
      return new OllamaChatModel({
        modelName: config.modelName,
        host: config.baseUrl ?? undefined,
        stream: true,
      });
    case "openai":
    case "custom":
      return new OpenAIChatModel({
        modelName: config.modelName,
        apiKey,
        baseURL: config.baseUrl ?? undefined,
        stream: true,
        maxRetries: 2,
      });
  }
}

/** Providers that authenticate with a key. Ollama is local and does not. */
export function providerNeedsApiKey(config: ProviderConfig): boolean {
  return config.providerId !== "ollama";
}
