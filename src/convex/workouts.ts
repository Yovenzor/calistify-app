import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { ACHIEVEMENTS } from "../lib/achievements";
import { getExercise } from "../lib/exercises";
import {
  computeTotals,
  computeWorkoutStats,
  currentStreak,
  longestStreak,
  setCounts,
  setVolume,
} from "../lib/stats";
import { SKILLS } from "../lib/skills";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

const setInput = v.object({
  weightKg: v.number(),
  reps: v.number(),
  durationSec: v.optional(v.number()),
  rpe: v.optional(v.number()),
  isBodyweight: v.boolean(),
});

const exerciseInput = v.object({
  exerciseId: v.string(),
  name: v.string(),
  notes: v.optional(v.string()),
  sets: v.array(setInput),
});

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return userId;
}

type WorkoutDoc = {
  _id: Id<"workouts">;
  date: number;
  day: string;
  durationSec: number;
  volume: number;
  reps: number;
  sets: number;
  name: string;
  exerciseCount: number;
};

function toSummary(w: WorkoutDoc) {
  return {
    _id: w._id as string,
    date: w.date,
    day: w.day,
    durationSec: w.durationSec,
    volume: w.volume,
    reps: w.reps,
    sets: w.sets,
    name: w.name,
    exerciseCount: w.exerciseCount,
  };
}

async function profileOf(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

/** Bodyweight in effect on a given day (latest logged weight ≤ day). */
async function bodyweightOn(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  day: string,
): Promise<number> {
  const entry = await ctx.db
    .query("weightHistory")
    .withIndex("by_user_date", (q) => q.eq("userId", userId).lte("date", day))
    .order("desc")
    .first();
  if (entry) return entry.weightKg;
  const profile = await profileOf(ctx, userId);
  return profile?.bodyweightKg ?? 0;
}

/** Summaries for dashboard, charts, calendar and streaks. Newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return workouts.map((w) => ({
      _id: w._id,
      name: w.name,
      date: w.date,
      day: w.day,
      startedAt: w.startedAt,
      endedAt: w.endedAt,
      durationSec: w.durationSec,
      volume: w.volume,
      reps: w.reps,
      sets: w.sets,
      exerciseCount: w.exerciseCount,
      muscleActivation: w.muscleActivation,
    }));
  },
});

/** Full workout detail: summary + every exercise and set. */
export const get = query({
  args: { id: v.id("workouts") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const workout = await ctx.db.get(id);
    if (!workout || workout.userId !== userId) return null;
    const exercises = await ctx.db
      .query("workoutExercises")
      .withIndex("by_workout", (q) => q.eq("workoutId", id))
      .collect();
    exercises.sort((a, b) => a.order - b.order);
    const records = await ctx.db
      .query("personalRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const prs = records.filter((r) => r.workoutId === id);
    return { workout, exercises, prs };
  },
});

export interface NewPR {
  exerciseId: string;
  exerciseName: string;
  metric: "weight" | "reps" | "duration";
  value: number;
  previous: number;
}

export interface NewAchievement {
  id: string;
  name: string;
  description: string;
}

/**
 * Persist a finished workout. All totals are recomputed server-side from the
 * raw sets, PRs are compared against previous records (a first-ever record is
 * never reported as a "NEW PR"), and achievements unlock only from real data.
 */
export const finish = mutation({
  args: {
    name: v.string(),
    day: v.string(),
    startedAt: v.number(),
    endedAt: v.number(),
    durationSec: v.number(),
    exercises: v.array(exerciseInput),
  },
  handler: async (ctx, args): Promise<{
    ok: boolean;
    error?: string;
    workoutId?: string;
    stats?: {
      exerciseCount: number;
      setCount: number;
      repCount: number;
      volume: number;
    };
    newPRs?: NewPR[];
    newAchievements?: NewAchievement[];
  }> => {
    const userId = await requireUser(ctx);
    const profile = await profileOf(ctx, userId);
    if (!profile) return { ok: false, error: "Complete onboarding first." };

    const bodyweight = await bodyweightOn(ctx, userId, args.day);
    const stats = computeWorkoutStats(args.exercises, bodyweight);

    if (stats.setCount === 0) {
      return { ok: false, error: "Log at least one set before finishing." };
    }

    const workoutId = await ctx.db.insert("workouts", {
      userId,
      name: args.name.trim() || "Workout",
      date: args.startedAt,
      day: args.day,
      startedAt: args.startedAt,
      endedAt: args.endedAt,
      durationSec: Math.max(1, Math.round(args.durationSec)),
      volume: stats.volume,
      reps: stats.repCount,
      sets: stats.setCount,
      exerciseCount: stats.exerciseCount,
      muscleActivation: stats.muscleActivation,
      createdAt: Date.now(),
    });

    let order = 0;
    for (const ex of args.exercises) {
      const counted = ex.sets.filter(setCounts);
      if (counted.length === 0) continue;
      const rows = ex.sets.map((s, i) => ({
        order: i + 1,
        weightKg: s.weightKg,
        reps: s.reps,
        durationSec: s.durationSec,
        rpe: s.rpe,
        isBodyweight: s.isBodyweight,
        completed: setCounts(s),
        volume: setVolume(s, bodyweight),
      }));
      const exVolume = rows.reduce((a, r) => a + r.volume, 0);
      const exReps = rows.reduce((a, r) => a + (r.completed ? r.reps : 0), 0);
      await ctx.db.insert("workoutExercises", {
        userId,
        workoutId,
        exerciseId: ex.exerciseId,
        name: ex.name,
        order: order++,
        day: args.day,
        date: args.startedAt,
        notes: ex.notes,
        volume: exVolume,
        reps: exReps,
        sets: rows,
      });
    }

    /* ── PR detection: only beats against previous comparable records ── */
    const newPRs: NewPR[] = [];
    const existing = await ctx.db
      .query("personalRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const candidates = new Map<
      string,
      { metric: "weight" | "reps" | "duration"; value: number; repsAt?: number }
    >();

    for (const ex of args.exercises) {
      const def = getExercise(ex.exerciseId);
      if (!def) continue;
      const counted = ex.sets.filter(setCounts);
      if (counted.length === 0) continue;

      const maxWeight = Math.max(0, ...counted.map((s) => s.weightKg));
      const maxReps = Math.max(0, ...counted.map((s) => s.reps));
      const maxDuration = Math.max(
        0,
        ...counted.map((s) => s.durationSec ?? 0),
      );

      if (maxWeight > 0) {
        const repsAt = counted.find((s) => s.weightKg === maxWeight)?.reps;
        candidates.set(`${ex.exerciseId}:weight`, {
          metric: "weight",
          value: maxWeight,
          repsAt,
        });
      }
      if (maxReps > 0)
        candidates.set(`${ex.exerciseId}:reps`, {
          metric: "reps",
          value: maxReps,
        });
      if (maxDuration > 0)
        candidates.set(`${ex.exerciseId}:duration`, {
          metric: "duration",
          value: maxDuration,
        });
    }

    for (const [key, cand] of candidates) {
      const [exerciseId] = key.split(":");
      const def = getExercise(exerciseId);
      const prev = existing.find(
        (r) => r.exerciseId === exerciseId && r.metric === cand.metric,
      );
      if (!prev) {
        // First-ever record — establishes the baseline, not a "NEW PR".
        await ctx.db.insert("personalRecords", {
          userId,
          exerciseId,
          exerciseName: def?.name ?? exerciseId,
          metric: cand.metric,
          value: cand.value,
          repsAt: cand.repsAt,
          workoutId,
          date: args.startedAt,
          createdAt: Date.now(),
        });
      } else if (cand.value > prev.value) {
        await ctx.db.patch(prev._id, {
          value: cand.value,
          repsAt: cand.repsAt,
          workoutId,
          date: args.startedAt,
          createdAt: Date.now(),
        });
        newPRs.push({
          exerciseId,
          exerciseName: def?.name ?? exerciseId,
          metric: cand.metric,
          value: cand.value,
          previous: prev.value,
        });
      }
    }

    /* ── Achievements from post-workout real totals ─────────────────── */
    const allWorkouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
    const summaries = allWorkouts.map(toSummary);
    const totals = computeTotals(summaries);

    const rows = await ctx.db
      .query("workoutExercises")
      .withIndex("by_user_exercise", (q) => q.eq("userId", userId))
      .collect();
    const exercisesDone = Array.from(
      new Set(rows.map((r) => r.exerciseId)),
    );

    const skillRows = await ctx.db
      .query("skillProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const skillsCompleted = SKILLS.filter((s) => {
      const row = skillRows.find((r) => r.skillId === s.id);
      return (
        !!row && s.steps.every((step) => row.completedSteps.includes(step.id))
      );
    }).map((s) => s.id);

    const unlocked = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const unlockedIds = new Set(unlocked.map((u) => u.achievementId));

    const statsForAchievements = {
      totalWorkouts: totals.totalWorkouts,
      totalVolume: totals.totalVolume,
      totalReps: totals.totalReps,
      longestStreakDays: Math.max(
        longestStreak(summaries),
        currentStreak(summaries),
      ),
      exercisesDone,
      skillsCompleted,
    };

    const newAchievements: NewAchievement[] = [];
    for (const def of ACHIEVEMENTS) {
      if (unlockedIds.has(def.id)) continue;
      if (def.check(statsForAchievements)) {
        await ctx.db.insert("achievements", {
          userId,
          achievementId: def.id,
          unlockedAt: Date.now(),
        });
        newAchievements.push({
          id: def.id,
          name: def.name,
          description: def.description,
        });
      }
    }

    return {
      ok: true,
      workoutId,
      stats: {
        exerciseCount: stats.exerciseCount,
        setCount: stats.setCount,
        repCount: stats.repCount,
        volume: stats.volume,
      },
      newPRs,
      newAchievements,
    };
  },
});

/* ── Data management (Settings → Data & Privacy) ─────────────────────── */

async function deleteAll(
  ctx: MutationCtx,
  userId: Id<"users">,
  what: "history" | "all",
) {
  const workouts = await ctx.db
    .query("workouts")
    .withIndex("by_user_date", (q) => q.eq("userId", userId))
    .collect();
  for (const w of workouts) await ctx.db.delete(w._id);

  const exRows = await ctx.db
    .query("workoutExercises")
    .withIndex("by_user_exercise", (q) => q.eq("userId", userId))
    .collect();
  for (const r of exRows) await ctx.db.delete(r._id);

  const prs = await ctx.db
    .query("personalRecords")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const r of prs) await ctx.db.delete(r._id);

  if (what === "all") {
    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const a of achievements) await ctx.db.delete(a._id);

    const skills = await ctx.db
      .query("skillProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const s of skills) await ctx.db.delete(s._id);

    const weights = await ctx.db
      .query("weightHistory")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
    for (const w of weights) await ctx.db.delete(w._id);

    const templates = await ctx.db
      .query("templates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const t of templates) await ctx.db.delete(t._id);
  }
}

/** Clear workout history (keeps achievements, skills, settings). */
export const clearHistory = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    await deleteAll(ctx, userId, "history");
  },
});

/** Reset all training data back to the zero state. Profile is kept. */
export const resetAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    await deleteAll(ctx, userId, "all");
  },
});

/* ── Exercise detail: history, records, statistics ────────────────────── */

export const exerciseHistory = query({
  args: { exerciseId: v.string() },
  handler: async (ctx, { exerciseId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { sessions: [], records: [], stats: null };
    const rows = await ctx.db
      .query("workoutExercises")
      .withIndex("by_user_exercise", (q) =>
        q.eq("userId", userId).eq("exerciseId", exerciseId),
      )
      .order("desc")
      .collect();

    let totalVolume = 0;
    let totalReps = 0;
    let totalSets = 0;
    let bestWeight = 0;
    let bestReps = 0;
    const sessions = rows.map((r) => {
      const completed = r.sets.filter((s) => s.completed);
      totalVolume += r.volume;
      totalReps += r.reps;
      totalSets += completed.length;
      for (const s of completed) {
        bestWeight = Math.max(bestWeight, s.weightKg);
        bestReps = Math.max(bestReps, s.reps);
      }
      return {
        workoutId: r.workoutId,
        day: r.day,
        date: r.date,
        sets: r.sets,
        volume: r.volume,
        reps: r.reps,
      };
    });

    const records = await ctx.db
      .query("personalRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return {
      sessions,
      records: records.filter((r) => r.exerciseId === exerciseId),
      stats:
        sessions.length === 0
          ? null
          : {
              sessions: sessions.length,
              totalVolume,
              totalReps,
              totalSets,
              bestWeight,
              bestReps,
              lastPerformed: sessions[0]?.date ?? 0,
            },
    };
  },
});

/* ── Templates & repeat ──────────────────────────────────────────────── */

export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("templates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const createTemplate = mutation({
  args: { name: v.string(), exerciseIds: v.array(v.string()) },
  handler: async (ctx, { name, exerciseIds }) => {
    const userId = await requireUser(ctx);
    await ctx.db.insert("templates", {
      userId,
      name: name.trim() || "Template",
      exerciseIds,
      createdAt: Date.now(),
    });
  },
});

export const deleteTemplate = mutation({
  args: { id: v.id("templates") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const doc = await ctx.db.get(id);
    if (doc && doc.userId === userId) await ctx.db.delete(id);
  },
});
