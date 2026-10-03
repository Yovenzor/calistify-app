/**
 * Pure processing for the private health sync endpoint.
 *
 * Two payload shapes are accepted:
 *  - Interval mode: the HC Webhook Android app (Health Connect bridge) POSTs
 *    arrays of interval records (`steps`, `active_calories`, `total_calories`,
 *    `sleep`). Deliveries are incremental over a rolling 48h window and
 *    records can be re-sent when updated, so every record is upserted into a
 *    rolling ledger keyed by its start time — re-delivery replaces instead of
 *    double-counting — and affected local days are recomputed from the ledger.
 *  - Absolute mode: a simple `{date?, steps?, calories?}` body (iOS Shortcuts
 *    "Get contents of URL"), which overwrites that day outright.
 *
 * Nothing here touches Convex — it is deterministic and unit-testable.
 */

export interface SyncLedger {
  /** interval start (ISO-8601 UTC) → steps */
  steps: Record<string, number>;
  /** interval start → active kcal */
  active: Record<string, number>;
  /** interval start → total kcal */
  total: Record<string, number>;
  /** sleep session end (ISO-8601 UTC) → duration seconds */
  sleep: Record<string, number>;
}

export interface HealthDayPatch {
  date: string; // YYYY-MM-DD in the user's local day
  steps?: number;
  activeKcal?: number;
  basalKcal?: number;
  exerciseMin?: number;
  sleepMin?: number;
  restingHr?: number;
}

export interface ProcessOk {
  ok: true;
  ledger: SyncLedger;
  days: HealthDayPatch[];
  source: string;
}

export interface ProcessErr {
  ok: false;
  error: string;
}

export type ProcessResult = ProcessOk | ProcessErr;

/** Ledgers older than this are pruned — well beyond the 48h delivery window. */
const RETENTION_MS = 7 * 86_400_000;

const MAX_STEPS = 10_000_000;
const MAX_KCAL = 100_000;
const MAX_SLEEP_SEC = 86_400 * 2;

/** Local calendar day (YYYY-MM-DD) of a UTC instant, given a UTC offset. */
export function localDay(iso: string, tzOffsetMin: number): string | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t + tzOffsetMin * 60_000).toISOString().slice(0, 10);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asArray(
  body: Record<string, unknown>,
  key: string,
): Record<string, unknown>[] {
  const arr = body[key];
  if (!Array.isArray(arr)) return [];
  return arr.filter(isRecord);
}

function numOf(
  r: Record<string, unknown>,
  key: string,
  max: number,
): number | null {
  const raw = r[key];
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) return null;
  return Math.min(raw, max);
}

function isoOf(r: Record<string, unknown>, key: string): string | null {
  const raw = r[key];
  if (typeof raw !== "string" || Number.isNaN(Date.parse(raw))) return null;
  return raw;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** One pass: sum ledger entries for the touched days only. */
function recomputeDays(
  ledger: SyncLedger,
  touched: Set<string>,
  tzOffsetMin: number,
): HealthDayPatch[] {
  const acc = new Map<
    string,
    {
      steps: number;
      active: number;
      total: number;
      sleepSec: number;
      seen: Set<string>;
    }
  >();
  const bucket = (date: string | null, kind: string, value: number) => {
    if (date === null || !touched.has(date)) return;
    let a = acc.get(date);
    if (!a) {
      a = { steps: 0, active: 0, total: 0, sleepSec: 0, seen: new Set() };
      acc.set(date, a);
    }
    a.seen.add(kind);
    if (kind === "steps") a.steps += value;
    else if (kind === "active") a.active += value;
    else if (kind === "total") a.total += value;
    else a.sleepSec += value;
  };

  for (const [key, v] of Object.entries(ledger.steps))
    bucket(localDay(key, tzOffsetMin), "steps", v);
  for (const [key, v] of Object.entries(ledger.active))
    bucket(localDay(key, tzOffsetMin), "active", v);
  for (const [key, v] of Object.entries(ledger.total))
    bucket(localDay(key, tzOffsetMin), "total", v);
  for (const [key, v] of Object.entries(ledger.sleep)) {
    const end = Date.parse(key);
    if (Number.isNaN(end)) continue;
    bucket(
      localDay(new Date(end - v * 1000).toISOString(), tzOffsetMin),
      "sleep",
      v,
    );
  }

  const days: HealthDayPatch[] = [];
  for (const [date, a] of acc) {
    const patch: HealthDayPatch = { date };
    if (a.seen.has("steps")) patch.steps = Math.round(a.steps);
    const active = Math.round(a.active);
    const total = Math.round(a.total);
    if (active > 0) {
      patch.activeKcal = active;
      if (total > active) patch.basalKcal = total - active;
    } else if (total > 0) {
      patch.activeKcal = total; // only total reported — show it as the calorie figure
    }
    if (a.sleepSec > 0) patch.sleepMin = Math.round(a.sleepSec / 60);
    if (
      patch.steps !== undefined ||
      patch.activeKcal !== undefined ||
      patch.sleepMin !== undefined
    ) {
      days.push(patch);
    }
  }
  days.sort((x, y) => (x.date < y.date ? -1 : 1));
  return days;
}

function prune(ledger: SyncLedger, now: number): SyncLedger {
  const cutoff = new Date(now - RETENTION_MS).toISOString();
  const cut = (m: Record<string, number>) => {
    for (const key of Object.keys(m)) {
      if (key < cutoff) delete m[key];
    }
  };
  cut(ledger.steps);
  cut(ledger.active);
  cut(ledger.total);
  cut(ledger.sleep);
  return ledger;
}

/**
 * Process one sync delivery. Returns the merged ledger plus the local-day
 * patches to upsert (undefined fields clear stale values on recompute).
 */
export function processHealthPayload(
  body: unknown,
  prev: SyncLedger,
  tzOffsetMin: number,
  now: number,
): ProcessResult {
  if (!isRecord(body))
    return { ok: false, error: "body must be a JSON object" };

  /* ── absolute mode: { date?, steps?, calories? } ── */
  const absSteps = typeof body.steps === "number" ? body.steps : null;
  const absCalories =
    typeof body.calories === "number"
      ? body.calories
      : typeof body.activeCalories === "number"
        ? body.activeCalories
        : null;
  const hasIntervalArrays = [
    "steps",
    "active_calories",
    "total_calories",
    "sleep",
  ].some((k) => Array.isArray(body[k]));
  if (!hasIntervalArrays && (absSteps !== null || absCalories !== null)) {
    const date =
      typeof body.date === "string" && DATE_RE.test(body.date)
        ? body.date
        : new Date(now + tzOffsetMin * 60_000).toISOString().slice(0, 10);
    const patch: HealthDayPatch = { date };
    if (absSteps !== null && Number.isFinite(absSteps) && absSteps >= 0) {
      patch.steps = Math.round(Math.min(absSteps, MAX_STEPS));
    }
    if (
      absCalories !== null &&
      Number.isFinite(absCalories) &&
      absCalories >= 0
    ) {
      patch.activeKcal = Math.round(Math.min(absCalories, MAX_KCAL));
    }
    if (patch.steps === undefined && patch.activeKcal === undefined) {
      return { ok: false, error: "no valid steps or calories in payload" };
    }
    return { ok: true, ledger: prev, days: [patch], source: "shortcuts" };
  }

  /* ── interval mode: HC Webhook record arrays ── */
  const steps = asArray(body, "steps");
  const active = asArray(body, "active_calories");
  const total = asArray(body, "total_calories");
  const sleep = asArray(body, "sleep");
  if (steps.length + active.length + total.length + sleep.length === 0) {
    return { ok: false, error: "no recognised health data in payload" };
  }

  const ledger: SyncLedger = {
    steps: { ...prev.steps },
    active: { ...prev.active },
    total: { ...prev.total },
    sleep: { ...prev.sleep },
  };
  const touched = new Set<string>();
  const put = (
    map: Record<string, number>,
    key: string | null,
    value: number | null,
    dayOf: () => string | null,
  ) => {
    if (key === null || value === null) return;
    map[key] = value; // upsert: re-delivered (updated) records replace
    const day = dayOf();
    if (day) touched.add(day);
  };

  for (const r of steps) {
    const key = isoOf(r, "start_time");
    put(ledger.steps, key, numOf(r, "count", MAX_STEPS), () =>
      key ? localDay(key, tzOffsetMin) : null,
    );
  }
  for (const r of active) {
    const key = isoOf(r, "start_time");
    put(ledger.active, key, numOf(r, "calories", MAX_KCAL), () =>
      key ? localDay(key, tzOffsetMin) : null,
    );
  }
  for (const r of total) {
    const key = isoOf(r, "start_time");
    put(ledger.total, key, numOf(r, "calories", MAX_KCAL), () =>
      key ? localDay(key, tzOffsetMin) : null,
    );
  }
  for (const r of sleep) {
    const key = isoOf(r, "session_end_time");
    const dur = numOf(r, "duration_seconds", MAX_SLEEP_SEC);
    put(ledger.sleep, key, dur && dur > 0 ? dur : null, () => {
      if (key === null || dur === null) return null;
      return localDay(
        new Date(Date.parse(key) - dur * 1000).toISOString(),
        tzOffsetMin,
      );
    });
  }

  if (touched.size === 0)
    return { ok: false, error: "no valid records in payload" };

  prune(ledger, now);
  const days = recomputeDays(ledger, touched, tzOffsetMin);
  return { ok: true, ledger, days, source: "health_connect" };
}
