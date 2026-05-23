import { Box, Text } from "ink";
import type { ToolCall } from "../types.js";
import { DiffBlock } from "./diff-block.js";

interface ToolCallDisplayProps {
  toolCall: ToolCall;
  result?: string;
  isError?: boolean;
}

export function ToolCallDisplay({ toolCall, result, isError }: ToolCallDisplayProps) {
  const isDiff = toolCall.name === "diff" && result && !isError && result.startsWith("--- ");

  return (
    <Box flexDirection="column" marginY={0} paddingX={1}>
      <Box>
        <Text color="yellow" bold>
          {"[tool] "}
        </Text>
        <Text color="yellow">{toolCall.name}</Text>
        <Text color="gray">
          {" "}
          {JSON.stringify(toolCall.arguments)}
        </Text>
      </Box>
      {result !== undefined && isDiff && (
        <Box paddingLeft={2}>
          <DiffBlock output={result} />
        </Box>
      )}
      {result !== undefined && !isDiff && (
        <Box paddingLeft={2}>
          <Text color={isError ? "red" : "gray"} dimColor>
            {result.length > 500 ? result.slice(0, 500) + "..." : result}
          </Text>
        </Box>
      )}
    </Box>
  );
}
