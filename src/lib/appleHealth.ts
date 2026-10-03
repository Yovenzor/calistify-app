import { unzip } from "fflate";

/**
 * Apple Health export parser.
 *
 * The Health app (iOS) can export everything it knows — steps, energy,
 * exercise minutes, sleep, resting heart rate — as `export.zip` containing a
 * large `export.xml`. This module reads that export entirely on-device and
 * aggregates it into one row per local day, so only daily totals ever reach
 * our backend.
 *
 * Overlapping samples (iPhone + Watch both recording the same hours) are
 * merged with a sweep that takes the *maximum rate* over each instant
 * instead of naively summing, so totals match what the Health app shows.
 */

export interface HealthDay {
  date: string; // YYYY-MM-DD (device-local day)
  steps?: number;
  activeKcal?: number;
  basalKcal?: number;
  exerciseMin?: number;
  sleepMin?: number;
  restingHr?: number;
}

interface Interval {
  s: number;
  e: number;
  v: number;
}

/* quantity types we accumulate over time (value is a total over the interval) */
const QUANTITY_TYPES: Record<string, keyof HealthDay> = {
  "HKQuantityTypeIdentifier.stepCount": "steps",
  "HKQuantityTypeIdentifier.activeEnergyBurned": "activeKcal",
  "HKQuantityTypeIdentifier.basalEnergyBurned": "basalKcal",
  "HKQuantityTypeIdentifier.appleExerciseTime": "exerciseMin",
};

const SLEEP_TYPE = "HKCategoryTypeIdentifier.sleepAnalysis";
const RESTING_HR_TYPE = "HKQuantityTypeIdentifier.restingHeartRate";

/** "2026-10-03 07:03:00 +0700" → epoch ms (Safari-safe ISO rebuild). */
function parseAppleDate(s: string): number {
  const m =
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2}):?(\d{2})$/.exec(
      s.trim(),
    );
  if (m) {
    const iso = `${m[1]}T${m[2]}${m[3]}${m[4]}:${m[5]}`;
    const t = Date.parse(iso);
    if (!Number.isNaN(t)) return t;
  }
  const fallback = Date.parse(s);
  return Number.isNaN(fallback) ? NaN : fallback;
}

function dayKey(ms: number): string {
  return new Date(ms).toLocaleDateString("en-CA"); // YYYY-MM-DD
}

/**
 * Merge intervals per local day using a sweep line: between two events the
 * accumulated value is max(density) × elapsed time. For sleep (density 1)
 * this is a plain union of intervals — no double counting across sources.
 */
function sweepToDays(intervals: Interval[]): Map<string, number> {
  const out = new Map<string, number>();
  const add = (day: string, value: number) => {
    out.set(day, (out.get(day) ?? 0) + value);
  };

  type Ev = { t: number; d: number; dens: number };
  const events: Ev[] = [];
  for (const iv of intervals) {
    if (!(iv.e > iv.s) || !(iv.v > 0)) {
      // degenerate sample: value belongs entirely to its start day
      if (iv.v > 0 && Number.isFinite(iv.s)) add(dayKey(iv.s), iv.v);
      continue;
    }
    const dens = iv.v / (iv.e - iv.s);
    events.push({ t: iv.s, d: 1, dens });
    events.push({ t: iv.e, d: -1, dens });
  }
  events.sort((a, b) => a.t - b.t);

  const active = new Map<number, number>(); // density → count
  let prev: number | null = null;
  let i = 0;
  while (i < events.length) {
    const t = events[i].t;
    if (prev !== null && t > prev) {
      let maxDens = 0;
      for (const [dens, count] of active) {
        if (count > 0 && dens > maxDens) maxDens = dens;
      }
      if (maxDens > 0) add(dayKey(prev), maxDens * (t - prev));
    }
    while (i < events.length && events[i].t === t) {
      const ev = events[i];
      const next = (active.get(ev.dens) ?? 0) + ev.d;
      if (next <= 0) active.delete(ev.dens);
      else active.set(ev.dens, next);
      i++;
    }
    prev = t;
  }
  return out;
}

const RECORD_RE = /<Record\b[^>]*?\/?>/g;
const TYPE_RE = /\btype="([^"]+)"/;
const VALUE_RE = /\bvalue="([^"]*)"/;
const START_RE = /\bstartDate="([^"]+)"/;
const END_RE = /\bendDate="([^"]+)"/;

/** Aggregate a raw export.xml into per-day totals. */
export function parseExportXml(xml: string): HealthDay[] {
  const byType = new Map<string, Interval[]>();
  const resting: { t: number; v: number; day: string }[] = [];
  let matched = 0;

  RECORD_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = RECORD_RE.exec(xml)) !== null) {
    const record = match[0];
    const typeM = TYPE_RE.exec(record);
    if (!typeM) continue;
    const type = typeM[1];
    const qKey = Object.prototype.hasOwnProperty.call(QUANTITY_TYPES, type)
      ? QUANTITY_TYPES[type]
      : undefined;
    const isQuantity = qKey !== undefined;
    const isSleep = type === SLEEP_TYPE;
    const isResting = type === RESTING_HR_TYPE;
    if (!isQuantity && !isSleep && !isResting) continue;
    matched++;

    const startM = START_RE.exec(record);
    if (!startM) continue;
    const s = parseAppleDate(startM[1]);
    if (Number.isNaN(s)) continue;

    if (isResting) {
      const valM = VALUE_RE.exec(record);
      const v = valM ? Number.parseFloat(valM[1]) : NaN;
      if (Number.isFinite(v)) {
        resting.push({ t: s, v, day: dayKey(s) });
      }
      continue;
    }

    const endM = END_RE.exec(record);
    const e = endM ? parseAppleDate(endM[1]) : s;
    if (Number.isNaN(e)) continue;

    let v: number;
    if (isSleep) {
      v = Math.max(0, e - s); // coverage: value lives in the interval itself
    } else {
      const valM = VALUE_RE.exec(record);
      v = valM ? Number.parseFloat(valM[1]) : NaN;
      if (!Number.isFinite(v) || v < 0) continue;
    }
    const key = isSleep ? "sleepMin" : qKey;
    if (!key) continue;
    let bucket = byType.get(key);
    if (!bucket) {
      bucket = [];
      byType.set(key, bucket);
    }
    bucket.push({ s, e, v });
  }

  if (matched === 0) return [];

  const days = new Map<string, HealthDay>();
  const day = (date: string): HealthDay => {
    let d = days.get(date);
    if (!d) {
      d = { date };
      days.set(date, d);
    }
    return d;
  };

  const rounding: Record<string, number> = {
    steps: 1,
    activeKcal: 1,
    basalKcal: 1,
    exerciseMin: 1,
    sleepMin: 1,
  };
  for (const [key, intervals] of byType) {
    const scale = key === "sleepMin" ? 1 / 60_000 : 1; // ms → minutes for sleep
    for (const [date, value] of sweepToDays(intervals)) {
      const rounded = Math.round(value * scale * rounding[key]) / rounding[key];
      if (rounded > 0)
        (day(date) as unknown as Record<string, number>)[key] = rounded;
    }
  }

  // resting heart rate: latest reading of each day wins
  const latest = new Map<string, { t: number; v: number }>();
  for (const r of resting) {
    const cur = latest.get(r.day);
    if (!cur || r.t >= cur.t) latest.set(r.day, { t: r.t, v: r.v });
  }
  for (const [date, r] of latest) {
    day(date).restingHr = Math.round(r.v);
  }

  return [...days.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Read a File (export.zip or export.xml) into per-day health metrics. */
export async function parseHealthExport(file: File): Promise<HealthDay[]> {
  const lower = file.name.toLowerCase();

  let xml: string;
  if (lower.endsWith(".xml")) {
    xml = await file.text();
  } else {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let entries: Record<string, Uint8Array>;
    try {
      entries = await new Promise((resolve, reject) => {
        unzip(bytes, {}, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    } catch {
      throw new Error(
        "Could not open that zip — export it from the Health app (photo → Export All Health Data).",
      );
    }
    const names = Object.keys(entries);
    const chosen =
      names.find((n) => /(^|\/)export\.xml$/i.test(n)) ??
      names.find(
        (n) =>
          n.toLowerCase().endsWith(".xml") &&
          n.toLowerCase().includes("export"),
      ) ??
      names.find((n) => n.toLowerCase().endsWith(".xml"));
    if (!chosen) {
      throw new Error(
        "This zip has no export.xml inside — re-export from the Health app.",
      );
    }
    xml = new TextDecoder().decode(entries[chosen]);
  }

  const days = parseExportXml(xml);
  if (days.length === 0) {
    throw new Error(
      "No health records found — make sure this is an Apple Health export.",
    );
  }
  return days;
}
