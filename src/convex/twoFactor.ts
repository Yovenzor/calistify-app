import { getAuthUserId } from "@convex-dev/auth/server";
import { hmac } from "@oslojs/crypto/hmac";
import { SHA1 } from "@oslojs/crypto/sha1";
import {
  decodeBase32IgnorePadding,
  encodeBase32UpperCaseNoPadding,
} from "@oslojs/encoding";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

/** Google Authenticator defaults: SHA-1, 6 digits, 30-second period. */
const PERIOD_SECONDS = 30;
const DIGITS = 6;

/** HOTP (RFC 4226) — counter-based core shared by all TOTP apps. */
function hotp(key: Uint8Array, counter: bigint): string {
  const message = new Uint8Array(8);
  let value = counter;
  for (let i = 7; i >= 0; i--) {
    message[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  const mac = hmac(SHA1, key, message);
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

function counterAt(timeMs: number): bigint {
  return BigInt(Math.floor(timeMs / 1000 / PERIOD_SECONDS));
}

/**
 * Verify a 6-digit code against a base32 secret. Accepts the current
 * period plus one either way so small phone/server clock drift still works.
 */
export function verifyTotpCode(
  code: string,
  secretBase32: string,
  timeMs: number = Date.now(),
): boolean {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== DIGITS || secretBase32.length < 16) return false;
  const key = decodeBase32IgnorePadding(secretBase32);
  const counter = counterAt(timeMs);
  for (let skew = -1n; skew <= 1n; skew++) {
    if (hotp(key, counter + skew) === clean) return true;
  }
  return false;
}

/** 160-bit random secret, base32 without padding — the Google Authenticator format. */
function generateSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32UpperCaseNoPadding(bytes);
}

/** otpauth:// URL that Google Authenticator (and every other app) scans. */
function otpauthUrl(email: string, secret: string): string {
  const label = encodeURIComponent(`CALISTIFY${email ? `:${email}` : ""}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=CALISTIFY&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD_SECONDS}`;
}

async function currentUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  return await ctx.db.get(userId);
}

/** Is two-factor on (or half-set-up) for the signed-in user? */
export const status = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    return {
      enabled: user?.totpEnabled === true,
      pending: !!user?.totpSecret && user.totpEnabled !== true,
    };
  },
});

/**
 * Step 1 of setup: generate + store a fresh secret and return the
 * QR payload. Nothing is active until `enable` confirms a real code.
 */
export const setup = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    if (user.totpEnabled) {
      throw new Error("Two-factor authentication is already enabled.");
    }
    const secret = generateSecret();
    await ctx.db.patch(user._id, { totpSecret: secret, totpEnabled: false });
    const email = user.email ?? "";
    return { secret, url: otpauthUrl(email, secret) };
  },
});

/** Step 2: the user scanned the QR and typed a live code — turn it on. */
export const enable = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    if (user.totpEnabled) throw new Error("Two-factor is already enabled.");
    if (!user.totpSecret) {
      throw new Error("Setup not started — generate a QR code first.");
    }
    if (!verifyTotpCode(code, user.totpSecret)) {
      throw new Error("That code isn't right. Wait for a fresh one and retry.");
    }
    await ctx.db.patch(user._id, { totpEnabled: true });
  },
});

/** Turn two-factor off — requires a live code so a stray session can't strip it. */
export const disable = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    if (!user.totpEnabled || !user.totpSecret) {
      throw new Error("Two-factor authentication is not enabled.");
    }
    if (!verifyTotpCode(code, user.totpSecret)) {
      throw new Error("That code isn't right. Wait for a fresh one and retry.");
    }
    await ctx.db.patch(user._id, {
      totpSecret: undefined,
      totpEnabled: undefined,
    });
  },
});

/**
 * Public pre-sign-in hint: does this email require an authenticator
 * code with its password? Used by the auth screen to show the field.
 */
export const isTotpRequired = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    if (!email.trim()) return { required: false };
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email.trim()))
      .first();
    return { required: user?.totpEnabled === true };
  },
});
