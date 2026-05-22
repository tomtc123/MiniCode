import { Box } from "ink";
import type { Config } from "../types.js";
import type { LLMProvider } from "../llm/provider.js";
import type { ToolRegistry } from "../tools/registry.js";
import { REPL } from "./repl.js";

interface AppProps {
  config: Config;
  provider: LLMProvider;
  toolRegistry: ToolRegistry;
}

export function App({ config, provider, toolRegistry }: AppProps) {
  return (
    <Box flexDirection="column" height="100%">
      <REPL
        provider={provider}
        toolRegistry={toolRegistry}
        systemPrompt={config.systemPrompt}
        config={config}
      />
    </Box>
  );
}
