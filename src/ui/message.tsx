import { Box, Text } from "ink";
import type { LLMMessage } from "../types.js";
import { ToolCallDisplay } from "./tool-call.js";
import { CodeBlock } from "./code-block.js";
import { DiffBlock } from "./diff-block.js";

interface MessageProps {
  message: LLMMessage;
  toolResults?: Map<string, { output: string; isError?: boolean }>;
}

function renderContent(content: string) {
  // Parse markdown code blocks
  const parts: Array<{ type: "text" | "code"; content: string; lang?: string }> = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", content: match[2], lang: match[1] || undefined });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: "text", content });
  }

  return parts.map((part, i) => {
    if (part.type === "code") {
      const isDiff = part.lang === "diff" || (!part.lang && (part.content.startsWith("--- ") || part.content.includes("\n@@ ")));
      if (isDiff) {
        return <DiffBlock key={i} output={part.content} />;
      }
      return <CodeBlock key={i} code={part.content} language={part.lang} />;
    }
    // Simple markdown-like rendering
    // Trim blank lines adjacent to code blocks
    const prevIsCode = i > 0 && parts[i - 1].type === "code";
    const nextIsCode = i < parts.length - 1 && parts[i + 1].type === "code";
    let text = part.content;
    if (prevIsCode) text = text.replace(/^\n+/, "");
    if (nextIsCode) text = text.replace(/\n+$/, "");
    return text.split("\n").map((line, j) => {
      // Bold: **text**
      const rendered = line.replace(/\*\*(.*?)\*\*/g, "$1");
      // Inline code: `text`
      const parts = rendered.split(/(`[^`]+`)/);
      return (
        <Text key={`${i}-${j}`}>
          {parts.map((p, k) => {
            if (p.startsWith("`") && p.endsWith("`")) {
              return (
                <Text key={k} backgroundColor="gray" color="white">
                  {p.slice(1, -1)}
                </Text>
              );
            }
            return <Text key={k}>{p}</Text>;
          })}
          {"\n"}
        </Text>
      );
    });
  });
}

export function Message({ message, toolResults }: MessageProps) {
  if (message.role === "user") {
    return (
      <Box paddingX={1} marginY={0}>
        <Text color="cyan" bold>
          {">"}{" "}
        </Text>
        <Text>{message.content}</Text>
      </Box>
    );
  }

  if (message.role === "assistant") {
    return (
      <Box flexDirection="column" paddingX={1} marginY={0}>
        {message.tool_calls?.map((tc) => (
          <ToolCallDisplay
            key={tc.id}
            toolCall={tc}
            result={toolResults?.get(tc.id)?.output}
            isError={toolResults?.get(tc.id)?.isError}
          />
        ))}
        {message.content && renderContent(message.content)}
      </Box>
    );
  }

  if (message.role === "tool") {
    // Tool results are shown inline with tool_calls above
    return null;
  }

  return null;
}
