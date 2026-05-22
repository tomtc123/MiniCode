import type { Config } from "../types.js";
import type { LLMProvider } from "./provider.js";
import { OpenAICompatibleProvider } from "./openai-provider.js";
import { AnthropicProvider } from "./anthropic-provider.js";
import { MockProvider } from "./mock-provider.js";

export function createProvider(config: Config): LLMProvider {
  switch (config.provider) {
    case "openai":
      return new OpenAICompatibleProvider({
        apiKey: config.apiKey,
        baseURL: config.baseURL ?? "https://api.openai.com/v1",
        model: config.model ?? "gpt-4o",
      });
    case "anthropic":
      return new AnthropicProvider({
        apiKey: config.apiKey,
        model: config.model ?? "claude-sonnet-4-20250514",
      });
    case "deepseek":
      return new OpenAICompatibleProvider({
        apiKey: config.apiKey,
        baseURL: config.baseURL ?? "https://api.deepseek.com",
        model: config.model ?? "deepseek-chat",
      });
    case "mock":
      return new MockProvider();
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
