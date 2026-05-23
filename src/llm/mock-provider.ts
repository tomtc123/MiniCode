import type { LLMProvider } from "./provider.js";
import type { LLMMessage, LLMToolDefinition, StreamEvent } from "../types.js";

const MOCK_RESPONSES: Record<string, string> = {
  default: "Hello! I'm MiniCode's mock assistant. I can simulate reading files, writing files, and running shell commands. Try asking me to do something!",
  file_read: "I'll read that file for you.",
  shell: "I'll run that command for you.",
  file_write: "I'll write that file for you.",
  hello: "Hi there! I'm a mock LLM running without a real API key. Everything I say is simulated.",
  help: "I can help you with:\n- **file_read**: Read file contents\n- **file_write**: Write files\n- **shell**: Run shell commands\n\nJust ask and I'll simulate the response!",
  code: "Here's an example of code rendering:\n\n```typescript\nfunction greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n\nconst message = greet(\"MiniCode\");\nconsole.log(message);\n```\n\nYou can also use `inline code` for small snippets.",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickResponse(userText: string): string {
  const lower = userText.toLowerCase();
  for (const [key, val] of Object.entries(MOCK_RESPONSES)) {
    if (key !== "default" && lower.includes(key)) return val;
  }
  return MOCK_RESPONSES.default;
}

function pickToolCall(userText: string): { name: string; args: Record<string, unknown> } | null {
  const lower = userText.toLowerCase();
  if (lower.includes("read") || lower.includes("cat") || lower.includes("show file")) {
    const pathMatch = userText.match(/["']([^"']+)["']/) || userText.match(/(\S+\.\w+)/);
    return { name: "file_read", args: { path: pathMatch?.[1] ?? "package.json" } };
  }
  if (lower.includes("run") || lower.includes("execute") || lower.includes("command")) {
    const cmdMatch = userText.match(/(?:run|execute|command)\s+(.+)/i);
    return { name: "shell", args: { command: cmdMatch?.[1] ?? "echo hello" } };
  }
  if (lower.includes("write") || lower.includes("create file")) {
    return { name: "file_write", args: { path: "test-output.txt", content: "Hello from MiniCode mock!" } };
  }
  return null;
}

export class MockProvider implements LLMProvider {
  readonly name = "mock";

  async *streamChat(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
  ): AsyncIterable<StreamEvent> {
    const lastMsg = messages[messages.length - 1];
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    const userText = lastUserMsg?.content ?? "";

    // If the last message is a tool result, give a summary (check FIRST to avoid re-triggering tools)
    if (lastMsg?.role === "tool") {
      const summary = `Here's the result:\n\n\`\`\`\n${lastMsg.content.slice(0, 500)}\n\`\`\`\n\nWhat would you like to do next?`;
      for (const char of summary) {
        yield { type: "text_delta", text: char };
        await sleep(10);
      }
      yield { type: "usage", usage: { inputTokens: Math.floor(Math.random() * 500) + 100, outputTokens: Math.floor(Math.random() * 300) + 50, thinkingTokens: Math.floor(Math.random() * 200) + 50 } };
      yield { type: "done" };
      return;
    }

    // Simulate a tool call if the user asks for one
    const toolCall = pickToolCall(userText);
    if (toolCall && tools?.length) {
      const toolId = `mock_tc_${Date.now()}`;
      // Stream tool call start
      yield { type: "tool_call_start", toolCall: { id: toolId, name: toolCall.name, arguments: {} } };
      await sleep(300);
      yield { type: "tool_call_complete", toolCall: { id: toolId, name: toolCall.name, arguments: toolCall.args } };
      await sleep(200);
      yield { type: "usage", usage: { inputTokens: Math.floor(Math.random() * 500) + 100, outputTokens: Math.floor(Math.random() * 300) + 50, thinkingTokens: Math.floor(Math.random() * 200) + 50 } };
      yield { type: "done" };
      return;
    }

    // Normal text response - stream character by character
    const response = pickResponse(userText);
    for (const char of response) {
      yield { type: "text_delta", text: char };
      await sleep(15);
    }
    yield { type: "usage", usage: { inputTokens: Math.floor(Math.random() * 500) + 100, outputTokens: Math.floor(Math.random() * 300) + 50, thinkingTokens: Math.floor(Math.random() * 200) + 50 } };
    yield { type: "done" };
  }
}
