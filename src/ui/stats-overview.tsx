import { Box, Text } from "ink";
import chalk from "chalk";
import type { StatsData, Filter } from "../stats/types.js";
import { renderHeatmap } from "../stats/heatmap.js";
import { computeOverviewStats } from "../stats/compute.js";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

interface StatsOverviewProps {
  data: StatsData;
  filter: Filter;
}

export function StatsOverview({ data, filter }: StatsOverviewProps) {
  const heatmapLines = renderHeatmap(data.daily, filter);
  const stats = computeOverviewStats(data);

  return (
    <Box flexDirection="column">
      {/* Heatmap */}
      <Box flexDirection="column" marginBottom={1}>
        {heatmapLines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>

      {/* Stats grid - 2 columns, 5 rows */}
      <Box flexDirection="column" marginTop={1}>
        <StatRow
          label1="Favorite model" value1={stats.favoriteModel}
          label2="Total tokens" value2={formatTokens(stats.totalTokens)}
        />
        <StatRow
          label1="Thinking tokens" value1={formatTokens(stats.totalThinkingTokens)}
          label2="Total duration" value2={stats.totalDuration}
        />
        <StatRow
          label1="Sessions" value1={String(stats.sessionsCount)}
          label2="Longest session" value2={stats.longestSession}
        />
        <StatRow
          label1="Active days" value1={`${stats.activeDays}/365`}
          label2="Longest streak" value2={`${stats.longestStreak} days`}
        />
        <StatRow
          label1="Most active day" value1={stats.mostActiveDay}
          label2="Current streak" value2={`${stats.currentStreak} days`}
        />
      </Box>
    </Box>
  );
}

function StatRow({ label1, value1, label2, value2 }: {
  label1: string; value1: string;
  label2: string; value2: string;
}) {
  return (
    <Box flexDirection="row" marginBottom={1}>
      <Box width={35}>
        <Box flexDirection="column">
          <Text color="gray" dimColor>{label1}</Text>
          <Text color="cyan" bold>{value1}</Text>
        </Box>
      </Box>
      <Box width={40}>
        <Box flexDirection="column">
          <Text color="gray" dimColor>{label2}</Text>
          <Text color="white" bold>{value2}</Text>
        </Box>
      </Box>
    </Box>
  );
}
