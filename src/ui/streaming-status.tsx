import { useState, useEffect } from "react";
import { Box, Text } from "ink";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SWEEP_SPEED = 120; // ms per character position

interface StreamingStatusProps {
  startTime: number;
  tokenCount: number;
  thinkingDuration: number;
  hasStartedStreaming: boolean;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTokens(chars: number): string {
  const tokens = Math.floor(chars / 4);
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return String(tokens);
}

export function StreamingStatus({ startTime, tokenCount, thinkingDuration, hasStartedStreaming }: StreamingStatusProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, SWEEP_SPEED);
    return () => clearInterval(timer);
  }, []);

  const spinnerChar = SPINNER_FRAMES[tick % SPINNER_FRAMES.length];
  const elapsed = Date.now() - startTime;
  const elapsedStr = formatElapsed(elapsed);

  const word = hasStartedStreaming ? "Generating" : "Thinking";
  const litIndex = tick % word.length;

  const parts: string[] = [];
  parts.push(`${elapsedStr}`);
  if (tokenCount > 0) {
    parts.push(`↓ ${formatTokens(tokenCount)} tokens`);
  }
  if (thinkingDuration > 0) {
    parts.push(`thought for ${formatElapsed(thinkingDuration)}`);
  }
  const statsStr = parts.join(" · ");

  return (
    <Box paddingX={1} paddingY={0}>
      <Text>
        <Text color="cyan">{spinnerChar}</Text>
        {" "}
        {word.split("").map((ch, i) => {
          const dist = (litIndex - i + word.length) % word.length;
          const color = dist === 0 ? "white" : dist <= 2 ? "cyan" : "gray";
          const bold = dist === 0;
          const dim = dist > 2;
          return (
            <Text key={i} color={color as any} bold={bold} dimColor={dim}>
              {ch}
            </Text>
          );
        })}
        <Text color="gray">… </Text>
        <Text color="gray" dimColor>({statsStr})</Text>
      </Text>
    </Box>
  );
}
