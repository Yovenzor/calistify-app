import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { processHealthPayload } from "../lib/healthSync";

export const HEALTH_SYNC_PREFIX = "/api/health/";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST /api/health/<token> — the private sync endpoint.
 *
 * The token is the user's consent + identity (created by startConnection and
 * shown only to them). Two payload shapes are accepted — the HC Webhook
 * Android app's interval-record JSON (Health Connect) and a simple
 * `{date?, steps?, calories?}` body from an iOS Shortcut. Aggregated local
 * days are upserted; the rolling ledger makes re-deliveries idempotent.
 * HTTP actions are actions, so all database work goes through internal
 * functions.
 */
export async function handleHealthSync(
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const token = decodeURIComponent(
    new URL(request.url).pathname.slice(HEALTH_SYNC_PREFIX.length),
  ).replace(/\/+$/, "");
  if (!token) return json({ error: "missing token" }, 400);

  const conn = await ctx.runQuery(internal.health.connectionByToken, {
    token,
  });
  if (!conn) return json({ error: "invalid token" }, 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "body must be JSON" }, 400);
  }

  const result = processHealthPayload(
    body,
    conn.ledger,
    conn.tzOffsetMin,
    Date.now(),
  );
  if (!result.ok) return json({ error: result.error }, 400);

  const applied = await ctx.runMutation(internal.health.applySyncResult, {
    connectionId: conn.connectionId,
    days: result.days,
    source: result.source,
    ledgerSteps: result.ledger.steps,
    ledgerActive: result.ledger.active,
    ledgerTotal: result.ledger.total,
    ledgerSleep: result.ledger.sleep,
  });
  return json({ ok: true, days: applied });
}
