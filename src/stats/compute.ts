import type { StatsData, OverviewStats, ModelBreakdown, Filter, DailyStats, ModelUsage } from "./types.js";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getFilterKeys(data: StatsData, filter: Filter): string[] {
  const today = new Date();
  let days: number;
  switch (filter) {
    case "7d": days = 6; break;
    case "30d": days = 29; break;
    case "all": return Object.keys(data.daily);
  }
  const keys: string[] = [];
  for (let i = days; i >= 0; i--) {
    keys.push(dateKey(addDays(today, -i)));
  }
  return keys;
}

function totalTokensOf(mu: ModelUsage): number {
  return mu.inputTokens + mu.outputTokens;
}

function totalTokensAllModels(models: Record<string, ModelUsage>): number {
  let t = 0;
  for (const m of Object.values(models)) t += totalTokensOf(m);
  return t;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function computeOverviewStats(data: StatsData): OverviewStats {
  // Total tokens
  let totalTokens = 0;
  for (const day of Object.values(data.daily)) {
    totalTokens += totalTokensAllModels(day.models);
  }

  // Sessions
  const sessions = Object.values(data.sessions);
  const sessionsCount = sessions.length;

  // Longest session
  let longestMs = 0;
  for (const s of sessions) {
    const dur = new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime();
    if (dur > longestMs) longestMs = dur;
  }

  // Active days
  const activeDays = Object.keys(data.daily).filter(k => totalTokensAllModels(data.daily[k].models) > 0).length;

  // Streaks
  const { current: currentStreak, longest: longestStreak } = computeStreaks(data.daily);

  // Most active day
  const mostActiveDay = computeMostActiveDay(data.daily);

  // Favorite model
  const favoriteModel = computeFavoriteModel(data);

  return {
    totalTokens,
    sessionsCount,
    longestSession: longestMs > 0 ? formatDuration(longestMs) : "0s",
    activeDays,
    longestStreak,
    currentStreak,
    mostActiveDay,
    favoriteModel,
  };
}

export function computeStreaks(daily: Record<string, DailyStats>): { current: number; longest: number } {
  const activeDates = Object.keys(daily)
    .filter(k => totalTokensAllModels(daily[k].models) > 0)
    .sort();

  if (activeDates.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let currentRun = 1;

  for (let i = 1; i < activeDates.length; i++) {
    const prev = new Date(activeDates[i - 1]);
    const curr = new Date(activeDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      currentRun++;
    } else {
      if (currentRun > longest) longest = currentRun;
      currentRun = 1;
    }
  }
  if (currentRun > longest) longest = currentRun;

  // Current streak: count backward from today
  let current = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = dateKey(addDays(today, -i));
    if (daily[d] && totalTokensAllModels(daily[d].models) > 0) {
      current++;
    } else {
      break;
    }
  }

  return { current, longest };
}

export function computeMostActiveDay(daily: Record<string, DailyStats>): string {
  const dayTotals = new Array(7).fill(0) as number[];
  for (const [key, day] of Object.entries(daily)) {
    const d = new Date(key);
    dayTotals[d.getDay()] += totalTokensAllModels(day.models);
  }
  let maxIdx = 0;
  for (let i = 1; i < 7; i++) {
    if (dayTotals[i] > dayTotals[maxIdx]) maxIdx = i;
  }
  return DAY_NAMES[maxIdx];
}

export function computeFavoriteModel(data: StatsData): string {
  const modelTotals: Record<string, number> = {};
  for (const day of Object.values(data.daily)) {
    for (const [model, mu] of Object.entries(day.models)) {
      modelTotals[model] = (modelTotals[model] ?? 0) + totalTokensOf(mu);
    }
  }
  let best = "none";
  let bestVal = 0;
  for (const [model, total] of Object.entries(modelTotals)) {
    if (total > bestVal) {
      bestVal = total;
      best = model;
    }
  }
  return best;
}

export function computeModelBreakdown(data: StatsData, filter: Filter): ModelBreakdown[] {
  const keys = getFilterKeys(data, filter);
  const modelTotals: Record<string, { input: number; output: number }> = {};
  let grandTotal = 0;

  for (const key of keys) {
    const day = data.daily[key];
    if (!day) continue;
    for (const [model, mu] of Object.entries(day.models)) {
      if (!modelTotals[model]) modelTotals[model] = { input: 0, output: 0 };
      modelTotals[model].input += mu.inputTokens;
      modelTotals[model].output += mu.outputTokens;
      grandTotal += mu.inputTokens + mu.outputTokens;
    }
  }

  const breakdown: ModelBreakdown[] = [];
  for (const [model, vals] of Object.entries(modelTotals)) {
    const total = vals.input + vals.output;
    breakdown.push({
      model,
      percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      inputTokens: vals.input,
      outputTokens: vals.output,
    });
  }

  breakdown.sort((a, b) => (b.inputTokens + b.outputTokens) - (a.inputTokens + a.outputTokens));
  return breakdown;
}

export function getUniqueModels(data: StatsData): string[] {
  const models = new Set<string>();
  for (const day of Object.values(data.daily)) {
    for (const model of Object.keys(day.models)) {
      models.add(model);
    }
  }
  return [...models];
}
