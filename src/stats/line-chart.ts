import chalk from "chalk";
import type { DailyStats, Filter } from "./types.js";

const MODEL_COLORS = ["cyan", "yellow", "green", "magenta", "red", "blue"] as const;
const CHART_HEIGHT = 10;
const Y_LABEL_WIDTH = 7;
const MAX_CHART_WIDTH = 60;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getFilterDates(filter: Filter): string[] {
  const today = new Date();
  let days: number;
  switch (filter) {
    case "7d": days = 6; break;
    case "30d": days = 29; break;
    case "all": days = 364; break;
  }
  const dates: string[] = [];
  for (let i = days; i >= 0; i--) {
    dates.push(dateKey(addDays(today, -i)));
  }
  return dates;
}

function formatTokenLabel(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function getModelTokens(day: DailyStats | undefined, model: string): number {
  if (!day?.models[model]) return 0;
  const m = day.models[model];
  return m.inputTokens + m.outputTokens;
}

function valueToRow(val: number, maxVal: number): number {
  if (val <= 0) return CHART_HEIGHT;
  return Math.max(0, Math.min(CHART_HEIGHT, Math.round((val / maxVal) * CHART_HEIGHT)));
}

export function renderLineChart(
  daily: Record<string, DailyStats>,
  filter: Filter,
  models: string[],
): string[] {
  const allDates = getFilterDates(filter);
  if (allDates.length === 0 || models.length === 0) return ["  No data"];

  // Find dates that have any data
  const activeDates = allDates.filter(d => {
    for (const model of models) {
      if (getModelTokens(daily[d], model) > 0) return true;
    }
    return false;
  });

  if (activeDates.length === 0) return ["  No data"];

  // Find max value for Y scaling
  let maxVal = 0;
  for (const date of activeDates) {
    for (const model of models) {
      const v = getModelTokens(daily[date], model);
      if (v > maxVal) maxVal = v;
    }
  }
  if (maxVal === 0) return ["  No data"];

  // Sample dates if too many for display
  let displayDates: string[];
  if (activeDates.length <= MAX_CHART_WIDTH) {
    displayDates = activeDates;
  } else {
    const step = activeDates.length / MAX_CHART_WIDTH;
    displayDates = [];
    for (let i = 0; i < MAX_CHART_WIDTH; i++) {
      displayDates.push(activeDates[Math.floor(i * step)]);
    }
  }

  const width = displayDates.length;

  // Y-axis labels
  const yLabels: string[] = [];
  for (let i = CHART_HEIGHT; i >= 0; i--) {
    const val = Math.round((maxVal / CHART_HEIGHT) * i);
    yLabels.push(formatTokenLabel(val).padStart(Y_LABEL_WIDTH));
  }

  // Model color map
  const modelColorMap = new Map<string, string>();
  models.forEach((m, i) => {
    modelColorMap.set(m, MODEL_COLORS[i % MODEL_COLORS.length]);
  });

  // Grid: each cell is { mi, char } or null
  type Cell = { mi: number; char: string };
  const grid: (Cell | null)[][] = [];
  for (let r = 0; r <= CHART_HEIGHT; r++) {
    grid.push(new Array(width).fill(null));
  }

  // Plot each model with smooth connected lines
  for (let mi = 0; mi < models.length; mi++) {
    const model = models[mi];

    // Collect data points as (row, col) pairs
    const points: { row: number; col: number }[] = [];
    for (let col = 0; col < width; col++) {
      const val = getModelTokens(daily[displayDates[col]], model);
      if (val === 0) continue;
      const row = CHART_HEIGHT - valueToRow(val, maxVal);
      points.push({ row, col });
    }

    if (points.length < 2) {
      // Single point or no points — just draw dot
      for (const p of points) {
        grid[p.row][p.col] = { mi, char: "●" };
      }
      continue;
    }

    // Draw connections between consecutive data points
    for (let i = 0; i < points.length - 1; i++) {
      const cur = points[i];
      const nxt = points[i + 1];
      const turnCol = nxt.col;

      if (cur.row === nxt.row) {
        // Same row — horizontal line
        for (let c = cur.col + 1; c < nxt.col; c++) {
          grid[cur.row][c] = { mi, char: "─" };
        }
      } else if (cur.row > nxt.row) {
        // Goes UP (row decreases = value increases)
        // Horizontal at source row
        for (let c = cur.col + 1; c < turnCol; c++) {
          grid[cur.row][c] = { mi, char: "─" };
        }
        // Corner at (sourceRow, turnCol): LEFT + UP
        grid[cur.row][turnCol] = { mi, char: "╯" };
        // Vertical at turnCol
        for (let r = cur.row - 1; r > nxt.row; r--) {
          grid[r][turnCol] = { mi, char: "│" };
        }
      } else {
        // Goes DOWN (row increases = value decreases)
        // Horizontal at source row
        for (let c = cur.col + 1; c < turnCol; c++) {
          grid[cur.row][c] = { mi, char: "─" };
        }
        // Corner at (sourceRow, turnCol): LEFT + DOWN
        grid[cur.row][turnCol] = { mi, char: "╮" };
        // Vertical at turnCol
        for (let r = cur.row + 1; r < nxt.row; r++) {
          grid[r][turnCol] = { mi, char: "│" };
        }
      }
    }

    // Now draw data point characters based on connections
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let hasLeft = false, hasRight = false, hasUp = false, hasDown = false;

      // Incoming: vertical arrives at this column from prev data point's row
      if (i > 0) {
        const prev = points[i - 1];
        if (prev.row === p.row) {
          hasLeft = true;
        } else if (prev.row < p.row) {
          hasUp = true; // prev is above, vertical extends upward from here
        } else {
          hasDown = true; // prev is below, vertical extends downward from here
        }
      }

      // Outgoing: always horizontal going right to next turn column
      if (i < points.length - 1) {
        hasRight = true;
      }

      // Determine character based on connection directions
      let char: string;
      if (hasLeft && hasUp) char = "╯";
      else if (hasLeft && hasDown) char = "╮";
      else if (hasRight && hasUp) char = "╰";
      else if (hasRight && hasDown) char = "╭";
      else if (hasLeft || hasRight) char = "─";
      else if (hasUp || hasDown) char = "│";
      else char = "●";

      grid[p.row][p.col] = { mi, char };
    }
  }

  // Render
  const lines: string[] = [];
  lines.push(chalk.bold("  Tokens per Day"));
  lines.push("");

  for (let r = 0; r <= CHART_HEIGHT; r++) {
    let line = yLabels[r] + " ┤";
    for (let c = 0; c < width; c++) {
      const cell = grid[r][c];
      if (cell) {
        const color = modelColorMap.get(models[cell.mi]) ?? "white";
        line += (chalk as any)[color](cell.char);
      } else {
        line += " ";
      }
    }
    lines.push(line);
  }

  // X-axis
  let xAxis = " ".repeat(Y_LABEL_WIDTH) + " └";
  for (let c = 0; c < width; c++) xAxis += "─";
  lines.push(xAxis);

  // X-axis date labels
  let xLabels = " ".repeat(Y_LABEL_WIDTH) + "  ";
  const labelStep = width <= 7 ? 1 : width <= 20 ? 3 : Math.max(1, Math.floor(width / 6));
  for (let c = 0; c < width; c++) {
    if (c % labelStep === 0) {
      const parts = displayDates[c].split("-");
      const label = `${parts[1]}/${parts[2]}`;
      xLabels += label;
      for (let s = 1; s < label.length; s++) {
        if (c + 1 < width) { xLabels += " "; c++; }
      }
    } else {
      xLabels += " ";
    }
  }
  lines.push(xLabels);

  // Legend
  lines.push("");
  let legend = "  ";
  for (const model of models) {
    const color = modelColorMap.get(model) ?? "white";
    legend += (chalk as any)[color]("●") + ` ${model}  `;
  }
  lines.push(legend);

  return lines;
}
