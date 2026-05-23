import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createTwoFilesPatch } from "diff";
import type { ToolDefinition } from "./types.js";

export const diffTool: ToolDefinition = {
  name: "diff",
  description: "Compare two files or two strings and show a unified diff",
  parameters: {
    type: "object",
    properties: {
      pathA: { type: "string", description: "Path to the first (old) file" },
      pathB: { type: "string", description: "Path to the second (new) file" },
      old: { type: "string", description: "Old text content (instead of pathA)" },
      new: { type: "string", description: "New text content (instead of pathB)" },
      labelA: { type: "string", description: "Display label for old side (default: auto)" },
      labelB: { type: "string", description: "Display label for new side (default: auto)" },
    },
    required: [],
  },
  async execute(args) {
    try {
      let oldText: string;
      let newText: string;
      let labelA: string;
      let labelB: string;

      if (args.pathA && args.pathB) {
        const pA = resolve(String(args.pathA));
        const pB = resolve(String(args.pathB));
        oldText = await readFile(pA, "utf-8");
        newText = await readFile(pB, "utf-8");
        labelA = String(args.labelA ?? args.pathA);
        labelB = String(args.labelB ?? args.pathB);
      } else if (args.old !== undefined && args.new !== undefined) {
        oldText = String(args.old);
        newText = String(args.new);
        labelA = String(args.labelA ?? "old");
        labelB = String(args.labelB ?? "new");
      } else {
        return { output: "Provide either (pathA + pathB) or (old + new) arguments.", isError: true };
      }

      const output = createTwoFilesPatch(labelA, labelB, oldText, newText);
      // Strip "Index:" and "=== ... ===" header lines — not useful in terminal display
      const trimmed = output.replace(/^(Index:.*\n)?=+\n/, "");
      // If no hunk markers, files are identical
      if (!trimmed.includes("@@")) return { output: "(no differences)" };
      return { output: trimmed };
    } catch (err) {
      return {
        output: `Diff failed: ${err instanceof Error ? err.message : String(err)}`,
        isError: true,
      };
    }
  },
};
