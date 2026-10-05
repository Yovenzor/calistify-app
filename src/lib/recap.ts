import { weekStart } from "@/lib/format";
import { longestStreak, type WorkoutSummaryDoc } from "@/lib/stats";

export type RecapMuscle = { id: string; pct: number };
export type RecapPr = {
  key: string;
  exerciseName: string;
  metric: string;
  value: number;
};

export type MonthlyRecapData = {
  /** "September 2026" */
  monthLabel: string;
  /** "2026-09" — also the localStorage key suffix (one recap per month). */
  monthKey: string;
  workouts: number;
  durationSec: number;
  volumeKg: number;
  /** Share of total muscle activation, descending (most → least worked). */
  muscles: RecapMuscle[];
  prs: RecapPr[];
  /** Longest run of consecutive training days inside the month. */
  dayStreak: number;
  /** Longest run of consecutive weeks with at least one workout. */
  weekStreak: number;
};

type RawWorkout = WorkoutSummaryDoc & {
  muscleActivation?: Record<string, number>;
};
type RawPr = {
  _id: string;
  date: number;
  exerciseName: string;
  metric: string;
  value: number;
};

/**
 * Recap of the calendar month BEFORE `now` (reviewed on the 1st).
 * Returns null when that month has no workouts — nothing to celebrate.
 * Pure function: fully testable without React or Convex.
 */
export function computeMonthlyRecap(
  workouts: RawWorkout[],
  records: RawPr[],
  now: Date = new Date(),
): MonthlyRecapData | null {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = start.getTime();
  const to = end.getTime();

  const month = workouts.filter((w) => w.date >= from && w.date < to);
  if (month.length === 0) return null;

  let durationSec = 0;
  let volumeKg = 0;
  const activation = new Map<string, number>();
  let activationTotal = 0;
  for (const w of month) {
    durationSec += w.durationSec;
    volumeKg += w.volume;
    for (const [muscle, score] of Object.entries(w.muscleActivation ?? {})) {
      activation.set(muscle, (activation.get(muscle) ?? 0) + score);
      activationTotal += score;
    }
  }

  const muscles: RecapMuscle[] = Array.from(activation.entries())
    .filter(([, score]) => score > 0 && activationTotal > 0)
    .map(([id, score]) => ({
      id,
      pct: Math.round((score / activationTotal) * 100),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  const prs: RecapPr[] = records
    .filter((r) => r.date >= from && r.date < to)
    .sort((a, b) => b.date - a.date)
    .map((r) => ({
      key: `${r._id}`,
      exerciseName: r.exerciseName,
      metric: r.metric,
      value: r.value,
    }));

  const dayStreak = longestStreak(month);

  const weeks = Array.from(
    new Set(month.map((w) => weekStart(new Date(w.date)).getTime())),
  ).sort((a, b) => a - b);
  let weekStreak = weeks.length > 0 ? 1 : 0;
  let run = weekStreak;
  for (let i = 1; i < weeks.length; i++) {
    const gap = Math.round((weeks[i] - weeks[i - 1]) / 86_400_000);
    if (gap === 7) {
      run += 1;
      weekStreak = Math.max(weekStreak, run);
    } else {
      run = 1;
    }
  }

  return {
    monthLabel: start.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    monthKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    workouts: month.length,
    durationSec,
    volumeKg,
    muscles,
    prs,
    dayStreak,
    weekStreak,
  };
}
