import { Box, Text } from "ink";
import type { LLMMessage } from "../types.js";
import { Message } from "./message.js";
import { CodeBlock } from "./code-block.js";

interface MessageListProps {
  messages: LLMMessage[];
  streamingText: string;
  toolResults: Map<string, { output: string; isError?: boolean }>;
}

export function MessageList({
  messages,
  streamingText,
  toolResults,
}: MessageListProps) {
  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      {messages.map((msg, i) => (
        <Message key={i} message={msg} toolResults={toolResults} />
      ))}
      {streamingText && (
        <Box paddingX={1} marginY={0}>
          <Text color="green">
            {streamingText}
            <Text color="gray">{"▌"}</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
}
