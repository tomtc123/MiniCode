import { Box, Text } from "ink";

export interface SlashCommand {
  name: string;
  description: string;
  alias?: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: "/help", description: "Show available commands", alias: "/h" },
  { name: "/clear", description: "Clear conversation history", alias: "/c" },
  { name: "/tools", description: "List available tools", alias: "/t" },
  { name: "/provider", description: "Show current LLM provider info", alias: "/p" },
  { name: "/exit", description: "Exit MiniCode", alias: "/q" },
];

interface SlashMenuProps {
  filter: string;
  selectedIndex: number;
}

export function SlashMenu({ filter, selectedIndex }: SlashMenuProps) {
  const query = filter.toLowerCase();
  const filtered = SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(query) ||
      cmd.alias?.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    return (
      <Box paddingX={2} paddingY={0}>
        <Text color="gray" dimColor>
          No matching commands
        </Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      marginX={1}
    >
      {filtered.map((cmd, i) => (
        <Box key={cmd.name}>
          <Text color={i === selectedIndex ? "cyan" : "white"} bold={i === selectedIndex}>
            {i === selectedIndex ? "▸ " : "  "}
            {cmd.name}
            {cmd.alias ? ` (${cmd.alias})` : ""}
          </Text>
          <Text color="gray" dimColor>
            {" — "}
            {cmd.description}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

export function filterCommands(input: string): SlashCommand[] {
  const query = input.toLowerCase();
  return SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(query) ||
      cmd.alias?.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query)
  );
}
