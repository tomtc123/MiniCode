import { config } from "dotenv";
import { z } from "zod";
import type { Config } from "./types.js";

config();

const ConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic", "deepseek", "mock"]).default("mock"),
  apiKey: z.string().default(""),
  model: z.string().optional(),
  baseURL: z.string().url().optional(),
  systemPrompt: z
    .string()
    .default(
      "You are a helpful coding assistant. You can read and write files and run shell commands."
    ),
  maxTokens: z.number().default(4096),
});

export function loadConfig(overrides?: Partial<Config>): Config {
  const env: Record<string, unknown> = {};

  const provider = process.env.MINICODE_PROVIDER;
  if (provider) env.provider = provider;

  const apiKey =
    process.env.MINICODE_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY;
  if (apiKey) env.apiKey = apiKey;

  const model = process.env.MINICODE_MODEL;
  if (model) env.model = model;

  const baseURL = process.env.MINICODE_BASE_URL;
  if (baseURL) env.baseURL = baseURL;

  const systemPrompt = process.env.MINICODE_SYSTEM_PROMPT;
  if (systemPrompt) env.systemPrompt = systemPrompt;

  const maxTokens = process.env.MINICODE_MAX_TOKENS;
  if (maxTokens) env.maxTokens = parseInt(maxTokens, 10);

  const merged = { ...env, ...overrides };
  const cleaned = Object.fromEntries(
    Object.entries(merged).filter(([, v]) => v !== undefined)
  );

  return ConfigSchema.parse(cleaned);
}
