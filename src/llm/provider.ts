import type { LLMMessage, LLMToolDefinition, StreamEvent } from "../types.js";

export interface LLMProvider {
  readonly name: string;

  streamChat(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
    systemPrompt?: string
  ): AsyncIterable<StreamEvent>;
}
