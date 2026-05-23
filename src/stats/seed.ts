import type { StatsData, DailyStats, SessionStats, ModelUsage } from "./types.js";

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeModelUsage(inputTokens: number, outputTokens: number, requests: number): ModelUsage {
  return { inputTokens, outputTokens, requests };
}

export function generateSeedData(): StatsData {
  const data: StatsData = { version: 1, daily: {}, sessions: {} };
  const today = new Date();

  // Generate 365 days of activity data
  // Pattern: active streaks of 3-8 days, rest 1-2 days, varying intensity
  let dayOffset = -364;
  let streakLen = 0;
  let restLen = 0;

  while (dayOffset <= 0) {
    const date = addDays(today, dayOffset);
    const key = dateKey(date);

    // Decide if this is a rest day
    if (restLen > 0) {
      restLen--;
      dayOffset++;
      continue;
    }

    // Start a new streak
    if (streakLen <= 0) {
      streakLen = rand(3, 8);
      restLen = rand(0, 2);
    }
    streakLen--;

    // Determine activity level (0-3 scale)
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseIntensity = isWeekend ? rand(0, 2) : rand(1, 3);

    if (baseIntensity === 0 && Math.random() < 0.5) {
      dayOffset++;
      continue;
    }

    // Model distribution: mimo-v2.5-pro ~90%, deepseek-v4-pro ~10%
    const useDeepseek = Math.random() < 0.12;
    const models: Record<string, ModelUsage> = {};

    if (baseIntensity >= 1) {
      // mimo-v2.5-pro usage
      const mimoInput = rand(80_000, 600_000) * baseIntensity;
      const mimoOutput = rand(20_000, 150_000) * baseIntensity;
      const mimoRequests = rand(5, 30) * baseIntensity;
      models["mimo-v2.5-pro"] = makeModelUsage(mimoInput, mimoOutput, mimoRequests);
    }

    if (useDeepseek && baseIntensity >= 1) {
      // deepseek-v4-pro usage (smaller portion)
      const dsInput = rand(30_000, 200_000);
      const dsOutput = rand(5_000, 50_000);
      const dsRequests = rand(2, 10);
      models["deepseek-v4-pro"] = makeModelUsage(dsInput, dsOutput, dsRequests);
    }

    if (Object.keys(models).length > 0) {
      data.daily[key] = { date: key, models };
    }

    dayOffset++;
  }

  // Generate sessions: 1-3 sessions per active day
  const activeDays = Object.keys(data.daily).sort();
  let sessionId = 1;

  for (const dayKey of activeDays) {
    const day = data.daily[dayKey];
    const numSessions = rand(1, 3);

    for (let s = 0; s < numSessions; s++) {
      const startHour = rand(9, 22);
      const startMin = rand(0, 59);
      const durationMs = rand(5 * 60 * 1000, 120 * 60 * 1000); // 5min to 2h

      const startDate = new Date(dayKey);
      startDate.setHours(startHour, startMin, 0, 0);
      const endDate = new Date(startDate.getTime() + durationMs);

      // Distribute day's tokens across sessions
      const sessionModels: Record<string, ModelUsage> = {};
      for (const [model, dayMu] of Object.entries(day.models)) {
        const frac = numSessions === 1 ? 1 : rand(20, 80) / 100;
        sessionModels[model] = makeModelUsage(
          Math.round(dayMu.inputTokens * frac / numSessions),
          Math.round(dayMu.outputTokens * frac / numSessions),
          Math.round(dayMu.requests * frac / numSessions),
        );
      }

      const session: SessionStats = {
        id: `s_seed_${sessionId++}`,
        startedAt: startDate.toISOString(),
        endedAt: endDate.toISOString(),
        models: sessionModels,
        messageCount: rand(5, 80),
      };
      data.sessions[session.id] = session;
    }
  }

  return data;
}
