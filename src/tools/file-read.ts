import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ToolDefinition } from "./types.js";

export const fileReadTool: ToolDefinition = {
  name: "file_read",
  description: "Read the contents of a file at the given path",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute or relative path to the file" },
    },
    required: ["path"],
  },
  async execute(args) {
    const filePath = resolve(String(args.path));
    try {
      const content = await readFile(filePath, "utf-8");
      return { output: content };
    } catch (err) {
      return {
        output: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      };
    }
  },
};
