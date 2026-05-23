import { useMemo } from "react";
import { Box, Text } from "ink";
import chalk from "chalk";
import hljs from "highlight.js";

interface DiffBlockProps {
  output: string;
}

type LineType = "hdr" | "hunk" | "ctx" | "add" | "del";

interface DiffLine {
  type: LineType;
  oldNum: number | null;
  newNum: number | null;
  content: string;
}

const EXT_LANG: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript", ".mts": "typescript",
  ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
  ".py": "python", ".pyw": "python",
  ".rb": "ruby", ".erb": "erb",
  ".go": "go", ".rs": "rust", ".java": "java", ".kt": "kotlin", ".kts": "kotlin",
  ".c": "c", ".cpp": "cpp", ".cc": "cpp", ".cxx": "cpp",
  ".h": "c", ".hpp": "cpp", ".hxx": "cpp",
  ".cs": "csharp", ".fs": "fsharp",
  ".swift": "swift", ".scala": "scala", ".clj": "clojure",
  ".lua": "lua", ".r": "r", ".R": "r", ".dart": "dart",
  ".php": "php", ".pl": "perl", ".pm": "perl",
  ".json": "json", ".jsonc": "json",
  ".yaml": "yaml", ".yml": "yaml", ".toml": "ini", ".ini": "ini",
  ".xml": "xml", ".svg": "xml", ".html": "html", ".htm": "html",
  ".css": "css", ".scss": "scss", ".sass": "scss", ".less": "less",
  ".md": "markdown", ".mdx": "markdown",
  ".sh": "bash", ".bash": "bash", ".zsh": "bash", ".fish": "bash",
  ".ps1": "powershell", ".bat": "dos", ".cmd": "dos",
  ".sql": "sql", ".graphql": "graphql", ".gql": "graphql",
  ".proto": "protobuf",
  ".dockerfile": "dockerfile", ".makefile": "makefile", ".cmake": "cmake",
  ".tf": "hcl", ".hcl": "hcl",
  ".vim": "vim", ".el": "lisp", ".lisp": "lisp",
  ".ex": "elixir", ".exs": "elixir", ".erl": "erlang",
  ".hs": "haskell", ".ml": "ocaml",
  ".vue": "vue", ".svelte": "xml",
  ".txt": "text",
};

const HLJS_COLORS: Record<string, typeof chalk> = {
  "hljs-keyword": chalk.blue,
  "hljs-built_in": chalk.cyan,
  "hljs-string": chalk.green,
  "hljs-number": chalk.yellow,
  "hljs-comment": chalk.gray,
  "hljs-function": chalk.yellow,
  "hljs-title": chalk.yellow,
  "hljs-params": chalk.white,
  "hljs-type": chalk.cyan,
  "hljs-literal": chalk.red,
  "hljs-attr": chalk.cyan,
  "hljs-variable": chalk.red,
  "hljs-symbol": chalk.green,
  "hljs-meta": chalk.yellow,
  "hljs-selector-class": chalk.yellow,
  "hljs-selector-tag": chalk.blue,
  "hljs-attribute": chalk.green,
  "hljs-section": chalk.blue,
  "hljs-bullet": chalk.green,
  "hljs-link": chalk.cyan,
};

function htmlToAnsi(html: string): string {
  const re = /<span class="([^"]+)">|<\/span>|([^<]+)/g;
  let m: RegExpExecArray | null;
  const stack: (typeof chalk | null)[] = [];
  const parts: string[] = [];

  while ((m = re.exec(html)) !== null) {
    if (m[2]) {
      const text = m[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const fn = stack.length > 0 ? stack[stack.length - 1] : null;
      parts.push(fn ? fn(text) : text);
    } else if (m[1]) {
      const cls = m[1].split(" ").find(c => HLJS_COLORS[c]);
      stack.push(cls ? HLJS_COLORS[cls] : null);
    } else {
      stack.pop();
    }
  }
  return parts.join("");
}

function highlightCode(code: string, language: string): string {
  try {
    const { value } = hljs.highlight(code, { language });
    return htmlToAnsi(value);
  } catch {
    return code;
  }
}

function detectLanguage(hdrLines: DiffLine[]): string | undefined {
  for (const line of hdrLines) {
    const m = line.content.match(/^\+\+\+ (.+)$/);
    if (m) {
      const path = m[1].replace(/^b\//, "");
      const ext = "." + path.split(".").pop()!.toLowerCase();
      return EXT_LANG[ext];
    }
  }
  return undefined;
}

function parseDiff(output: string): { lines: DiffLine[]; added: number; removed: number } {
  const raw = output.split("\n");
  const lines: DiffLine[] = [];
  let oldNum = 0;
  let newNum = 0;
  let added = 0;
  let removed = 0;

  for (const line of raw) {
    if (line.startsWith("--- ") || line.startsWith("+++ ")) {
      lines.push({ type: "hdr", oldNum: null, newNum: null, content: line });
    } else if (line.startsWith("@@")) {
      const m = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (m) {
        oldNum = parseInt(m[1], 10) - 1;
        newNum = parseInt(m[2], 10) - 1;
      }
      lines.push({ type: "hunk", oldNum: null, newNum: null, content: line });
    } else if (line.startsWith("+")) {
      newNum++;
      added++;
      lines.push({ type: "add", oldNum: null, newNum, content: line.slice(1) });
    } else if (line.startsWith("-")) {
      oldNum++;
      removed++;
      lines.push({ type: "del", oldNum, newNum: null, content: line.slice(1) });
    } else if (line.startsWith(" ") || line === "") {
      oldNum++;
      newNum++;
      lines.push({ type: "ctx", oldNum, newNum, content: line.length > 0 ? line.slice(1) : "" });
    } else {
      lines.push({ type: "ctx", oldNum: null, newNum: null, content: line });
    }
  }

  return { lines, added, removed };
}

const W = 4;

export function DiffBlock({ output }: DiffBlockProps) {
  const { lines, added, removed } = useMemo(() => parseDiff(output), [output]);
  const language = useMemo(() => detectLanguage(lines.filter(l => l.type === "hdr")), [lines]);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} paddingY={0} marginY={0}>
      <Text color="gray" dimColor>{`Added ${added} lines, removed ${removed} lines`}</Text>
      {lines.map((line, i) => {
        if (line.type === "hdr") {
          return (
            <Text key={i} bold color="white">
              {line.content}
            </Text>
          );
        }

        if (line.type === "hunk") {
          return (
            <Text key={i} color="yellow">
              {line.content}
            </Text>
          );
        }

        const old = line.oldNum !== null ? String(line.oldNum).padStart(W) : " ".repeat(W);
        const nw = line.newNum !== null ? String(line.newNum).padStart(W) : " ".repeat(W);
        const marker = line.type === "del" ? "-" : line.type === "add" ? "+" : " ";
        const prefix = `${old} ${nw} ${marker} `;
        const highlighted = language ? highlightCode(line.content, language) : line.content;

        if (line.type === "add") {
          return (
            <Text key={i} color="white" backgroundColor="#003a00">
              {prefix + highlighted}
            </Text>
          );
        }

        if (line.type === "del") {
          return (
            <Text key={i} color="white" backgroundColor="#3a0000">
              {prefix + highlighted}
            </Text>
          );
        }

        return (
          <Text key={i} color="gray">
            {prefix + line.content}
          </Text>
        );
      })}
    </Box>
  );
}
