# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # Run MiniCode (mock mode: MINICODE_PROVIDER=mock npm start)
npm run dev            # Run with auto-restart on changes
npm run typecheck      # TypeScript type check (no output = success)
npx tsx test-mock.ts   # Run mock provider tests

# Build single executable (requires Bun)
~/.bun/bin/bun build --compile src/index.tsx --outfile minicode.exe
```

## Architecture

MiniCode is a terminal TUI chat tool that connects to LLMs and executes tools. Three layers:

**LLM Layer** (`src/llm/`): `LLMProvider` interface returns `AsyncIterable<StreamEvent>`. Implementations: `OpenAICompatibleProvider` (covers OpenAI/DeepSeek/Gemini via baseURL), `AnthropicProvider`, `MockProvider`. Factory at `factory.ts` selects provider from config.

**Tool Layer** (`src/tools/`): `ToolRegistry` holds `ToolDefinition` objects. Each tool has JSON Schema `parameters` and an `execute` function returning `ToolResult`. The registry converts tools to LLM-compatible format via `getDefinitions()`.

**UI Layer** (`src/ui/`): Ink (React for terminal) components. `repl.tsx` contains the core conversation loop — a while-loop that streams LLM responses, executes any requested tool calls, feeds results back, and repeats until the LLM gives a text-only response. `slash-menu.tsx` handles `/help`, `/clear`, `/tools`, `/provider`, `/exit` commands.

## Key Design Decisions

- `LLMProvider.streamChat()` is the single abstraction point. Adding a new provider means implementing this one method.
- OpenAI-compatible providers share one implementation — only `baseURL` and `model` differ.
- Anthropic message format differences (content blocks vs flat messages) are handled internally by `AnthropicProvider`.
- Tools use raw JSON Schema for parameters (not zod) because that's what both OpenAI and Anthropic APIs expect.
- Mock provider (`mock-provider.ts`) simulates tool calls and streaming for testing without API keys.

## Configuration

Environment variables: `MINICODE_PROVIDER`, `MINICODE_API_KEY`, `MINICODE_MODEL`, `MINICODE_BASE_URL`. Falls back to `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` if `MINICODE_API_KEY` not set. Config validation in `config.ts` uses zod.

## Tech Stack

TypeScript, Ink v5 (React for terminal), tsx runner (no build step), ESM modules (`"type": "module"` in package.json). The UI uses JSX with `"jsx": "react-jsx"` — no need to import React.

## Model Limitations

- **mimo-v2.5-pro**: Do NOT attempt to read any images (will error). Skip image file reads when using this model.
