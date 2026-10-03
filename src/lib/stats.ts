import type { MuscleGroup } from "./muscles";
import { getExercise } from "./exercises";
import { dateKey, startOfDay, weekStart } from "./format";

/** Raw set as logged in the active workout. Weights are canonical kg. */
export interface SetInput {
  weightKg: number;
  reps: number;
  durationSec?: number;
  rpe?: number;
  isBodyweight: boolean;
}

export interface ExerciseInput {
  exerciseId: string;
  sets: SetInput[];
  notes?: string;
}

export interface WorkoutStats {
  exerciseCount: number;
  setCount: number;
  repCount: number;
  volume: number;
  muscleActivation: Record<string, number>;
}

/** A set counts toward stats once it has reps or a logged hold duration. */
export function setCounts(s: SetInput): boolean {
  return (s.reps > 0 && Number.isFinite(s.reps)) || (s.durationSec ?? 0) > 0;
}

export function setVolume(s: SetInput, bodyweightKg: number): number {
  if (!setCounts(s)) return 0;
  const effective = (s.isBodyweight ? bodyweightKg : 0) + Math.max(0, s.weightKg);
  if (s.reps > 0) return effective * s.reps;
  return 0;
}

/**
 * Aggregates a workout's totals from raw logging data.
 * Used identically on the client (for the completion screen) and on the
 * server (for persisted documents) so the numbers can never disagree.
 */
export function computeWorkoutStats(
  exercises: ExerciseInput[],
  bodyweightKg: number,
): WorkoutStats {
  const activation: Record<string, number> = {};
  let setCount = 0;
  let repCount = 0;
  let volume = 0;
  let exerciseCount = 0;

  for (const ex of exercises) {
    const def = getExercise(ex.exerciseId);
    if (!def) continue;
    const counted = ex.sets.filter(setCounts);
    if (counted.length === 0) continue;
    exerciseCount += 1;

    for (const s of counted) {
      setCount += 1;
      repCount += s.reps > 0 ? s.reps : 0;
      volume += setVolume(s, bodyweightKg);

      const load =
        s.reps > 0
          ? Math.min(Math.max(s.reps, 1), 20) / 10
          : Math.max(1, (s.durationSec ?? 0) / 5);
      for (const m of def.primary) {
        activation[m] = (activation[m] ?? 0) + load;
      }
      for (const m of def.secondary) {
        activation[m] = (activation[m] ?? 0) + load * 0.5;
      }
    }
  }

  return { exerciseCount, setCount, repCount, volume, muscleActivation: activation };
}

/* ── Aggregates over saved workouts ───────────────────────────────────── */

export interface WorkoutSummaryDoc {
  _id: string;
  date: number;
  day: string;
  durationSec: number;
  volume: number;
  reps: number;
  sets: number;
  name: string;
  exerciseCount: number;
}

export interface Totals {
  totalWorkouts: number;
  totalVolume: number;
  totalReps: number;
  totalSets: number;
  totalDurationSec: number;
}

export function computeTotals(workouts: WorkoutSummaryDoc[]): Totals {
  const t: Totals = {
    totalWorkouts: workouts.length,
    totalVolume: 0,
    totalReps: 0,
    totalSets: 0,
    totalDurationSec: 0,
  };
  for (const w of workouts) {
    t.totalVolume += w.volume;
    t.totalReps += w.reps;
    t.totalSets += w.sets;
    t.totalDurationSec += w.durationSec;
  }
  return t;
}

export function weeklyWorkoutCount(workouts: WorkoutSummaryDoc[]): number {
  const ws = weekStart(new Date()).getTime();
  return workouts.filter((w) => w.date >= ws).length;
}

/** Current streak of consecutive training days (today or yesterday onwards). */
export function currentStreak(workouts: WorkoutSummaryDoc[]): number {
  const days = new Set(workouts.map((w) => dateKey(w.date)));
  if (days.size === 0) return 0;
  const today = startOfDay(new Date());
  let cursor = new Date(today);
  if (!days.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dateKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function longestStreak(workouts: WorkoutSummaryDoc[]): number {
  const keys = Array.from(new Set(workouts.map((w) => dateKey(w.date)))).sort();
  if (keys.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(keys[i - 1]);
    const cur = new Date(keys[i]);
    const gap = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (gap === 1) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

/* ── Chart series ─────────────────────────────────────────────────────── */

export type ChartMetric = "volume" | "reps" | "weight" | "duration";
export type ChartRange = "7D" | "30D" | "3M" | "1Y" | "All";

export interface ChartPoint {
  ts: number;
  value: number;
}

export interface WeightPoint {
  ts: number;
  weightKg: number;
}

function rangeStart(range: ChartRange): number | null {
  const now = Date.now();
  const day = 86_400_000;
  switch (range) {
    case "7D":
      return now - 7 * day;
    case "30D":
      return now - 30 * day;
    case "3M":
      return now - 90 * day;
    case "1Y":
      return now - 365 * day;
    case "All":
      return null;
  }
}

export function buildChartSeries(
  workouts: WorkoutSummaryDoc[],
  weights: WeightPoint[],
  metric: ChartMetric,
  range: ChartRange,
): ChartPoint[] {
  const from = rangeStart(range);

  if (metric === "weight") {
    return weights
      .filter((w) => from === null || w.ts >= from)
      .sort((a, b) => a.ts - b.ts)
      .map((w) => ({ ts: w.ts, value: w.weightKg }));
  }

  const filtered = workouts
    .filter((w) => from === null || w.date >= from)
    .sort((a, b) => a.date - b.date);

  const buckets = new Map<string, ChartPoint>();
  for (const w of filtered) {
    const key = dateKey(w.date);
    const existing = buckets.get(key);
    const value =
      metric === "volume"
        ? w.volume
        : metric === "reps"
          ? w.reps
          : w.durationSec;
    if (existing) existing.value += value;
    else buckets.set(key, { ts: w.date, value });
  }
  return Array.from(buckets.values()).sort((a, b) => a.ts - b.ts);
}
