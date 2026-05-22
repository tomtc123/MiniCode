export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  reasoning_content?: string;
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "reasoning_delta"; text: string }
  | { type: "tool_call_start"; toolCall: ToolCall }
  | { type: "tool_call_delta"; toolCallId: string; argumentDelta: string }
  | { type: "tool_call_complete"; toolCall: ToolCall }
  | { type: "done" }
  | { type: "error"; error: Error };

export interface ToolResult {
  output: string;
  isError?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
}

export interface Config {
  provider: "openai" | "anthropic" | "deepseek" | "mock";
  apiKey: string;
  model?: string;
  baseURL?: string;
  systemPrompt: string;
  maxTokens: number;
}
