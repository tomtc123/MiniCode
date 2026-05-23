import { exec } from "node:child_process";
import type { ToolDefinition } from "./types.js";

export const shellTool: ToolDefinition = {
  name: "shell",
  description: "Execute a shell command and return its output",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "The shell command to execute" },
    },
    required: ["command"],
  },
  async execute(args) {
    const cmd = String(args.command);
    const isWindows = process.platform === "win32";

    return new Promise((resolve) => {
      exec(
        cmd,
        { shell: isWindows ? "powershell.exe" : "/bin/sh", maxBuffer: 1024 * 1024 * 10 },
        (error, stdout, stderr) => {
          const trimLines = (s: string) =>
            s.replace(/[^\S\n]+$/gm, "").replace(/\n{3,}/g, "\n\n");
          if (error) {
            resolve({
              output: `${trimLines(stdout)}${trimLines(stderr)}\nExit code: ${error.code}`,
              isError: true,
            });
          } else {
            resolve({ output: trimLines(stdout) || "(no output)" });
          }
        }
      );
    });
  },
};
