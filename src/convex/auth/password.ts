import { Password } from "@convex-dev/auth/providers/Password";
import type { ConvexCredentialsUserConfig } from "@convex-dev/auth/providers/ConvexCredentials";
import {
  retrieveAccount,
  type GenericActionCtxWithAuthConfig,
} from "@convex-dev/auth/server";
import type { GenericDataModel } from "convex/server";
import type { Value } from "convex/values";
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
 * Google Authenticator (TOTP) gate wrapped around the stock Password
 * provider's `authorize` — the last server-side step before Convex Auth
 * creates a session, so it is fully server-enforced:
 *
 * - The password is verified first, so a wrong password reports the same
 *   generic "Invalid credentials" as a non-existent account (no enumeration,
 *   no hint that 2FA is on).
 * - With two-factor enabled, a correct password alone never yields a
 *   session — the authenticator code must verify in the same call.
 * - Sign-up and password-reset flows are untouched: reset stays guarded by
 *   the emailed 6-digit code (the project's existing email sender).
 */
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

async function authorizeWithTotp(credentials: Credentials, ctx: AuthCtx) {
  if (credentials.flow === "signIn") {
    const email = credentials.email;
    const secret = credentials.password;
    if (typeof email === "string" && typeof secret === "string") {
      // Verify the password first (also the only step a wrong password can
      // reach, so failed attempts count once against the rate limit), then
      // require a live authenticator code when two-factor is enabled.
      let user;
      try {
        const retrieved = await retrieveAccount(ctx, {
          provider: "password",
          account: { id: email, secret },
        });
        user = retrieved.user;
      } catch (error) {
        throw normalizeCredentialsError(error);
      }
      if (
        user?.totpEnabled === true &&
        typeof user.totpSecret === "string" &&
        user.totpSecret.length >= 16
      ) {
        const code =
          typeof credentials.totp === "string" ? credentials.totp : "";
        if (!verifyTotpCode(code, user.totpSecret)) {
          throw new Error("Invalid authenticator code");
        }
      }
    }
  }
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
