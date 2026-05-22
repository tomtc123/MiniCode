# MiniCode - Claude Code-like CLI Tool

## Context

Build a minimal, experimental Claude Code-like terminal CLI tool. The goal is a working TUI that can chat with LLMs (with streaming output), execute tools (file read/write, shell commands), and have clean abstractions for future extension. Starting from an empty project.

## Tech Stack

- **Runtime**: Node.js + TypeScript (tsx runner, no build step)
- **UI**: Ink v7 (React for terminal) + @inkjs/ui + ink-syntax-highlight
- **LLM SDKs**: `openai` (covers OpenAI/DeepSeek/Gemini via baseURL) + `@anthropic-ai/sdk`
- **Other**: zod (config validation), marked + marked-terminal (markdown rendering), chalk, commander (CLI args)

## Project Structure

```
MiniCode/
├── package.json / tsconfig.json / .gitignore / .env.example
├── src/
│   ├── index.tsx              # Entry: parse args, mount Ink app
│   ├── config.ts              # Load config from env vars + CLI flags
│   ├── types.ts               # Shared types (LLMMessage, ToolCall, StreamEvent)
│   ├── llm/
│   │   ├── provider.ts        # LLMProvider interface + StreamEvent types
│   │   ├── openai-provider.ts # OpenAI-compatible streaming (also DeepSeek/Gemini)
│   │   ├── anthropic-provider.ts  # Claude streaming
│   │   └── factory.ts         # createProvider(config)
│   ├── tools/
│   │   ├── types.ts           # ToolDefinition, ToolResult
│   │   ├── registry.ts        # ToolRegistry (register/lookup/execute)
│   │   ├── file-read.ts       # Read file contents
│   │   ├── file-write.ts      # Write files
│   │   └── shell.ts           # Execute shell commands
│   └── ui/
│       ├── app.tsx            # Root component
│       ├── repl.tsx           # Conversation loop + tool execution
│       ├── message-list.tsx   # Message history display
│       ├── message.tsx        # Single message renderer
│       ├── code-block.tsx     # Syntax-highlighted code blocks
│       ├── tool-call.tsx      # Tool invocation display
│       └── input.tsx          # User input area
```

## Architecture

```
User Input --> [UI/REPL] --> [LLM Provider] --> LLM API (streaming)
                ^    |            |
                |    v            v
                |  [Tool Registry] <-- tool_use events
                |    |
                +----+-- tool results fed back to LLM
```

**Key abstraction**: `LLMProvider` interface with `streamChat()` returning `AsyncIterable<StreamEvent>`. Both OpenAI and Anthropic providers implement this. The UI never knows which provider is running.

**Conversation loop** (in repl.tsx): User sends message -> stream LLM response -> if tool_calls requested, execute tools and feed results back -> repeat until LLM gives text-only response.

## Implementation Plan

### Phase 1: Project Setup + LLM Streaming (skeleton)

1. **Initialize project**: `package.json` (type: module), `tsconfig.json`, `.gitignore`, `.env.example`
2. **Install deps**: ink, react, @inkjs/ui, openai, @anthropic-ai/sdk, zod, chalk, commander, tsx, typescript, @types/react
3. **`src/types.ts`**: Define LLMMessage, ToolCall, StreamEvent, ToolDefinition, ToolResult, Config
4. **`src/config.ts`**: Load from MINICODE_* env vars, validate with zod, support CLI overrides
5. **`src/llm/provider.ts`**: LLMProvider interface with AsyncIterable<StreamEvent>
6. **`src/llm/openai-provider.ts`**: Wrap openai SDK, normalize streaming to StreamEvent
7. **`src/llm/factory.ts`**: createProvider() factory (openai/anthropic/deepseek)
8. **`src/ui/input.tsx`**: Simple text input with useInput hook
9. **`src/ui/app.tsx`**: Minimal app - accepts input, prints streaming LLM output
10. **`src/index.tsx`**: CLI arg parsing, config loading, mount Ink app

**Milestone**: Type a message, see streamed LLM response in terminal.

### Phase 2: Tools + Anthropic + Conversation Loop

11. **`src/tools/types.ts`**: ToolDefinition and ToolResult interfaces (JSON Schema parameters)
12. **`src/tools/registry.ts`**: ToolRegistry class (register, getDefinitions, execute with error boundary)
13. **`src/tools/file-read.ts`**: Read file tool
14. **`src/tools/shell.ts`**: Shell command tool (cmd /c on Windows)
15. **`src/llm/anthropic-provider.ts`**: Anthropic SDK streaming, translate message formats
16. **`src/ui/repl.tsx`**: useConversation hook - the while-loop that chains tool calls
17. **`src/ui/message.tsx`**: Render user/assistant/tool messages
18. **`src/ui/tool-call.tsx`**: Show tool name, args, and result

**Milestone**: Agent can read files and run commands. Both OpenAI and Claude work.

### Phase 3: Polish

19. **`src/ui/message-list.tsx`**: Scrollable message history
20. **`src/ui/code-block.tsx`**: Syntax-highlighted code via ink-syntax-highlight
21. **Markdown rendering**: marked + marked-terminal for assistant messages
22. **`src/tools/file-write.ts`**: File write tool
23. Error handling, Ctrl+C graceful shutdown

## Verification

1. `npm install` - deps install without errors
2. `npx tsx src/index.tsx` - app launches, shows input prompt
3. Send a message (with OpenAI key set) - see streaming response
4. Ask LLM to read a file - tool executes, result shown
5. Switch to Anthropic provider via env var - same flow works
6. Ask LLM to run a shell command - output displayed

## Building & Distribution

### 方案一：Bun 编译（推荐，最简单）

```bash
# 1. 安装 Bun
# Windows: powershell -c "irm bun.sh/install.ps1 | iex"
# Mac/Linux: curl -fsSL https://bun.sh/install | bash

# 2. 一键编译成单个可执行文件
bun build --compile src/index.tsx --outfile minicode.exe

# 3. 运行
./minicode.exe
```

### 方案二：Node.js Wrapper（无需编译）

```bash
# Windows
minicode.cmd --help

# Mac/Linux
chmod +x minicode.sh
./minicode.sh --help
```

### 方案三：esbuild 打包（需要 Node.js 运行时）

```bash
npm run build        # 打包成 dist/minicode.mjs
node dist/minicode.mjs --help
```

### npm 全局安装

```bash
npm install -g .
minicode --help
```

### 分发方式

| 方式 | 优点 | 缺点 |
|------|------|------|
| Bun compile | 单文件，无需运行时 | 需要安装 Bun |
| npm global | 标准分发方式 | 需要 Node.js |
| Wrapper 脚本 | 零构建 | 需要 Node.js + tsx |
| esbuild bundle | 单 JS 文件 | 需要 Node.js |
