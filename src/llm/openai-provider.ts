import OpenAI from "openai";
import type { LLMProvider } from "./provider.js";
import type { LLMMessage, LLMToolDefinition, StreamEvent } from "../types.js";

export interface OpenAIProviderConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly name: string;
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAIProviderConfig) {
    this.name = "openai";
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    this.model = config.model ?? "gpt-4o";
  }

  async *streamChat(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
    systemPrompt?: string
  ): AsyncIterable<StreamEvent> {
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      openaiMessages.push({ role: "system", content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === "tool") {
        openaiMessages.push({
          role: "tool",
          tool_call_id: msg.tool_call_id!,
          content: msg.content,
        });
      } else if (msg.role === "assistant" && msg.tool_calls?.length) {
        const assistantMsg: Record<string, unknown> = {
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.tool_calls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        };
        if (msg.reasoning_content) {
          assistantMsg.reasoning_content = msg.reasoning_content;
        }
        openaiMessages.push(assistantMsg as unknown as OpenAI.Chat.ChatCompletionMessageParam);
      } else {
        const plainMsg: Record<string, unknown> = {
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        };
        if (msg.role === "assistant" && msg.reasoning_content) {
          plainMsg.reasoning_content = msg.reasoning_content;
        }
        openaiMessages.push(plainMsg as unknown as OpenAI.Chat.ChatCompletionMessageParam);
      }
    }

    const openaiTools = tools?.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: openaiMessages,
        tools: openaiTools?.length ? openaiTools : undefined,
        max_tokens: 4096,
        stream: true,
        stream_options: { include_usage: true },
      });

      const toolCallBuffers = new Map<
        string,
        { id: string; name: string; arguments: string }
      >();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // DeepSeek reasoning_content
        const reasoning = (delta as Record<string, unknown>).reasoning_content;
        if (reasoning && typeof reasoning === "string") {
          yield { type: "reasoning_delta", text: reasoning };
        }

        if (delta.content) {
          yield { type: "text_delta", text: delta.content };
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            const key = `tc_${idx}`;

            if (tc.id && tc.function?.name) {
              toolCallBuffers.set(key, {
                id: tc.id,
                name: tc.function.name,
                arguments: "",
              });
              yield {
                type: "tool_call_start",
                toolCall: {
                  id: tc.id,
                  name: tc.function.name,
                  arguments: {},
                },
              };
            }

            if (tc.function?.arguments) {
              const buf = toolCallBuffers.get(key);
              if (buf) {
                buf.arguments += tc.function.arguments;
                yield {
                  type: "tool_call_delta",
                  toolCallId: buf.id,
                  argumentDelta: tc.function.arguments,
                };
              }
            }
          }
        }

        if (chunk.usage) {
          yield {
            type: "usage",
            usage: {
              inputTokens: chunk.usage.prompt_tokens,
              outputTokens: chunk.usage.completion_tokens,
            },
          };
        }

        if (chunk.choices[0]?.finish_reason === "stop") {
          yield { type: "done" };
        }

        if (chunk.choices[0]?.finish_reason === "tool_calls") {
          for (const [, buf] of toolCallBuffers) {
            let parsed: Record<string, unknown> = {};
            try {
              parsed = JSON.parse(buf.arguments);
            } catch {
              // keep empty
            }
            yield {
              type: "tool_call_complete",
              toolCall: { id: buf.id, name: buf.name, arguments: parsed },
            };
          }
          yield { type: "done" };
        }
      }
    } catch (err) {
      yield { type: "error", error: err as Error };
    }
  }
}
