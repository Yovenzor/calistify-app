import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { HealthDayPatch } from "../lib/healthSync";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

const dayInput = v.object({
  date: v.string(), // YYYY-MM-DD
  steps: v.optional(v.number()),
  activeKcal: v.optional(v.number()),
  basalKcal: v.optional(v.number()),
  exerciseMin: v.optional(v.number()),
  sleepMin: v.optional(v.number()),
  restingHr: v.optional(v.number()),
});

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return userId;
}

/** Minimal ctx shape needed to upsert a day — shared with HTTP actions. */
type DbCtx = { db: MutationCtx["db"] };

/** Insert or update one aggregated day; undefined fields clear stale values. */
export async function upsertHealthDay(
  ctx: DbCtx,
  userId: Id<"users">,
  day: HealthDayPatch,
  source: string,
) {
  const existing = await ctx.db
    .query("healthDaily")
    .withIndex("by_user_date", (q) =>
      q.eq("userId", userId).eq("date", day.date),
    )
    .unique();

  const update: {
    source: string;
    importedAt: number;
    steps?: number;
    activeKcal?: number;
    basalKcal?: number;
    exerciseMin?: number;
    sleepMin?: number;
    restingHr?: number;
  } = { source, importedAt: Date.now() };
  for (const key of [
    "steps",
    "activeKcal",
    "basalKcal",
    "exerciseMin",
    "sleepMin",
    "restingHr",
  ] as const) {
    const val = day[key];
    if (val !== undefined) update[key] = val;
  }

  if (existing) {
    await ctx.db.patch(existing._id, update);
  } else {
    await ctx.db.insert("healthDaily", { userId, date: day.date, ...update });
  }
}

/**
 * Today + the previous 6 days, sync status, and the connection row
 * (consent + private endpoint token). Zero data until the user connects.
 */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { days: [], lastImportedAt: null, connection: null };
    }

    const conn = await ctx.db
      .query("healthSync")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const rows = await ctx.db
      .query("healthDaily")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();

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

    return {
      days,
      lastImportedAt,
      connection: conn
        ? {
            platform: conn.platform,
            token: conn.token,
            consentedAt: conn.consentedAt,
            createdAt: conn.createdAt,
            lastSyncAt: conn.lastSyncAt ?? null,
            lastSource: conn.lastSource ?? null,
          }
        : null,
    };
  },
});

/**
 * Accept the terms and open a connection: creates (or re-targets) the row
 * holding the private sync endpoint token. Refuses without explicit consent.
 */
export const startConnection = mutation({
  args: {
    platform: v.union(v.literal("ios"), v.literal("android")),
    tzOffsetMin: v.number(),
    agreed: v.boolean(),
  },
  handler: async (ctx, { platform, tzOffsetMin, agreed }) => {
    const userId = await requireUser(ctx);
    if (!agreed) throw new Error("Terms must be accepted to connect");

    const existing = await ctx.db
      .query("healthSync")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { platform, tzOffsetMin });
      return existing.token;
    }

    const token = crypto.randomUUID();
    await ctx.db.insert("healthSync", {
      userId,
      token,
      platform,
      tzOffsetMin,
      consentedAt: Date.now(),
      createdAt: Date.now(),
    });
    return token;
  },
});

/** Remove the connection, its token and every stored health day. */
export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    for (const row of await ctx.db
      .query("healthSync")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()) {
      await ctx.db.delete(row._id);
    }
    for (const row of await ctx.db
      .query("healthDaily")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect()) {
      await ctx.db.delete(row._id);
    }
    return true;
  },
});

/* ── internal bridge for the HTTP sync endpoint (actions have no db) ── */

/** Fetch a connection by its secret token — HTTP sync endpoint only. */
export const connectionByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const conn = await ctx.db
      .query("healthSync")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!conn) return null;
    return {
      connectionId: conn._id,
      tzOffsetMin: conn.tzOffsetMin,
      ledger: {
        steps: conn.ledgerSteps ?? {},
        active: conn.ledgerActive ?? {},
        total: conn.ledgerTotal ?? {},
        sleep: conn.ledgerSleep ?? {},
      },
    };
  },
});

/** Apply one processed sync delivery: upsert days + store the ledger. */
export const applySyncResult = internalMutation({
  args: {
    connectionId: v.id("healthSync"),
    days: v.array(dayInput),
    source: v.string(),
    ledgerSteps: v.record(v.string(), v.number()),
    ledgerActive: v.record(v.string(), v.number()),
    ledgerTotal: v.record(v.string(), v.number()),
    ledgerSleep: v.record(v.string(), v.number()),
  },
  handler: async (ctx, args) => {
    const conn = await ctx.db.get(args.connectionId);
    if (!conn) return 0; // disconnected mid-flight — drop the delivery
    for (const day of args.days) {
      await upsertHealthDay(ctx, conn.userId, day, args.source);
    }
    await ctx.db.patch(args.connectionId, {
      ledgerSteps: args.ledgerSteps,
      ledgerActive: args.ledgerActive,
      ledgerTotal: args.ledgerTotal,
      ledgerSleep: args.ledgerSleep,
      lastSyncAt: Date.now(),
      lastSource: args.source,
    });
    return args.days.length;
  },
});

/**
 * Upsert a chunk of parsed Apple Health days. The client splits large
 * exports into small batches so each mutation stays under Convex limits.
 */
export const importDays = mutation({
  args: { source: v.string(), days: v.array(dayInput) },
  handler: async (ctx, { source, days }) => {
    const userId = await requireUser(ctx);
    for (const d of days) {
      await upsertHealthDay(ctx, userId, d, source);
    }
    return days.length;
  },
});
