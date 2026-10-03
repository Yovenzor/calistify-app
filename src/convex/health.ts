import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const dayInput = v.object({
  date: v.string(), // YYYY-MM-DD
  steps: v.optional(v.number()),
  activeKcal: v.optional(v.number()),
  basalKcal: v.optional(v.number()),
  exerciseMin: v.optional(v.number()),
  sleepMin: v.optional(v.number()),
  restingHr: v.optional(v.number()),
});

/**
 * Today + the previous 6 days, plus sync status. Everything here comes from
 * the user's own health-app export — zero rows until they import.
 */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { days: [], lastImportedAt: null };

    const rows = await ctx.db
      .query("healthDaily")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
    if (rows.length === 0) return { days: [], lastImportedAt: null };

    let lastImportedAt: number | null = null;
    for (const r of rows) {
      if (lastImportedAt === null || r.importedAt > lastImportedAt) {
        lastImportedAt = r.importedAt;
      }
    }

    const cutoff = new Date(Date.now() - 6 * 86_400_000).toLocaleDateString(
      "en-CA",
    );
    const days = rows
      .filter((r) => r.date >= cutoff)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((r) => ({
        date: r.date,
        steps: r.steps,
        activeKcal: r.activeKcal,
        basalKcal: r.basalKcal,
        exerciseMin: r.exerciseMin,
        sleepMin: r.sleepMin,
        restingHr: r.restingHr,
      }));

    return { days, lastImportedAt };
  },
});

/**
 * Upsert a chunk of parsed days. The client splits large exports into small
 * batches so each mutation stays well under Convex limits.
 */
export const importDays = mutation({
  args: { source: v.string(), days: v.array(dayInput) },
  handler: async (ctx, { source, days }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const now = Date.now();
    for (const d of days) {
      const existing = await ctx.db
        .query("healthDaily")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", userId).eq("date", d.date),
        )
        .unique();

      // only overwrite fields the import actually produced (Convex patch
      // deletes keys whose value is undefined)
      const update: {
        source: string;
        importedAt: number;
        steps?: number;
        activeKcal?: number;
        basalKcal?: number;
        exerciseMin?: number;
        sleepMin?: number;
        restingHr?: number;
      } = { source, importedAt: now };
      for (const key of [
        "steps",
        "activeKcal",
        "basalKcal",
        "exerciseMin",
        "sleepMin",
        "restingHr",
      ] as const) {
        const val = d[key];
        if (val !== undefined) update[key] = val;
      }

      if (existing) {
        await ctx.db.patch(existing._id, update);
      } else {
        await ctx.db.insert("healthDaily", { userId, date: d.date, ...update });
      }
    }
    return days.length;
  },
});
