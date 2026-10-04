import { SectionLabel } from "@/components/AppUI";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import {
  checkHealthAccess,
  healthAvailable,
  isHealthConnected,
  isNativeShell,
  nativePlatform,
  openHealthSettings,
  readTodayActivity,
  requestHealthAccess,
  type HealthAccessStatus,
  type HealthPlatform,
  type TodayActivity,
} from "@/lib/healthNative";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertCircle,
  Apple,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Footprints,
  Flame,
  Link2,
  Loader2,
  Settings2,
  Smartphone,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Status = { kind: "busy" | "done" | "error"; msg: string };
type Mode = "loading" | "browser" | "no-sdk" | "app";

const COPY: Record<
  HealthPlatform,
  { name: string; tagline: string; icon: typeof Apple }
> = {
  ios: {
    name: "Apple Health",
    tagline: "Sync your workouts and fitness data with Apple Health.",
    icon: Apple,
  },
  android: {
    name: "Health Connect",
    tagline: "Sync your workouts and fitness data with Health Connect.",
    icon: Smartphone,
  },
};

const HEALTH_CONNECT_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata";

function StatusLine({ status }: { status: Status }) {
  const tone =
    status.kind === "error"
      ? "text-destructive"
      : status.kind === "done"
        ? "text-primary"
        : "text-muted-foreground";
  return (
    <p
      className={cn(
        "mt-3 flex items-start gap-1.5 text-[11px] leading-4",
        tone,
      )}
    >
      {status.kind === "busy" && (
        <Loader2 className="mt-px size-3.5 shrink-0 animate-spin" />
      )}
      {status.kind === "done" && (
        <CheckCircle2 className="mt-px size-3.5 shrink-0" />
      )}
      {status.kind === "error" && (
        <AlertCircle className="mt-px size-3.5 shrink-0" />
      )}
      {status.msg}
    </p>
  );
}

function Tile({
  value,
  label,
  icon: Icon,
}: {
  value: string;
  label: string;
  icon: typeof Footprints;
}) {
  return (
    <div className="rounded-xl bg-secondary py-3 text-center">
      <Icon className="mx-auto mb-1 size-3.5 text-primary" />
      <p className="num text-[17px] font-bold">{value}</p>
      <p className="text-[9px] tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  );
}

function AccessChip({ label, granted }: { label: string; granted: boolean }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold",
        granted
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      {granted ? (
        <Check className="size-3" />
      ) : (
        <span className="size-3 text-center leading-3">×</span>
      )}
      {label}
    </span>
  );
}

/**
 * Health Integration (Profile): connects the app to the phone's REAL health
 * platform — HealthKit permission screens on iPhone, Health Connect screens
 * on Android — through the local native plugin in ios/ and android/. Status,
 * including later revocation, comes from the platform itself; nothing is
 * faked in the browser.
 */
export function HealthConnect() {
  const [mode, setMode] = useState<Mode>("loading");
  const [platform, setPlatform] = useState<HealthPlatform>(
    () => nativePlatform() ?? "ios",
  );
  const [access, setAccess] = useState<HealthAccessStatus | null>(null);
  const [tiles, setTiles] = useState<TodayActivity | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const accessRef = useRef<HealthAccessStatus | null>(null);
  useEffect(() => {
    accessRef.current = access;
  }, [access]);

  const connected = isHealthConnected(access);

  /** Re-reads platform permissions (no UI) and refreshes the real tiles. */
  const refreshAccess = async (): Promise<HealthAccessStatus | null> => {
    try {
      const next = await checkHealthAccess();
      setAccess(next);
      if (isHealthConnected(next)) {
        setTiles(await readTodayActivity());
      } else {
        setTiles(null);
      }
      return next;
    } catch {
      return accessRef.current;
    }
  };

  useEffect(() => {
    let alive = true;

    const init = async () => {
      if (!isNativeShell()) {
        if (alive) setMode("browser");
        return;
      }
      const native = nativePlatform();
      if (native) setPlatform(native);
      const availability = await healthAvailable();
      if (!alive) return;
      if (!availability.available) {
        setMode("no-sdk");
        return;
      }
      setMode("app");
      try {
        const current = await checkHealthAccess();
        if (!alive) return;
        setAccess(current);
        if (isHealthConnected(current)) setTiles(await readTodayActivity());
      } catch {
        // first launch on iOS: nothing requested yet
      }
    };
    void init();

    // Revocation detection: re-check whenever the user returns to the app
    // (e.g. after changing permissions in the Health / Health Connect app).
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !alive) return;
      const previous = accessRef.current;
      void (async () => {
        const next = await refreshAccess();
        if (
          previous &&
          isHealthConnected(previous) &&
          next &&
          !isHealthConnected(next)
        ) {
          setStatus({
            kind: "error",
            msg: "Health access was removed — tap Connect to restore it.",
          });
          setManageOpen(false);
        }
      })();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const connect = async () => {
    setBusy(true);
    setStatus({
      kind: "busy",
      msg:
        platform === "ios"
          ? "Opening the Apple Health permission screen…"
          : "Opening the Health Connect permission screen…",
    });
    try {
      const result = await requestHealthAccess();
      setAccess(result);
      if (isHealthConnected(result)) {
        setTiles(await readTodayActivity());
        setStatus({ kind: "done", msg: "Connected" });
      } else {
        setTiles(null);
        setStatus({
          kind: "error",
          msg:
            platform === "ios"
              ? "Access was not granted. If the screen doesn't appear again, enable CALISTIFY in Health → Profile → Apps → CALISTIFY, then tap Connect."
              : "Access was not granted — tap Connect to open the Health Connect screen again.",
        });
      }
    } catch (err) {
      setStatus({
        kind: "error",
        msg:
          err instanceof Error && err.message
            ? err.message
            : "Could not open the health permission screen.",
      });
    } finally {
      setBusy(false);
    }
  };

  const recheck = async () => {
    setBusy(true);
    setStatus({ kind: "busy", msg: "Checking your access…" });
    const previous = access;
    const next = await refreshAccess();
    if (next && isHealthConnected(next)) {
      setStatus({ kind: "done", msg: "Access confirmed" });
    } else if (previous && isHealthConnected(previous)) {
      setStatus({
        kind: "error",
        msg: "Health access was removed — tap Connect to restore it.",
      });
    } else {
      setStatus({
        kind: "error",
        msg: "No access has been granted yet.",
      });
    }
    setBusy(false);
  };

  const openSettings = async () => {
    setBusy(true);
    const opened = await openHealthSettings();
    setBusy(false);
    if (!opened) {
      setStatus({
        kind: "error",
        msg: "Open Health Connect from your phone's settings to manage permissions.",
      });
    }
  };

  if (mode === "loading") {
    return (
      <div>
        <SectionLabel>Health Integration</SectionLabel>
        <div className="h-[160px] animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }

  /* ── browser / desktop: honest fallback, never a fake flow ── */
  if (mode === "browser") {
    return (
      <div>
        <SectionLabel>Health Integration</SectionLabel>
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10">
            <Activity className="size-6 text-primary" />
          </span>
          <p className="mt-3 text-[15px] font-bold">
            Health integration is available on the mobile app.
          </p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            Open CALISTIFY on your iPhone or Android phone to connect Apple
            Health or Health Connect with the phone's native permission screen.
          </p>
        </div>
      </div>
    );
  }

  /* ── Android device without a usable Health Connect ── */
  if (mode === "no-sdk") {
    return (
      <div>
        <SectionLabel>Health Integration</SectionLabel>
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10">
            <Smartphone className="size-6 text-primary" />
          </span>
          <p className="mt-3 text-[15px] font-bold">Health Connect required</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            This phone doesn't have an up-to-date Health Connect yet. Install or
            update it, then come back to connect.
          </p>
          <a
            href={HEALTH_CONNECT_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Get Health Connect
          </a>
        </div>
      </div>
    );
  }

  const copy = COPY[platform];
  const PlatformIcon = copy.icon;
  const todayRow = tiles;

  /* ── connected: real platform state + real native reads ── */
  if (connected) {
    const writeGranted = (access?.writeAuthorized ?? []).includes("workouts");
    const readGranted = (access?.readAuthorized ?? []).includes("steps");
    return (
      <div>
        <SectionLabel
          action={
            <span className="flex items-center gap-1 text-[10px] text-primary">
              <Check className="size-3" />
              Connected
            </span>
          }
        >
          Health Integration
        </SectionLabel>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <PlatformIcon className="size-5 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold">
                {copy.name}
                <CheckCircle2 className="ml-1.5 inline size-3.5 text-primary" />
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {copy.tagline}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Tile
              value={
                todayRow?.steps !== undefined
                  ? formatNumber(todayRow.steps)
                  : "—"
              }
              label="Steps"
              icon={Footprints}
            />
            <Tile
              value={
                todayRow?.kcal !== undefined ? formatNumber(todayRow.kcal) : "—"
              }
              label="Calories"
              icon={Flame}
            />
            <Tile
              value={
                todayRow?.workouts !== undefined
                  ? String(todayRow.workouts)
                  : "—"
              }
              label="Workouts"
              icon={Dumbbell}
            />
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Read live from {copy.name} · steps & calories today, workouts this
            week
          </p>

          <button
            type="button"
            onClick={() => setManageOpen((open) => !open)}
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-[13px] font-semibold transition-colors hover:border-primary/40"
          >
            <Settings2 className="size-4" />
            Manage Connection
            {manageOpen ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>

          {manageOpen && (
            <div className="mt-3 space-y-3 rounded-xl border border-border bg-secondary/40 p-3">
              <div>
                <p className="text-[11px] font-semibold">
                  What CALISTIFY can access
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <AccessChip label="Steps" granted={readGranted} />
                  <AccessChip
                    label="Calories"
                    granted={(access?.readAuthorized ?? []).includes(
                      "calories",
                    )}
                  />
                  <AccessChip
                    label="Read workouts"
                    granted={(access?.readAuthorized ?? []).includes(
                      "workouts",
                    )}
                  />
                  <AccessChip label="Save workouts" granted={writeGranted} />
                </div>
                {!writeGranted && (
                  <p className="mt-2 text-[10px] leading-4 text-destructive">
                    Saving workouts is turned off — your workouts won't be
                    written to {copy.name} until you allow it.
                  </p>
                )}
              </div>

              {platform === "android" ? (
                <Button
                  variant="secondary"
                  className="h-9 w-full rounded-xl text-[12px] font-semibold"
                  disabled={busy}
                  onClick={() => void openSettings()}
                >
                  Open Health Connect settings
                </Button>
              ) : (
                <p className="text-[10px] leading-4 text-muted-foreground">
                  To change access later: Health → Profile → Apps → CALISTIFY on
                  your iPhone.
                </p>
              )}

              <Button
                variant="outline"
                className="h-9 w-full rounded-xl border-border text-[12px] font-semibold"
                disabled={busy}
                onClick={() => void recheck()}
              >
                {busy ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 size-3.5" />
                )}
                Recheck access
              </Button>
            </div>
          )}

          {status && <StatusLine status={status} />}
        </div>
      </div>
    );
  }

  /* ── native app, not connected: the real Connect card ── */
  return (
    <div>
      <SectionLabel>Health Integration</SectionLabel>
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
            <PlatformIcon className="size-6 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="text-[16px] font-bold">{copy.name}</p>
            <p className="text-[11px] leading-4 text-muted-foreground">
              {copy.tagline}
            </p>
          </div>
        </div>

        <Button
          className="mt-4 h-11 w-full rounded-xl font-semibold"
          disabled={busy}
          onClick={() => void connect()}
        >
          {busy ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Link2 className="mr-2 size-4" />
          )}
          Connect
        </Button>

        <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
          You'll see the real{" "}
          {platform === "ios" ? "Apple Health" : "Health Connect"} permission
          screen and choose exactly what CALISTIFY can access. Only steps,
          calories and workouts are requested.
        </p>

        {status && <StatusLine status={status} />}
      </div>
    </div>
  );
}
