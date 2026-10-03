import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import type { MuscleGroup } from "@/lib/muscles";
import {
  computeTotals,
  currentStreak,
  weeklyWorkoutCount,
  type Totals,
  type WorkoutSummaryDoc,
} from "@/lib/stats";
import { weekStart } from "@/lib/format";

export interface WeekDay {
  key: string;
  label: string;
  workouts: WorkoutSummaryDoc[];
}

/**
 * Everything the dashboard needs: profile, real workout history and the
 * aggregates derived from it. Every number here comes from actual workouts.
 */
export function useAthlete() {
  const profile = useQuery(api.profiles.get);
  const workouts = useQuery(api.workouts.list);
  const records = useQuery(api.progress.records);
  const achievements = useQuery(api.progress.achievements);
  const weights = useQuery(api.profiles.weightHistory);
  const skillProgress = useQuery(api.progress.skillProgress);

  const loading =
    profile === undefined ||
    workouts === undefined ||
    records === undefined ||
    achievements === undefined;

  const derived = useMemo(() => {
    const list: WorkoutSummaryDoc[] = (workouts ?? []).map((w) => ({
      _id: w._id as string,
      date: w.date,
      day: w.day,
      durationSec: w.durationSec,
      volume: w.volume,
      reps: w.reps,
      sets: w.sets,
      name: w.name,
      exerciseCount: w.exerciseCount,
    }));

    const totals: Totals = computeTotals(list);
    const streak = currentStreak(list);
    const weekly = weeklyWorkoutCount(list);

    /* this week, Monday → Sunday */
    const ws = weekStart(new Date()).getTime();
    const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
    const week: WeekDay[] = dayLabels.map((label, i) => {
      const start = ws + i * 86_400_000;
      const end = start + 86_400_000;
      return {
        key: new Date(start).toLocaleDateString("en-CA"),
        label,
        workouts: list.filter((w) => w.date >= start && w.date < end),
      };
    });

    /* aggregate muscle activation across all workouts */
    const muscleAgg = new Map<MuscleGroup, number>();
    let muscleScoreTotal = 0;
    for (const w of workouts ?? []) {
      for (const [muscle, score] of Object.entries(w.muscleActivation ?? {})) {
        const next = (muscleAgg.get(muscle as MuscleGroup) ?? 0) + score;
        muscleAgg.set(muscle as MuscleGroup, next);
        muscleScoreTotal += score;
      }
    }
    const maxMuscle = Math.max(0, ...Array.from(muscleAgg.values()));
    const trainedMuscles = Array.from(muscleAgg.entries())
      .map(([id, score]) => ({
        id,
        score,
        ratio: maxMuscle > 0 ? score / maxMuscle : 0,
      }))
      .sort((a, b) => b.score - a.score);

    return {
      workouts: list,
      totals,
      streak,
      weekly,
      week,
      trainedMuscles,
      muscleScoreTotal,
    };
  }, [workouts]);

  return {
    loading,
    profile: profile ?? null,
    workouts: derived.workouts,
    totals: derived.totals,
    streak: derived.streak,
    weekly: derived.weekly,
    week: derived.week,
    trainedMuscles: derived.trainedMuscles,
    muscleScoreTotal: derived.muscleScoreTotal,
    records: records ?? [],
    achievements: achievements ?? [],
    weights: weights ?? [],
    skillProgress: skillProgress ?? [],
  };
}
