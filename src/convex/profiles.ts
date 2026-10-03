import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

async function requireProfile(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

/** Current athlete profile (null until onboarding is completed). */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const profile = await requireProfile(ctx, userId);
    if (!profile) return null;
    const imageUrl = profile.imageStorageId
      ? await ctx.storage.getUrl(profile.imageStorageId)
      : null;
    return { ...profile, imageUrl };
  },
});

/** Create the profile during onboarding. The entered name is real user data. */
export const completeOnboarding = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Name is required");

    const existing = await requireProfile(ctx, userId);
    if (existing) {
      await ctx.db.patch(existing._id, { name: trimmed, onboarded: true });
      await ctx.db.patch(userId, { name: trimmed });
      return;
    }
    await ctx.db.insert("profiles", {
      userId,
      name: trimmed,
      weightUnit: "kg",
      weeklyGoal: 4,
      onboarded: true,
      restDurationSec: 90,
      autoStartRest: true,
      timerSound: true,
      workoutReminders: false,
      createdAt: Date.now(),
    });
    await ctx.db.patch(userId, { name: trimmed });
  },
});

async function appendWeightHistory(
  ctx: MutationCtx,
  userId: Id<"users">,
  weightKg: number,
  day: string,
) {
  const existing = await ctx.db
    .query("weightHistory")
    .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", day))
    .unique();
  if (existing) {
    // same-day re-entry updates today's point only; older history is untouched
    if (existing.weightKg !== weightKg) {
      await ctx.db.patch(existing._id, { weightKg, ts: Date.now() });
    }
    return;
  }
  await ctx.db.insert("weightHistory", {
    userId,
    weightKg,
    date: day,
    ts: Date.now(),
  });
}

/** Update profile fields. A bodyweight change appends to weight history. */
export const update = mutation({
  args: {
    name: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    bodyweightKg: v.optional(v.number()),
    weightUnit: v.optional(v.union(v.literal("kg"), v.literal("lb"))),
    weeklyGoal: v.optional(v.number()),
    day: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const profile = await requireProfile(ctx, userId);
    if (!profile) throw new Error("Profile not found");

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined && args.name.trim()) {
      patch.name = args.name.trim();
      await ctx.db.patch(userId, { name: args.name.trim() });
    }
    if (args.imageStorageId !== undefined)
      patch.imageStorageId = args.imageStorageId;
    if (args.weightUnit !== undefined) patch.weightUnit = args.weightUnit;
    if (args.weeklyGoal !== undefined)
      patch.weeklyGoal = Math.min(14, Math.max(0, args.weeklyGoal));

    if (args.bodyweightKg !== undefined && args.bodyweightKg > 0) {
      const changed = args.bodyweightKg !== profile.bodyweightKg;
      patch.bodyweightKg = args.bodyweightKg;
      if (changed) {
        const day =
          args.day ??
          new Date().toLocaleDateString("en-CA", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
        await appendWeightHistory(ctx, userId, args.bodyweightKg, day);
      }
    }

    if (Object.keys(patch).length > 0) await ctx.db.patch(profile._id, patch);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const weightHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("weightHistory")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const updateSettings = mutation({
  args: {
    restDurationSec: v.optional(v.number()),
    autoStartRest: v.optional(v.boolean()),
    timerSound: v.optional(v.boolean()),
    workoutReminders: v.optional(v.boolean()),
    weightUnit: v.optional(v.union(v.literal("kg"), v.literal("lb"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const profile = await requireProfile(ctx, userId);
    if (!profile) throw new Error("Profile not found");
    await ctx.db.patch(profile._id, args);
  },
});
