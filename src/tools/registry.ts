import type { ToolDefinition, ToolResult } from "./types.js";
import type { LLMToolDefinition } from "../types.js";

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  getDefinitions(): LLMToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: "object" as const,
        properties: t.parameters.properties,
        required: t.parameters.required,
      },
    }));
  }

  async execute(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { output: `Unknown tool: ${name}`, isError: true };
    }
    try {
      return await tool.execute(args);
    } catch (err) {
      return {
        output: `Tool error: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      };
    }
  }
}
