import fs from "fs/promises";
import path from "path";
import os from "os";
import type { TokenUsage } from "../types.js";
import type { StatsData, DailyStats, ModelUsage, SessionStats } from "./types.js";
import { generateSeedData } from "./seed.js";

const STATS_DIR = path.join(os.homedir(), ".minicode");
const STATS_FILE = path.join(STATS_DIR, "stats.json");
const FLUSH_INTERVAL = 5000;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyData(): StatsData {
  return { version: 1, daily: {}, sessions: {} };
}

function ensureModelUsage(models: Record<string, ModelUsage>, model: string): ModelUsage {
  if (!models[model]) {
    models[model] = { inputTokens: 0, outputTokens: 0, thinkingTokens: 0, totalDuration: 0, requests: 0 };
  }
  return models[model];
}

export class StatsStore {
  private data: StatsData;
  private dirty = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private loaded = false;

  constructor() {
    this.data = emptyData();
  }

  async init(): Promise<void> {
    try {
      await fs.mkdir(STATS_DIR, { recursive: true });
      const raw = await fs.readFile(STATS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1) {
        this.data = parsed;
      }
    } catch {
      // File doesn't exist or is invalid — start fresh
    }
    this.loaded = true;
  }

  loadSeedData(): void {
    const seed = generateSeedData();
    // Merge seed daily data (don't overwrite existing)
    for (const [key, day] of Object.entries(seed.daily)) {
      if (!this.data.daily[key]) {
        this.data.daily[key] = day;
      }
    }
    // Merge seed sessions
    for (const [key, session] of Object.entries(seed.sessions)) {
      if (!this.data.sessions[key]) {
        this.data.sessions[key] = session;
      }
    }
    // Don't persist seed data to file - it should only exist in current session
  }

  recordUsage(model: string, usage: TokenUsage, duration?: number): void {
    const key = todayKey();
    if (!this.data.daily[key]) {
      this.data.daily[key] = { date: key, models: {} };
    }
    const mu = ensureModelUsage(this.data.daily[key].models, model);
    mu.inputTokens += usage.inputTokens;
    mu.outputTokens += usage.outputTokens;
    mu.thinkingTokens += usage.thinkingTokens ?? 0;
    mu.totalDuration += duration ?? 0;
    mu.requests += 1;
    this.scheduleFlush();
  }

  startSession(): string {
    const id = `s_${Date.now()}`;
    const session: SessionStats = {
      id,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      models: {},
      messageCount: 0,
    };
    this.data.sessions[id] = session;
    return id;
  }

  endSession(sessionId: string, messageCount: number): void {
    const session = this.data.sessions[sessionId];
    if (session) {
      session.endedAt = new Date().toISOString();
      session.messageCount = messageCount;
      this.scheduleFlush();
    }
  }

  recordSessionUsage(sessionId: string, model: string, usage: TokenUsage, duration?: number): void {
    const session = this.data.sessions[sessionId];
    if (session) {
      const mu = ensureModelUsage(session.models, model);
      mu.inputTokens += usage.inputTokens;
      mu.outputTokens += usage.outputTokens;
      mu.thinkingTokens += usage.thinkingTokens ?? 0;
      mu.totalDuration += duration ?? 0;
      mu.requests += 1;
    }
  }

  getData(): StatsData {
    return this.data;
  }

  async flush(): Promise<void> {
    if (!this.dirty || !this.loaded) return;
    this.dirty = false;
    try {
      await fs.writeFile(STATS_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch {
      // Ignore write errors
    }
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  private scheduleFlush(): void {
    this.dirty = true;
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, FLUSH_INTERVAL);
  }
}

// Singleton instance
let _instance: StatsStore | null = null;

export function getStatsStore(): StatsStore {
  if (!_instance) {
    _instance = new StatsStore();
  }
  return _instance;
}
