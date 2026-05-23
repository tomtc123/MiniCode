import type { TokenUsage } from "../types.js";

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  totalDuration: number; // ms
  requests: number;
}

export interface DailyStats {
  date: string; // "YYYY-MM-DD"
  models: Record<string, ModelUsage>;
}

export interface SessionStats {
  id: string;
  startedAt: string; // ISO 8601
  endedAt: string;   // ISO 8601
  models: Record<string, ModelUsage>;
  messageCount: number;
}

export interface StatsData {
  version: 1;
  daily: Record<string, DailyStats>;      // keyed by "YYYY-MM-DD"
  sessions: Record<string, SessionStats>;  // keyed by session id
}

export type Filter = "all" | "7d" | "30d";

export interface OverviewStats {
  totalTokens: number;
  totalThinkingTokens: number;
  totalDuration: string;   // human-readable
  sessionsCount: number;
  longestSession: string;  // human-readable duration
  activeDays: number;
  longestStreak: number;
  currentStreak: number;
  mostActiveDay: string;
  favoriteModel: string;
}

export interface ModelBreakdown {
  model: string;
  percentage: number;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  duration: number; // ms
}
