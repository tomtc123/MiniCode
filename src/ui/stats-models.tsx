import { Box, Text } from "ink";
import chalk from "chalk";
import type { StatsData, Filter } from "../stats/types.js";
import { renderLineChart } from "../stats/line-chart.js";
import { computeModelBreakdown, getUniqueModels } from "../stats/compute.js";

const MODEL_COLORS = ["cyan", "yellow", "green", "magenta", "red", "blue"] as const;

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

interface StatsModelsProps {
  data: StatsData;
  filter: Filter;
}

export function StatsModels({ data, filter }: StatsModelsProps) {
  const models = getUniqueModels(data);
  const chartLines = renderLineChart(data.daily, filter, models);
  const breakdown = computeModelBreakdown(data, filter);

  return (
    <Box flexDirection="column">
      {/* Line chart */}
      <Box flexDirection="column" marginBottom={1}>
        {chartLines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>

      {/* Model breakdown */}
      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text bold>{"  Model breakdown"}</Text>
        </Box>
        <Box marginTop={0}>
          <Text color="gray" dimColor>{"  " + "─".repeat(60)}</Text>
        </Box>
        {breakdown.length === 0 && (
          <Box paddingX={2}>
            <Text color="gray" dimColor>No data</Text>
          </Box>
        )}
        {breakdown.map((entry, i) => {
          const color = MODEL_COLORS[i % MODEL_COLORS.length];
          return (
            <Box key={entry.model}>
              <Text>
                {"  "}
                <Text color={color as any}>●</Text>
                {" "}
                <Text color={color as any} bold>{entry.model.padEnd(25)}</Text>
                <Text color="white">{`${entry.percentage.toFixed(1)}%`.padStart(7)}</Text>
                <Text color="gray" dimColor>{"  In: "}</Text>
                <Text color="white">{formatTokens(entry.inputTokens).padStart(8)}</Text>
                <Text color="gray" dimColor>{"  Out: "}</Text>
                <Text color="white">{formatTokens(entry.outputTokens).padStart(8)}</Text>
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
