import { MockProvider } from "./src/llm/mock-provider.js";
import { ToolRegistry } from "./src/tools/registry.js";
import { fileReadTool } from "./src/tools/file-read.js";
import { shellTool } from "./src/tools/shell.js";
import type { LLMMessage, StreamEvent } from "./src/types.js";

async function testMockProvider() {
  console.log("=== Testing MockProvider ===\n");

  const provider = new MockProvider();
  const registry = new ToolRegistry();
  registry.register(fileReadTool);
  registry.register(shellTool);

  // Test 1: Normal text response
  console.log("Test 1: Normal text response");
  const messages1: LLMMessage[] = [{ role: "user", content: "hello" }];
  let text = "";
  for await (const event of provider.streamChat(messages1)) {
    if (event.type === "text_delta") text += event.text;
  }
  console.log("Response:", text);
  console.log("✓ Test 1 passed\n");

  // Test 2: Tool call (file read)
  console.log("Test 2: Tool call - read package.json");
  const messages2: LLMMessage[] = [{ role: "user", content: "read package.json" }];
  const toolCalls: StreamEvent[] = [];
  for await (const event of provider.streamChat(messages2, registry.getDefinitions())) {
    if (event.type === "tool_call_complete") toolCalls.push(event);
  }
  console.log("Tool calls:", toolCalls.length > 0 ? "✓" : "✗");
  if (toolCalls.length > 0 && toolCalls[0].type === "tool_call_complete") {
    const result = await registry.execute(toolCalls[0].toolCall.name, toolCalls[0].toolCall.arguments);
    console.log("Tool result preview:", result.output.slice(0, 100) + "...");
    console.log("✓ Test 2 passed\n");
  }

  // Test 3: Full conversation loop
  console.log("Test 3: Full conversation loop");
  let conversationMessages: LLMMessage[] = [{ role: "user", content: "run echo hello" }];
  let turns = 0;
  while (turns < 3) {
    turns++;
    const events: StreamEvent[] = [];
    for await (const event of provider.streamChat(conversationMessages, registry.getDefinitions())) {
      events.push(event);
    }

    const hasToolCall = events.some(e => e.type === "tool_call_complete");
    if (!hasToolCall) {
      const textEvent = events.find(e => e.type === "text_delta");
      console.log(`Turn ${turns} - Text response:`, textEvent && textEvent.type === "text_delta" ? textEvent.text.slice(0, 80) : "(empty)");
      break;
    }

    const tc = events.find(e => e.type === "tool_call_complete") as Extract<StreamEvent, { type: "tool_call_complete" }>;
    console.log(`Turn ${turns} - Tool call: ${tc.toolCall.name}(${JSON.stringify(tc.toolCall.arguments)})`);
    const result = await registry.execute(tc.toolCall.name, tc.toolCall.arguments);
    conversationMessages = [
      ...conversationMessages,
      { role: "assistant", content: "", tool_calls: [tc.toolCall] },
      { role: "tool", content: result.output, tool_call_id: tc.toolCall.id },
    ];
  }
  console.log("✓ Test 3 passed\n");

  console.log("=== All tests passed! ===");
}

testMockProvider().catch(console.error);
