import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";

/** Remove every document that belongs to `userId`, including auth records. */
async function wipeUserData(
  ctx: MutationCtx,
  userId: Id<"users">,
  email: string | undefined,
) {
  // Profile + profile photo (storage blob)
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (profile) {
    if (profile.imageStorageId) {
      await ctx.storage.delete(profile.imageStorageId);
    }
    await ctx.db.delete(profile._id);
  }

  // Training data
  const weightHistory = await ctx.db
    .query("weightHistory")
    .withIndex("by_user_date", (q) => q.eq("userId", userId))
    .collect();
  const workouts = await ctx.db
    .query("workouts")
    .withIndex("by_user_date", (q) => q.eq("userId", userId))
    .collect();
  const workoutExercises = await ctx.db
    .query("workoutExercises")
    .withIndex("by_user_exercise", (q) => q.eq("userId", userId))
    .collect();
  const personalRecords = await ctx.db
    .query("personalRecords")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const achievements = await ctx.db
    .query("achievements")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const skillProgress = await ctx.db
    .query("skillProgress")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const templates = await ctx.db
    .query("templates")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  // Auth records: sessions -> refresh tokens + verifiers, accounts -> codes
  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect();
  const accounts = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
    .collect();

  const refreshTokens = [];
  const verifiers = [];
  for (const session of sessions) {
    refreshTokens.push(
      ...(await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect()),
    );
    verifiers.push(
      ...(await ctx.db
        .query("authVerifiers")
        .filter((q) => q.eq(q.field("sessionId"), session._id))
        .collect()),
    );
  }

  const verificationCodes = [];
  for (const account of accounts) {
    verificationCodes.push(
      ...(await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect()),
    );
  }

  // OTP / password rate-limit rows are keyed by email
  const rateLimits = email
    ? await ctx.db
        .query("authRateLimits")
        .withIndex("identifier", (q) => q.eq("identifier", email))
        .collect()
    : [];

  const docs = [
    ...weightHistory,
    ...workouts,
    ...workoutExercises,
    ...personalRecords,
    ...achievements,
    ...skillProgress,
    ...templates,
    ...refreshTokens,
    ...verifiers,
    ...verificationCodes,
    ...rateLimits,
    ...accounts,
    ...sessions,
  ];
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

/**
 * Permanently delete the signed-in account: profile, photo, workouts,
 * records, achievements, templates and every auth credential/session.
 * The client should sign out (best-effort) after this completes.
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    await wipeUserData(ctx, userId, user.email);
    await ctx.db.delete(userId);
  },
});
