import { Password } from "@convex-dev/auth/providers/Password";
import type { ConvexCredentialsUserConfig } from "@convex-dev/auth/providers/ConvexCredentials";
import {
  retrieveAccount,
  signInViaProvider,
  type GenericActionCtxWithAuthConfig,
} from "@convex-dev/auth/server";
import type { GenericDataModel } from "convex/server";
import type { Value } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { verifyTotpCode } from "../twoFactor";
import { emailOtp } from "./emailOtp";

/** Stock email+password flows: sign-up, sign-in, reset, reset-verification. */
const base = Password({ reset: emailOtp });

// `options` exists at runtime (Convex Credentials providers always carry it)
// even though ConvexCredentialsConfig's type doesn't declare it.
const baseOptions = (
  base as unknown as { options: ConvexCredentialsUserConfig }
).options;

type Credentials = Partial<Record<string, Value | undefined>>;
type AuthCtx = GenericActionCtxWithAuthConfig<GenericDataModel>;

/**
 * Map the stock provider's internal error strings to user-facing messages.
 * Unknown email and wrong password become the same message on purpose —
 * no account enumeration, no hint that 2FA is on.
 */
function normalizeCredentialsError(error: unknown): Error {
  const msg = error instanceof Error ? error.message : "";
  if (msg === "InvalidAccountId" || msg === "InvalidSecret") {
    return new Error("Invalid credentials");
  }
  if (msg === "TooManyFailedAttempts") {
    return new Error("Too many attempts — wait a minute and try again.");
  }
  return error instanceof Error ? error : new Error(String(error));
}

function hasCode(credentials: Credentials): boolean {
  return typeof credentials.code === "string" && credentials.code.length > 0;
}

/**
 * Email + password sign-in/sign-up wrapped in a mandatory emailed one-time
 * code, plus an optional Google Authenticator (TOTP) second factor.
 *
 * Two calls from the client, both server-enforced in this `authorize`:
 *
 * 1. SEND step (no `code`): the password is verified (and, when two-factor
 *    is enabled, a live authenticator code too), a 6-digit code is emailed,
 *    and NO session is created — authorize returns null.
 * 2. VERIFY step (`code` present): the password is verified again and the
 *    emailed code is checked; only then is a session created. A pending
 *    code only ever exists after the send step succeeded, so neither a
 *    password alone nor a password + old code can skip the earlier gates.
 *
 * Password reset flows are untouched: they stay guarded by their own
 * emailed code (the project's existing email sender).
 */
async function authorizeWithTotp(credentials: Credentials, ctx: AuthCtx) {
  const flow = credentials.flow;

  /* ── VERIFY step: password + emailed code → session ── */
  if (
    hasCode(credentials) &&
    (flow === "signIn" || flow === "signUp") &&
    typeof credentials.email === "string" &&
    typeof credentials.password === "string"
  ) {
    try {
      await retrieveAccount(ctx, {
        provider: "password",
        account: { id: credentials.email, secret: credentials.password },
      });
    } catch (error) {
      throw normalizeCredentialsError(error);
    }
    const verified = await signInViaProvider(ctx, emailOtp, {
      params: credentials,
    });
    if (verified === null) throw new Error("Invalid or expired code");
    return { userId: verified.userId, sessionId: verified.sessionId };
  }

  /* ── SEND step: prove password (+ authenticator), email the code ── */
  if (
    (flow === "signIn" || flow === "signUp") &&
    !hasCode(credentials) &&
    typeof credentials.email === "string" &&
    typeof credentials.password === "string"
  ) {
    const email = credentials.email;
    const secret = credentials.password;

    if (flow === "signIn") {
      // Password first (a wrong password is the only thing a failed attempt
      // can reach, so it counts once against the rate limit), then the
      // authenticator code when two-factor is enabled.
      let accountId: Id<"authAccounts">;
      try {
        const retrieved = await retrieveAccount(ctx, {
          provider: "password",
          account: { id: email, secret },
        });
        const user = retrieved.user;
        if (
          user?.totpEnabled === true &&
          typeof user.totpSecret === "string" &&
          user.totpSecret.length >= 16
        ) {
          const totp =
            typeof credentials.totp === "string" ? credentials.totp : "";
          if (!verifyTotpCode(totp, user.totpSecret)) {
            throw new Error("Invalid authenticator code");
          }
        }
        accountId = retrieved.account._id;
      } catch (error) {
        throw normalizeCredentialsError(error);
      }
      await signInViaProvider(ctx, emailOtp, {
        accountId,
        params: credentials,
      });
      return null; // code sent — no session until it is verified
    }

    // flow === "signUp": create the account first, then email the code.
    const created = await baseOptions.authorize(credentials, ctx);
    if (created === null) throw new Error("Could not create the account");
    const accountId = await ctx.runQuery(
      internal.authHelpers.passwordAccountId,
      { email },
    );
    if (accountId === null) throw new Error("Could not create the account");
    await signInViaProvider(ctx, emailOtp, {
      accountId,
      params: credentials,
    });
    return null; // account created — sign-in completes after the code
  }

  /* ── Reset and other stock flows ── */
  try {
    return await baseOptions.authorize(credentials, ctx);
  } catch (error) {
    throw normalizeCredentialsError(error);
  }
}

export const password = {
  ...base,
  id: "password",
  authorize: authorizeWithTotp,
  options: { ...baseOptions, authorize: authorizeWithTotp },
};
