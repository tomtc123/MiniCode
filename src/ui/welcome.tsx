import { Box, Text } from "ink";
import type { Config } from "../types.js";

const LOGO = [
  "███╗   ███╗██╗███╗   ██╗██╗ ██████╗ ██████╗ ██████╗ ███████╗",
  "████╗ ████║██║████╗  ██║██║██╔════╝██╔═══██╗██╔══██╗██╔════╝",
  "██╔████╔██║██║██╔██╗ ██║██║██║     ██║   ██║██║  ██║█████╗  ",
  "██║╚██╔╝██║██║██║╚██╗██║██║██║     ██║   ██║██║  ██║██╔══╝  ",
  "██║ ╚═╝ ██║██║██║ ╚████║██║╚██████╗╚██████╔╝██████╔╝███████╗",
  "╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝",
];

const TIPS = [
  "Type a message to start chatting with the LLM",
  'Ask me to read files: "read package.json"',
  'Run shell commands: "run dir"',
  'Write files: "write a hello world to test.js"',
  "Press Ctrl+C to exit at any time",
];

export function Welcome({ config }: { config: Config }) {
  return (
    <Box flexDirection="column" paddingX={1} marginY={1}>
      {/* Logo */}
      {LOGO.map((line, i) => (
        <Text key={i} color="cyan" bold>
          {line}
        </Text>
      ))}

      {/* Tagline */}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          {"  "}A minimal Claude Code-like CLI tool
        </Text>
      </Box>

      {/* Info bar */}
      <Box
        borderStyle="single"
        borderColor="gray"
        paddingX={2}
        paddingY={0}
        marginTop={1}
        flexDirection="column"
      >
        <Box>
          <Text color="gray">{"  Provider: "}</Text>
          <Text color="yellow" bold>
            {config.provider}
          </Text>
          {config.model && (
            <>
              <Text color="gray">{"  Model: "}</Text>
              <Text color="green">{config.model}</Text>
            </>
          )}
          <Text color="gray">{"  Version: "}</Text>
          <Text color="white">0.1.0</Text>
        </Box>
      </Box>

      {/* Tips */}
      <Box flexDirection="column" marginTop={1} paddingX={1}>
        <Text color="gray" bold>
          Quick Start:
        </Text>
        {TIPS.map((tip, i) => (
          <Text key={i} color="gray">
            {"  "}
            <Text color="cyan">{">"}</Text> {tip}
          </Text>
        ))}
      </Box>

      {/* Separator */}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          {"─".repeat(60)}
        </Text>
      </Box>
    </Box>
  );
}
