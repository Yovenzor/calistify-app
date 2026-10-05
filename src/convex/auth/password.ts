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
const baseOptions = (base as unknown as { options: ConvexCredentialsUserConfig })
  .options;

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
async function authorizeWithTotp(credentials: Credentials, ctx: AuthCtx) {
  if (credentials.flow === "signIn") {
    const email = credentials.email;
    const secret = credentials.password;
    if (typeof email === "string" && typeof secret === "string") {
      const retrieved = await retrieveAccount(ctx, {
        provider: "password",
        account: { id: email, secret },
      });
      const user = retrieved === null ? null : retrieved.user;
      if (
        user &&
        user.totpEnabled === true &&
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
  return await baseOptions.authorize(credentials, ctx);
}

export const password = {
  ...base,
  id: "password",
  authorize: authorizeWithTotp,
  options: { ...baseOptions, authorize: authorizeWithTotp },
};
