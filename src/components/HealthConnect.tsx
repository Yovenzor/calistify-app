import { api } from "@/convex/_generated/api";
import { SectionLabel } from "@/components/AppUI";
import { formatNumber } from "@/lib/format";
import { parseHealthExport } from "@/lib/appleHealth";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  HeartPulse,
  Loader2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";

type Status = { kind: "busy" | "done" | "error"; msg: string };

const CHUNK = 150; // days per mutation — keeps every call well under limits

function relTime(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(ts).toLocaleDateString();
}

/**
 * "Health Connection" for the profile: reads the user's own Apple Health
 * export (the data behind Fitness / Health) and stores one aggregated row
 * per day — steps, calories, exercise, sleep, resting heart rate.
 */
export function HealthConnect() {
  const health = useQuery(api.health.overview);
  const importDays = useMutation(api.health.importDays);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status | null>(null);

  const connected = !!health && health.lastImportedAt !== null;

  const onFile = async (file: File) => {
    setStatus({ kind: "busy", msg: "Reading your health export…" });
    await new Promise((r) => setTimeout(r, 30)); // let the label paint first
    try {
      const days = await parseHealthExport(file);
      for (let i = 0; i < days.length; i += CHUNK) {
        setStatus({
          kind: "busy",
          msg: `Syncing ${Math.min(i + CHUNK, days.length)} of ${days.length} days…`,
        });
        await importDays({
          source: "apple_health",
          days: days.slice(i, i + CHUNK),
        });
      }
      setStatus({
        kind: "done",
        msg: `Connected — ${days.length} days synced from Apple Health`,
      });
    } catch (err) {
      setStatus({
        kind: "error",
        msg: err instanceof Error ? err.message : "Could not read that file",
      });
    }
  };

  const input = (
    <input
      ref={fileRef}
      type="file"
      accept=".zip,.xml,application/zip,text/xml"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void onFile(f);
        e.target.value = "";
      }}
    />
  );

  if (health === undefined) {
    return (
      <div>
        <SectionLabel>Health Connection</SectionLabel>
        <div className="h-[168px] animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-CA");
  const todayRow = health.days.find((d) => d.date === today);
  const kcal =
    todayRow &&
    (todayRow.activeKcal !== undefined || todayRow.basalKcal !== undefined)
      ? (todayRow.activeKcal ?? 0) + (todayRow.basalKcal ?? 0)
      : undefined;
  const stepsToday = todayRow?.steps;

  const week = health.days.slice(-7);
  const maxSteps = Math.max(1, ...week.map((d) => d.steps ?? 0));

  return (
    <div>
      <SectionLabel
        action={
          connected && health.lastImportedAt !== null ? (
            <span className="text-[10px] text-primary">
              Synced {relTime(health.lastImportedAt)}
            </span>
          ) : undefined
        }
      >
        Health Connection
      </SectionLabel>

      <div className="rounded-2xl border border-border bg-card p-4">
        {connected ? (
          <>
            {/* today's numbers — straight from the health app */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-secondary py-3">
                <p className="num text-[17px] font-bold">
                  {stepsToday !== undefined ? formatNumber(stepsToday) : "—"}
                </p>
                <p className="text-[9px] tracking-[0.06em] text-muted-foreground uppercase">
                  Steps
                </p>
              </div>
              <div className="rounded-xl bg-secondary py-3">
                <p className="num text-[17px] font-bold">
                  {kcal !== undefined ? formatNumber(kcal) : "—"}
                </p>
                <p className="text-[9px] tracking-[0.06em] text-muted-foreground uppercase">
                  Calories
                </p>
              </div>
              <div className="rounded-xl bg-secondary py-3">
                <p className="num text-[17px] font-bold">
                  {todayRow?.exerciseMin !== undefined
                    ? `${Math.round(todayRow.exerciseMin)}′`
                    : "—"}
                </p>
                <p className="text-[9px] tracking-[0.06em] text-muted-foreground uppercase">
                  Exercise
                </p>
              </div>
            </div>

            {/* last 7 days of steps */}
            <div className="mt-4">
              <div className="flex items-end justify-between gap-1.5">
                {week.map((d) => {
                  const s = d.steps ?? 0;
                  const h =
                    s > 0 ? Math.max(6, Math.round((s / maxSteps) * 52)) : 3;
                  const isToday = d.date === today;
                  return (
                    <div
                      key={d.date}
                      className="flex flex-1 flex-col items-center gap-1.5"
                    >
                      <div
                        className={
                          s > 0
                            ? isToday
                              ? "w-full rounded-md bg-primary"
                              : "w-full rounded-md bg-primary/40"
                            : "w-full rounded-md bg-secondary"
                        }
                        style={{ height: h }}
                      />
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(`${d.date}T00:00:00`).toLocaleDateString(
                          undefined,
                          { weekday: "narrow" },
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                Steps · last {week.length} days
              </p>
            </div>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-2.5 text-[12px] font-semibold transition-colors hover:border-primary/30"
            >
              <Upload className="size-3.5" />
              Re-import health data
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center py-2 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <HeartPulse className="size-6 text-primary" />
            </span>
            <p className="mt-3 text-[15px] font-bold">
              Connect your health app
            </p>
            <p className="mt-1 max-w-[300px] text-[11px] leading-5 text-muted-foreground">
              Read steps, calories, exercise and sleep straight from Apple
              Health — the same numbers you see in Fitness.
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              <Upload className="size-4" />
              Connect Apple Health
            </button>
            <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
              Health app → your photo → Export All Health Data, then pick the
              zip here. Parsed on this device — only daily totals are stored.
            </p>
          </div>
        )}

        {status && (
          <p
            className={
              status.kind === "error"
                ? "mt-3 flex items-start gap-1.5 text-[11px] leading-4 text-destructive"
                : status.kind === "done"
                  ? "mt-3 flex items-start gap-1.5 text-[11px] leading-4 text-primary"
                  : "mt-3 flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground"
            }
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
        )}
        {input}
      </div>
    </div>
  );
}
