import { Capacitor, registerPlugin } from "@capacitor/core";
import { Health } from "@capgo/capacitor-health";

/**
 * Native health bridge for CALISTIFY.
 *
 * Two native layers, both real (no web mocks):
 *  - `CalistifyHealth` — our local Capacitor plugin (ios/ + android/) that
 *    presents the REAL Apple Health / Health Connect permission screens,
 *    reports grant/revocation state, and writes finished workouts.
 *  - `Health` (@capgo/capacitor-health) — reads steps / active energy /
 *    workouts back out of the platform once permission is granted.
 *
 * Outside a native build every entry point is inert, so the UI can show the
 * honest "available on the mobile app" fallback instead of a fake flow.
 */

export type HealthPlatform = "ios" | "android";

export type HealthAccessStatus = {
  readAuthorized: string[];
  readDenied: string[];
  writeAuthorized: string[];
  writeDenied: string[];
  /** True once the permission screen has been shown at least once. */
  requested?: boolean;
};

interface CalistifyHealthPlugin {
  requestAccess(): Promise<HealthAccessStatus>;
  checkAccess(): Promise<HealthAccessStatus>;
  writeWorkout(options: {
    startDate: string;
    endDate: string;
    title?: string;
  }): Promise<{ ok: boolean }>;
}

const CalistifyHealth =
  registerPlugin<CalistifyHealthPlugin>("CalistifyHealth");

export type TodayActivity = {
  steps?: number;
  kcal?: number;
  workouts?: number;
};

/** True only inside the packaged iOS/Android app — never in a browser. */
export function isNativeShell(): boolean {
  return Capacitor.isNativePlatform();
}

export function nativePlatform(): HealthPlatform | null {
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android" ? platform : null;
}

/** Whether the device's native health SDK is usable at all. */
export async function healthAvailable(): Promise<{
  available: boolean;
  reason?: string;
}> {
  try {
    const result = await Health.isAvailable();
    return { available: result.available, reason: result.reason };
  } catch {
    return { available: false, reason: "Health services are unavailable." };
  }
}

/** Shows the native permission screen (HealthKit on iOS, Health Connect on Android). */
export async function requestHealthAccess(): Promise<HealthAccessStatus> {
  return await CalistifyHealth.requestAccess();
}

/** Reads the current grant state without any UI — used to detect revocation. */
export async function checkHealthAccess(): Promise<HealthAccessStatus> {
  return await CalistifyHealth.checkAccess();
}

export function isHealthConnected(status: HealthAccessStatus | null): boolean {
  if (!status) return false;
  return status.readAuthorized.length > 0 || status.writeAuthorized.length > 0;
}

/**
 * Real reads from the platform: today's steps and active energy, plus
 * workouts recorded in the last 7 days. Every value is optional — types the
 * user did not grant simply come back absent and the UI shows "—".
 */
export async function readTodayActivity(): Promise<TodayActivity> {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(dayStart.getTime() - 6 * 86_400_000);
  const out: TodayActivity = {};

  try {
    const { samples } = await Health.queryAggregated({
      dataType: "steps",
      startDate: dayStart.toISOString(),
      endDate: now.toISOString(),
      bucket: "day",
      aggregation: "sum",
    });
    out.steps = Math.round(samples.reduce((sum, s) => sum + s.value, 0));
  } catch {
    // steps not granted or not tracked — leave undefined
  }

  try {
    const { samples } = await Health.queryAggregated({
      dataType: "calories",
      startDate: dayStart.toISOString(),
      endDate: now.toISOString(),
      bucket: "day",
      aggregation: "sum",
    });
    out.kcal = Math.round(samples.reduce((sum, s) => sum + s.value, 0));
  } catch {
    // active energy not granted — leave undefined
  }

  try {
    const { workouts } = await Health.queryWorkouts({
      startDate: weekStart.toISOString(),
      endDate: now.toISOString(),
      limit: 50,
    });
    out.workouts = workouts.length;
  } catch {
    // workout read not granted — leave undefined
  }

  return out;
}

/**
 * Android: opens the phone's Health Connect settings screen so the user can
 * manage (or revoke) CALISTIFY's permissions. iOS provides no deep link into
 * the Health app, so this reports that instead of faking anything.
 */
export async function openHealthSettings(): Promise<boolean> {
  if (Capacitor.getPlatform() !== "android") return false;
  try {
    await Health.openHealthConnectSettings();
    return true;
  } catch {
    return false;
  }
}

/**
 * Called when the user finishes a workout: saves it to the connected health
 * platform (Apple Health / Health Connect) as a real workout/exercise session.
 * Silent no-op outside the native app; never blocks the save flow.
 */
export async function writeWorkoutToHealth(workout: {
  startedAt: number;
  endedAt: number;
  title: string;
}): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await CalistifyHealth.writeWorkout({
      startDate: new Date(workout.startedAt).toISOString(),
      endDate: new Date(workout.endedAt).toISOString(),
      title: workout.title,
    });
    return true;
  } catch (err) {
    console.warn("Could not write workout to the health platform", err);
    return false;
  }
}
