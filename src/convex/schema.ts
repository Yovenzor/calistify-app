import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const setValidator = v.object({
  order: v.number(),
  weightKg: v.number(),
  reps: v.number(),
  durationSec: v.optional(v.number()),
  rpe: v.optional(v.number()),
  isBodyweight: v.boolean(),
  completed: v.boolean(),
  volume: v.number(),
});

const prMetric = v.union(
  v.literal("weight"),
  v.literal("reps"),
  v.literal("duration"),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    /* Athlete profile + settings. Starts empty — no fake data. */
    profiles: defineTable({
      userId: v.id("users"),
      name: v.string(),
      imageStorageId: v.optional(v.id("_storage")),
      bodyweightKg: v.optional(v.number()),
      weightUnit: v.union(v.literal("kg"), v.literal("lb")),
      weeklyGoal: v.number(), // workouts per week
      onboarded: v.boolean(),
      // settings
      restDurationSec: v.number(),
      autoStartRest: v.boolean(),
      timerSound: v.boolean(),
      workoutReminders: v.boolean(),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    /* Weight history — never overwritten, so past workouts stay accurate. */
    weightHistory: defineTable({
      userId: v.id("users"),
      weightKg: v.number(),
      date: v.string(), // YYYY-MM-DD
      ts: v.number(),
    }).index("by_user_date", ["userId", "date"]),

    /* Completed workout summaries (dashboard / chart source of truth). */
    workouts: defineTable({
      userId: v.id("users"),
      name: v.string(),
      date: v.number(), // start timestamp
      day: v.string(), // YYYY-MM-DD in the user's local day
      startedAt: v.number(),
      endedAt: v.number(),
      durationSec: v.number(),
      volume: v.number(),
      reps: v.number(),
      sets: v.number(),
      exerciseCount: v.number(),
      muscleActivation: v.record(v.string(), v.number()),
      createdAt: v.number(),
    })
      .index("by_user_date", ["userId", "date"])
      .index("by_user_day", ["userId", "day"]),

    /* Exercise rows inside a workout. */
    workoutExercises: defineTable({
      userId: v.id("users"),
      workoutId: v.id("workouts"),
      exerciseId: v.string(),
      name: v.string(),
      order: v.number(),
      day: v.string(),
      date: v.number(),
      notes: v.optional(v.string()),
      volume: v.number(),
      reps: v.number(),
      sets: v.array(setValidator),
    })
      .index("by_workout", ["workoutId"])
      .index("by_user_exercise", ["userId", "exerciseId", "date"]),

    /* Personal records — only ever created from real logged performances. */
    personalRecords: defineTable({
      userId: v.id("users"),
      exerciseId: v.string(),
      exerciseName: v.string(),
      metric: prMetric,
      value: v.number(), // kg added / reps / seconds
      repsAt: v.optional(v.number()),
      workoutId: v.id("workouts"),
      date: v.number(),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    achievements: defineTable({
      userId: v.id("users"),
      achievementId: v.string(),
      unlockedAt: v.number(),
    }).index("by_user", ["userId"]),

    skillProgress: defineTable({
      userId: v.id("users"),
      skillId: v.string(),
      completedSteps: v.array(v.string()),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),

    templates: defineTable({
      userId: v.id("users"),
      name: v.string(),
      exerciseIds: v.array(v.string()),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    /* Daily health metrics imported from the user's own health app export
       (Apple Health export.xml). Only aggregated day totals are stored —
       the raw export file never leaves the device. */
    healthDaily: defineTable({
      userId: v.id("users"),
      date: v.string(), // YYYY-MM-DD (user's local day)
      steps: v.optional(v.number()),
      activeKcal: v.optional(v.number()),
      basalKcal: v.optional(v.number()),
      exerciseMin: v.optional(v.number()),
      sleepMin: v.optional(v.number()),
      restingHr: v.optional(v.number()),
      source: v.string(), // "apple_health" | "health_connect" | "shortcuts"
      importedAt: v.number(),
    }).index("by_user_date", ["userId", "date"]),

    /* Health connection: consent record, private sync endpoint token and the
       rolling dedup ledger for webhook deliveries (Health Connect bridge /
       iOS Shortcuts). Deleted together with health data on disconnect. */
    healthSync: defineTable({
      userId: v.id("users"),
      token: v.string(), // secret in the personal sync URL
      platform: v.union(v.literal("ios"), v.literal("android")),
      tzOffsetMin: v.number(), // device UTC offset, for local-day bucketing
      consentedAt: v.number(),
      createdAt: v.number(),
      lastSyncAt: v.optional(v.number()),
      lastSource: v.optional(v.string()),
      // interval ledgers keyed by record time → value (dedup on re-delivery)
      ledgerSteps: v.optional(v.record(v.string(), v.number())),
      ledgerActive: v.optional(v.record(v.string(), v.number())),
      ledgerTotal: v.optional(v.record(v.string(), v.number())),
      ledgerSleep: v.optional(v.record(v.string(), v.number())),
    })
      .index("by_user", ["userId"])
      .index("by_token", ["token"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
