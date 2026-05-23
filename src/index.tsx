import { render } from "ink";
import { Command } from "commander";
import { loadConfig } from "./config.js";
import { createProvider } from "./llm/factory.js";
import { ToolRegistry } from "./tools/registry.js";
import { fileReadTool } from "./tools/file-read.js";
import { fileWriteTool } from "./tools/file-write.js";
import { shellTool } from "./tools/shell.js";
import { diffTool } from "./tools/diff.js";
import { App } from "./ui/app.js";

const program = new Command()
  .name("minicode")
  .description("A minimal Claude Code-like CLI")
  .option("-p, --provider <name>", "LLM provider (openai|anthropic|deepseek)")
  .option("-m, --model <name>", "Model name")
  .option("-k, --api-key <key>", "API key")
  .parse();

const cliOpts = program.opts();

const overrides: Record<string, string> = {};
if (cliOpts.provider) overrides.provider = cliOpts.provider;
if (cliOpts.model) overrides.model = cliOpts.model;
if (cliOpts.apiKey) overrides.apiKey = cliOpts.apiKey;

const config = loadConfig(overrides);

const provider = createProvider(config);

const registry = new ToolRegistry();
registry.register(fileReadTool);
registry.register(fileWriteTool);
registry.register(shellTool);
registry.register(diffTool);

render(<App config={config} provider={provider} toolRegistry={registry} />);
