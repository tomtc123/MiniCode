import { useState, useCallback, useRef, useEffect } from "react";
import { Box, Text } from "ink";
import type { LLMMessage, ToolCall } from "../types.js";
import type { LLMProvider } from "../llm/provider.js";
import type { ToolRegistry } from "../tools/registry.js";
import { MessageList } from "./message-list.js";
import { UserInput } from "./input.js";
import { Welcome } from "./welcome.js";
import { SLASH_COMMANDS } from "./slash-menu.js";
import type { Config } from "../types.js";
import { getStatsStore } from "../stats/store.js";
import { StatsView } from "./stats-view.js";

interface REPLProps {
  provider: LLMProvider;
  toolRegistry: ToolRegistry;
  systemPrompt: string;
  config: Config;
}

function resolveAlias(input: string): string {
  const cmd = SLASH_COMMANDS.find(
    (c) => c.name === input || c.alias === input
  );
  return cmd?.name ?? input;
}

export function REPL({ provider, toolRegistry, systemPrompt, config }: REPLProps) {
  const [messages, setMessages] = useState<LLMMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [toolResults, setToolResults] = useState<
    Map<string, { output: string; isError?: boolean }>
  >(new Map());
  const [showStats, setShowStats] = useState(false);

  const statsStore = useRef(getStatsStore());
  const sessionId = useRef<string>("");
  const messagesRef = useRef<LLMMessage[]>([]);
  messagesRef.current = messages;

  // Initialize stats store and session on mount
  useEffect(() => {
    const store = statsStore.current;
    store.init().then(() => {
      sessionId.current = store.startSession();
    });

    const cleanup = () => {
      store.endSession(sessionId.current, messagesRef.current.length);
      store.close();
    };
    process.on("SIGINT", cleanup);
    process.on("beforeExit", cleanup);
    return () => {
      cleanup();
      process.removeListener("SIGINT", cleanup);
      process.removeListener("beforeExit", cleanup);
    };
  }, []);

  const addSystemMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "assistant", content: text }]);
  }, []);

  const sendMessage = useCallback(
    async (userText: string) => {
      const resolved = resolveAlias(userText);

      // Handle slash commands locally
      if (resolved === "/help" || resolved === "/h") {
        const help = SLASH_COMMANDS
          .map((c) => `  ${c.name.padEnd(12)} ${c.description}${c.alias ? ` (${c.alias})` : ""}`)
          .join("\n");
        addSystemMessage(`**Available Commands:**\n${help}`);
        return;
      }
      if (resolved === "/clear" || resolved === "/c") {
        setMessages([]);
        setToolResults(new Map());
        return;
      }
      if (resolved === "/tools" || resolved === "/t") {
        const tools = toolRegistry.getDefinitions();
        const list = tools
          .map((t) => `  ${t.name.padEnd(14)} ${t.description}`)
          .join("\n");
        addSystemMessage(`**Available Tools:**\n${list}`);
        return;
      }
      if (resolved === "/provider" || resolved === "/p") {
        addSystemMessage(
          `**Provider:** ${config.provider}\n**Model:** ${config.model ?? "(default)"}\n**Max Tokens:** ${config.maxTokens}`
        );
        return;
      }
      if (resolved === "/stats" || resolved === "/st" || userText.startsWith("/stats ") || userText.startsWith("/st ")) {
        const arg = userText.split(/\s+/)[1]?.toLowerCase();
        if (arg === "test") {
          statsStore.current.loadSeedData();
          addSystemMessage("**Stats:** Test data loaded (282 days, mimo-v2.5-pro + deepseek-v4-pro)");
        }
        await statsStore.current.flush();
        setShowStats(true);
        return;
      }
      if (resolved === "/exit" || resolved === "/q") {
        process.exit(0);
      }

      // Normal message - send to LLM
      const userMessage: LLMMessage = { role: "user", content: userText };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setIsStreaming(true);
      setStreamingText("");
      setToolResults(new Map());

      let currentMessages = newMessages;

      try {
        // Tool-use loop: keep calling LLM until no more tool calls
        while (true) {
          const stream = provider.streamChat(
            currentMessages,
            toolRegistry.getDefinitions(),
            systemPrompt
          );

          let assistantText = "";
          let reasoningText = "";
          const toolCalls: ToolCall[] = [];

          for await (const event of stream) {
            switch (event.type) {
              case "text_delta":
                assistantText += event.text;
                setStreamingText(assistantText);
                break;
              case "reasoning_delta":
                reasoningText += event.text;
                break;
              case "tool_call_complete":
                toolCalls.push(event.toolCall);
                break;
              case "usage":
                statsStore.current.recordUsage(config.model ?? config.provider, event.usage);
                statsStore.current.recordSessionUsage(sessionId.current, config.model ?? config.provider, event.usage);
                break;
              case "error":
                assistantText += `\n[Error: ${event.error.message}]`;
                setStreamingText(assistantText);
                break;
              case "done":
                break;
            }
          }

          if (toolCalls.length === 0) {
            // No tools requested - conversation turn is complete
            const assistantMsg: LLMMessage = {
              role: "assistant",
              content: assistantText,
              reasoning_content: reasoningText || undefined,
            };
            currentMessages = [...currentMessages, assistantMsg];
            setMessages(currentMessages);
            break;
          }

          // Execute tools and build results
          const assistantMsg: LLMMessage = {
            role: "assistant",
            content: assistantText,
            tool_calls: toolCalls,
            reasoning_content: reasoningText || undefined,
          };
          currentMessages = [...currentMessages, assistantMsg];

          const newToolResults = new Map(toolResults);
          for (const tc of toolCalls) {
            const result = await toolRegistry.execute(tc.name, tc.arguments);
            newToolResults.set(tc.id, result);
            currentMessages = [
              ...currentMessages,
              {
                role: "tool" as const,
                content: result.output,
                tool_call_id: tc.id,
              },
            ];
          }
          setToolResults(newToolResults);
          setMessages(currentMessages);
          setStreamingText("");

          // Loop back - LLM will process tool results
        }
      } finally {
        setIsStreaming(false);
        setStreamingText("");
      }
    },
    [messages, provider, toolRegistry, systemPrompt, toolResults, config, addSystemMessage]
  );

  if (showStats) {
    return (
      <StatsView
        data={statsStore.current.getData()}
        onClose={() => setShowStats(false)}
      />
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Box flexDirection="column" flexGrow={1}>
        <Welcome config={config} />
        <MessageList
          messages={messages}
          streamingText={streamingText}
          toolResults={toolResults}
        />
      </Box>
      <UserInput onSubmit={sendMessage} disabled={isStreaming} />
    </Box>
  );
}
