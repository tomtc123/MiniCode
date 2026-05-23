import chalk from "chalk";
import type { DailyStats, Filter } from "./types.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getIntensityChar(tokens: number): string {
  if (tokens === 0) return " ";
  if (tokens < 1000) return "░";
  if (tokens < 5000) return "▒";
  if (tokens < 20000) return "▓";
  return "█";
}

function colorize(char: string): string {
  switch (char) {
    case "░": return chalk.green.dim(char);
    case "▒": return chalk.green(char);
    case "▓": return chalk.green.bold(char);
    case "█": return chalk.bold.greenBright(char);
    default: return chalk.dim(char);
  }
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getFilterStartDate(filter: Filter): Date {
  const today = new Date();
  switch (filter) {
    case "7d": return addDays(today, -6);
    case "30d": return addDays(today, -29);
    case "all": return addDays(today, -364);
  }
}

function getTotalTokens(day: DailyStats | undefined): number {
  if (!day) return 0;
  let total = 0;
  for (const m of Object.values(day.models)) {
    total += m.inputTokens + m.outputTokens;
  }
  return total;
}

export function renderHeatmap(
  daily: Record<string, DailyStats>,
  filter: Filter,
): string[] {
  const today = new Date();
  const startDate = getFilterStartDate(filter);

  // Align start to Sunday
  const startDay = startDate.getDay();
  const gridStart = addDays(startDate, -startDay);

  // Build week columns
  const weeks: Date[][] = [];
  let cursor = new Date(gridStart);
  while (cursor <= today || weeks.length < 1) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
    if (weeks.length > 52) break;
  }

  // Only keep last 52 weeks max
  const displayWeeks = weeks.slice(-52);

  // Month labels row
  const labelWidth = 4;
  let monthRow = " ".repeat(labelWidth);
  let lastMonth = -1;
  for (const week of displayWeeks) {
    const firstDay = week[0];
    const m = firstDay.getMonth();
    if (m !== lastMonth) {
      monthRow += MONTHS[m].padEnd(2);
      lastMonth = m;
    } else {
      monthRow += "  ";
    }
  }

  // Day rows
  const rows: string[] = [monthRow];
  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    let row = "";
    // Day label on Mon(1), Wed(3), Fri(5)
    if (dayIdx === 1 || dayIdx === 3 || dayIdx === 5) {
      row = DAY_LABELS[dayIdx].padEnd(labelWidth);
    } else {
      row = " ".repeat(labelWidth);
    }

    for (const week of displayWeeks) {
      const d = week[dayIdx];
      if (d > today) {
        row += "  ";
        continue;
      }
      const key = dateKey(d);
      const dayData = daily[key];
      const tokens = getTotalTokens(dayData);
      const char = getIntensityChar(tokens);
      row += colorize(char) + " ";
    }
    rows.push(row);
  }

  // Legend
  rows.push("");
  rows.push(
    " ".repeat(labelWidth) +
    chalk.dim("Less") + " " +
    colorize("░") + " " + colorize("▒") + " " + colorize("▓") + " " + colorize("█") + " " +
    chalk.dim("More")
  );

  return rows;
}
