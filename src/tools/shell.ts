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
    const shell = isWindows ? "cmd" : "/bin/sh";
    const flag = isWindows ? "/c" : "-c";

    return new Promise((resolve) => {
      exec(
        cmd,
        { shell: isWindows ? "cmd.exe" : "/bin/sh", maxBuffer: 1024 * 1024 * 10 },
        (error, stdout, stderr) => {
          if (error) {
            resolve({
              output: `${stdout}${stderr}\nExit code: ${error.code}`,
              isError: true,
            });
          } else {
            resolve({ output: stdout || "(no output)" });
          }
        }
      );
    });
  },
};
