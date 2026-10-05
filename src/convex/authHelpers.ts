import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

/**
 * Password account id for an email. Used internally while a sign-up is
 * waiting for its emailed verification code (an action context has no
 * direct database access).
 */
export const passwordAccountId = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email),
      )
      .unique();
    return account?._id ?? null;
  },
});
