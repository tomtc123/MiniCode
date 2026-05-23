import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider } from "./provider.js";
import type { LLMMessage, LLMToolDefinition, StreamEvent, ToolCall } from "../types.js";

export interface AnthropicProviderConfig {
  apiKey: string;
  model?: string;
}

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(config: AnthropicProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? "claude-sonnet-4-20250514";
  }

  async *streamChat(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
    systemPrompt?: string
  ): AsyncIterable<StreamEvent> {
    const anthropicMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === "system") continue; // handled separately
      if (msg.role === "tool") {
        // Find the preceding assistant message to pair tool results
        // Anthropic expects tool_result as a user message with content blocks
        const lastMsg = anthropicMessages[anthropicMessages.length - 1];
        if (lastMsg?.role === "user") {
          (lastMsg.content as Anthropic.ContentBlockParam[]).push({
            type: "tool_result",
            tool_use_id: msg.tool_call_id!,
            content: msg.content,
          });
        } else {
          anthropicMessages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: msg.tool_call_id!,
                content: msg.content,
              },
            ],
          });
        }
      } else if (msg.role === "assistant" && msg.tool_calls?.length) {
        const content: Anthropic.ContentBlockParam[] = [];
        if (msg.content) {
          content.push({ type: "text", text: msg.content });
        }
        for (const tc of msg.tool_calls) {
          content.push({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          });
        }
        anthropicMessages.push({ role: "assistant", content });
      } else if (msg.role === "user" || msg.role === "assistant") {
        anthropicMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const anthropicTools = tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool["input_schema"],
    }));

    try {
      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt || undefined,
        messages: anthropicMessages,
        tools: anthropicTools?.length ? anthropicTools : undefined,
      });

      const toolCalls: ToolCall[] = [];
      let currentToolCall: ToolCall | null = null;
      let currentArgs = "";
      let inputTokens = 0;
      let thinkingTokens = 0;

      for await (const event of stream) {
        if (event.type === "message_start") {
          if (event.message?.usage) {
            inputTokens = event.message.usage.input_tokens;
          }
        } else if (event.type === "message_delta") {
          if (event.usage) {
            yield {
              type: "usage",
              usage: {
                inputTokens,
                outputTokens: event.usage.output_tokens,
                thinkingTokens: thinkingTokens || undefined,
              },
            };
          }
        } else if (event.type === "content_block_start") {
          if (event.content_block.type === "text") {
            // text block started
          } else if (event.content_block.type === "thinking") {
            // thinking block started
          } else if (event.content_block.type === "tool_use") {
            currentToolCall = {
              id: event.content_block.id,
              name: event.content_block.name,
              arguments: {},
            };
            currentArgs = "";
            yield {
              type: "tool_call_start",
              toolCall: { ...currentToolCall },
            };
          }
        } else if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            yield { type: "text_delta", text: event.delta.text };
          } else if (event.delta.type === "thinking_delta") {
            yield { type: "reasoning_delta", text: event.delta.thinking };
            thinkingTokens += 1; // rough estimate per delta
          } else if (event.delta.type === "input_json_delta") {
            currentArgs += event.delta.partial_json;
            if (currentToolCall) {
              yield {
                type: "tool_call_delta",
                toolCallId: currentToolCall.id,
                argumentDelta: event.delta.partial_json,
              };
            }
          }
        } else if (event.type === "content_block_stop") {
          if (currentToolCall) {
            let parsed: Record<string, unknown> = {};
            try {
              parsed = JSON.parse(currentArgs);
            } catch {
              // keep empty
            }
            currentToolCall.arguments = parsed;
            toolCalls.push(currentToolCall);
            yield {
              type: "tool_call_complete",
              toolCall: { ...currentToolCall },
            };
            currentToolCall = null;
          }
        } else if (event.type === "message_stop") {
          yield { type: "done" };
        }
      }
    } catch (err) {
      yield { type: "error", error: err as Error };
    }
  }
}
