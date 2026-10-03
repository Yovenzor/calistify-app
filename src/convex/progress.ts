import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { SKILLS } from "../lib/skills";
import { mutation, query } from "./_generated/server";

/** All unlocked achievements for the current user. */
export const achievements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/** All personal records for the current user (newest first). */
export const records = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("personalRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    rows.sort((a, b) => b.date - a.date);
    return rows;
  },
});

export const skillProgress = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("skillProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Mark a skill step complete/incomplete. Steps can only be completed in
 * order — a user never starts with advanced skills unlocked.
 */
export const toggleSkillStep = mutation({
  args: { skillId: v.string(), stepId: v.string(), stepIndex: v.number() },
  handler: async (ctx, { skillId, stepId, stepIndex }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("skillProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const skill = SKILLS.find((s) => s.id === skillId);
    if (!skill) throw new Error("Unknown skill");
    const stepDef = skill.steps.find((s) => s.id === stepId);
    if (!stepDef) throw new Error("Unknown step");

    const current = existing?.completedSteps ?? [];
    const isDone = current.includes(stepId);

    if (isDone) {
      // unchecking a step clears it and everything after it
      const cleared = skill.steps.slice(stepIndex).map((s) => s.id);
      const next = current.filter((id) => !cleared.includes(id));
      if (existing) {
        await ctx.db.patch(existing._id, {
          completedSteps: next,
          updatedAt: Date.now(),
        });
      }
      return;
    }

    // completing step N requires every earlier step to be complete first
    const required = skill.steps
      .slice(0, stepIndex)
      .map((s) => s.id);
    const missing = required.filter((id) => !current.includes(id));
    if (missing.length > 0) {
      throw new Error("Complete the earlier steps first");
    }

    const sorted = Array.from(new Set([...current, stepId]));
    if (existing) {
      await ctx.db.patch(existing._id, {
        completedSteps: sorted,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("skillProgress", {
        userId,
        skillId,
        completedSteps: [stepId],
        updatedAt: Date.now(),
      });
    }
  },
});
