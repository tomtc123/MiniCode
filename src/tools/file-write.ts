import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import type { ToolDefinition } from "./types.js";

export const fileWriteTool: ToolDefinition = {
  name: "file_write",
  description: "Write content to a file at the given path, creating directories as needed",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute or relative path to the file" },
      content: { type: "string", description: "Content to write to the file" },
    },
    required: ["path", "content"],
  },
  async execute(args) {
    const filePath = resolve(String(args.path));
    try {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, String(args.content), "utf-8");
      return { output: `File written: ${filePath}` };
    } catch (err) {
      return {
        output: `Failed to write file: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      };
    }
  },
};
