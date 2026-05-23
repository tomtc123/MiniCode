import { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { StatsData, Filter } from "../stats/types.js";
import { StatsOverview } from "./stats-overview.js";
import { StatsModels } from "./stats-models.js";

const TABS = ["Overview", "Models"] as const;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
];

interface StatsViewProps {
  data: StatsData;
  onClose: () => void;
}

export function StatsView({ data, onClose }: StatsViewProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [filterIdx, setFilterIdx] = useState(0);

  useInput((input, key) => {
    if (key.leftArrow) setActiveTab(0);
    if (key.rightArrow) setActiveTab(1);
    if (input === "1") setFilterIdx(0);
    if (input === "2") setFilterIdx(1);
    if (input === "3") setFilterIdx(2);
    if (key.escape || input === "q") onClose();
  });

  const filter = FILTERS[filterIdx].key;

  return (
    <Box flexDirection="column" height="100%" paddingX={1}>
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan">MiniCode Stats</Text>
        <Text color="gray" dimColor>q/Esc to close</Text>
      </Box>

      {/* Tab bar */}
      <Box marginBottom={1}>
        {TABS.map((tab, i) => (
          <Text key={tab}>
            {i > 0 && <Text color="gray">{"  "}</Text>}
            <Text color={i === activeTab ? "cyan" : "gray"} bold={i === activeTab}>
              {i === activeTab ? `▸ ${tab}` : `  ${tab}`}
            </Text>
          </Text>
        ))}
      </Box>

      {/* Filter bar */}
      <Box marginBottom={1}>
        <Text color="gray" dimColor>{"  Filter: "}</Text>
        {FILTERS.map((f, i) => (
          <Text key={f.key}>
            {i > 0 && <Text color="gray">{" · "}</Text>}
            <Text color={i === filterIdx ? "white" : "gray"} bold={i === filterIdx} dimColor={i !== filterIdx}>
              {f.label}
            </Text>
          </Text>
        ))}
        <Text color="gray" dimColor>{"  (press 1/2/3)"}</Text>
      </Box>

      {/* Divider */}
      <Box>
        <Text color="gray" dimColor>{"─".repeat(80)}</Text>
      </Box>

      {/* Tab content */}
      <Box flexDirection="column" flexGrow={1} overflowY="hidden">
        {activeTab === 0 ? (
          <StatsOverview data={data} filter={filter} />
        ) : (
          <StatsModels data={data} filter={filter} />
        )}
      </Box>
    </Box>
  );
}
