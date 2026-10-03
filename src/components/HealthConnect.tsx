import { api } from "@/convex/_generated/api";
import { SectionLabel } from "@/components/AppUI";
import { formatNumber } from "@/lib/format";
import { parseHealthExport } from "@/lib/appleHealth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Apple,
  Check,
  CheckCircle2,
  Copy,
  Footprints,
  HeartPulse,
  Link2,
  Loader2,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";

type Status = { kind: "busy" | "done" | "error"; msg: string };
type Platform = "ios" | "android";

const CHUNK = 150; // days per mutation — keeps every call well under limits
const CONSENT_KEY = "calistify_health_consent";

function readConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

function detectPlatform(): Platform {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return /Android/i.test(ua) ? "android" : "ios";
}

/**
 * The user's private sync endpoint. HTTP actions are served on the
 * deployment's `.convex.site` domain — same host as VITE_CONVEX_URL but
 * with the `.cloud` suffix swapped.
 */
function syncUrl(token: string): string {
  const base = (import.meta.env.VITE_CONVEX_URL as string | undefined) ?? "";
  const root = (
    base || (typeof window !== "undefined" ? window.location.origin : "")
  )
    .replace(/\/+$/, "")
    .replace(/\.convex\.cloud$/, ".convex.site");
  return `${root}/api/health/${token}`;
}

function relTime(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(ts).toLocaleDateString();
}

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

/**
 * Health Connection for the profile: a consent-gated flow (terms → device →
 * connect) that ends in a private sync endpoint — Health Connect bridges to
 * it via the HC Webhook app, iOS via a Shortcuts POST — plus a one-time
 * on-device Apple Health import for full history. Only aggregated daily
 * totals are ever stored.
 */
export function HealthConnect() {
  const health = useQuery(api.health.overview);
  const startConnection = useMutation(api.health.startConnection);
  const disconnectMutation = useMutation(api.health.disconnect);
  const importDays = useMutation(api.health.importDays);

  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [agreed, setAgreed] = useState(readConsent);
  const [stage, setStage] = useState<"consent" | "platform">(() =>
    readConsent() ? "platform" : "consent",
  );
  const [platform, setPlatform] = useState<Platform>(detectPlatform);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const onFile = async (file: File) => {
    setStatus({ kind: "busy", msg: "Reading your health data…" });
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
        msg: `History imported — ${days.length} days synced`,
      });
    } catch (err) {
      setStatus({
        kind: "error",
        msg: err instanceof Error ? err.message : "Could not read that file",
      });
    }
  };

  const connect = async () => {
    setBusy(true);
    setStatus({ kind: "busy", msg: "Opening your connection…" });
    try {
      await startConnection({
        platform,
        tzOffsetMin: -new Date().getTimezoneOffset(),
        agreed: true,
      });
      setStatus({
        kind: "done",
        msg:
          platform === "ios"
            ? "Connected — set up auto-sync or import your history below"
            : "Connected — finish setup with the HC Webhook app below",
      });
    } catch (err) {
      setStatus({
        kind: "error",
        msg: err instanceof Error ? err.message : "Could not connect",
      });
    } finally {
      setBusy(false);
    }
  };

  const copyEndpoint = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setStatus({
        kind: "error",
        msg: "Copy failed — select the URL manually",
      });
    }
  };

  const doDisconnect = async () => {
    if (
      !window.confirm(
        "Disconnect and permanently delete your stored health data?",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await disconnectMutation();
      setStatus({
        kind: "done",
        msg: "Disconnected — stored health data deleted",
      });
      setStage(readConsent() ? "platform" : "consent");
    } finally {
      setBusy(false);
    }
  };

  const fileInput = (
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
        <div className="h-[220px] animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }

  const conn = health.connection;

  /* ── connected: stats, private endpoint, setup steps ── */
  if (conn) {
    const today = new Date().toLocaleDateString("en-CA");
    const todayRow = health.days.find((d) => d.date === today);
    const kcal =
      todayRow &&
      (todayRow.activeKcal !== undefined || todayRow.basalKcal !== undefined)
        ? (todayRow.activeKcal ?? 0) + (todayRow.basalKcal ?? 0)
        : undefined;
    const week = health.days.slice(-7);
    const maxSteps = Math.max(1, ...week.map((d) => d.steps ?? 0));
    const url = syncUrl(conn.token);
    const lastActivity = conn.lastSyncAt ?? health.lastImportedAt;

    return (
      <div>
        <SectionLabel
          action={
            <span className="text-[10px] text-primary">
              {lastActivity ? `Synced ${relTime(lastActivity)}` : "Connected"}
            </span>
          }
        >
          Health Connection
        </SectionLabel>

        <div className="rounded-2xl border border-border bg-card p-4">
          {/* today's numbers */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-secondary py-3">
              <p className="num text-[17px] font-bold">
                {todayRow?.steps !== undefined
                  ? formatNumber(todayRow.steps)
                  : "—"}
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
                        {
                          weekday: "narrow",
                        },
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

          {/* private sync endpoint */}
          <div className="mt-4 border-t border-border/70 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold">Your private sync URL</p>
              <button
                type="button"
                onClick={() => void copyEndpoint(url)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold transition-colors hover:border-primary/40"
              >
                {copied ? (
                  <Check className="size-3 text-primary" />
                ) : (
                  <Copy className="size-3" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <code className="mt-2 block truncate rounded-lg bg-secondary px-2.5 py-2 text-[10px] text-muted-foreground select-all">
              {url}
            </code>
            <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">
              Like a password — keep it private. Anyone with it can write data
              to your account.
            </p>

            {conn.platform === "android" ? (
              <ol className="mt-3 list-decimal list-inside space-y-1.5 text-[11px] leading-4 text-muted-foreground">
                <li>
                  Install the free{" "}
                  <a
                    href="https://github.com/mcnaveen/health-connect-webhook"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary underline underline-offset-2"
                  >
                    HC Webhook
                  </a>{" "}
                  app (Android 8+).
                </li>
                <li>
                  Add your private sync URL above as a webhook and enable the
                  Steps and Calories data types.
                </li>
                <li>
                  Grant it Health Connect permissions — everything syncs
                  automatically in the background.
                </li>
              </ol>
            ) : (
              <ol className="mt-3 list-decimal list-inside space-y-1.5 text-[11px] leading-4 text-muted-foreground">
                <li>
                  In Shortcuts, add{" "}
                  <b className="text-foreground">Get Health Samples</b> (Steps,
                  Active Energy), then{" "}
                  <b className="text-foreground">Get contents of URL</b> → POST
                  with JSON body{" "}
                  <code className="text-[10px] text-primary">
                    {`{"steps": …, "calories": …}`}
                  </code>{" "}
                  using those sample values.
                </li>
                <li>
                  Run it on a daily Automation — or use the one-time history
                  import below.
                </li>
              </ol>
            )}
          </div>

          {/* actions */}
          <div className="mt-4 flex gap-2">
            {conn.platform === "ios" && (
              <Button
                variant="secondary"
                className="h-10 flex-1 rounded-xl border-border font-semibold"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-1.5 size-3.5" />
                Import history
              </Button>
            )}
            <Button
              variant="outline"
              className="h-10 flex-1 rounded-xl border-border font-semibold text-destructive hover:bg-destructive/5"
              disabled={busy}
              onClick={() => void doDisconnect()}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Disconnect
            </Button>
          </div>

          {status && <StatusLine status={status} />}
          {fileInput}
        </div>
      </div>
    );
  }

  /* ── step 1: terms & permissions ── */
  if (stage === "consent") {
    const points = [
      {
        icon: Footprints,
        title: "What we read",
        text: "Daily steps, calories, exercise and sleep — from Fitness & Health on iPhone, or Health Connect on Android.",
      },
      {
        icon: ShieldCheck,
        title: "How it's protected",
        text: "Only daily totals are stored, never raw records. iPhone exports are parsed on your device and discarded.",
      },
      {
        icon: XCircle,
        title: "Your control",
        text: "Disconnect at any time and every stored health day is permanently deleted.",
      },
    ];
    return (
      <div>
        <SectionLabel>Health Connection</SectionLabel>
        <div className="rounded-2xl border border-border bg-card p-5">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
            <HeartPulse className="size-6 text-primary" />
          </span>
          <p className="mt-3 text-[16px] font-bold">Connect your health app</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            Grant Calistify permission to see your activity — and nothing else.
          </p>

          <ul className="mt-4 space-y-3">
            {points.map((p) => (
              <li key={p.title} className="flex gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <p.icon className="size-3.5 text-primary" />
                </span>
                <span>
                  <span className="block text-[12px] font-semibold">
                    {p.title}
                  </span>
                  <span className="block text-[11px] leading-4 text-muted-foreground">
                    {p.text}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-secondary p-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[#b6ff00]"
            />
            <span className="text-[11px] leading-4">
              I understand and agree to share my health data with Calistify
              under these terms.
            </span>
          </label>

          <Button
            className="mt-4 h-11 w-full rounded-xl font-semibold"
            disabled={!agreed}
            onClick={() => {
              try {
                localStorage.setItem(CONSENT_KEY, "1");
              } catch {
                /* private mode — still proceed */
              }
              setStage("platform");
            }}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  /* ── step 2: choose the device ── */
  return (
    <div>
      <SectionLabel>Health Connection</SectionLabel>
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-[16px] font-bold">Choose your device</p>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          We'll set up the right connection for it.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {(
            [
              {
                id: "ios",
                icon: Apple,
                title: "iPhone",
                sub: "Fitness & Health",
              },
              {
                id: "android",
                icon: Smartphone,
                title: "Android",
                sub: "Health Connect",
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPlatform(opt.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition-colors",
                platform === opt.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/40 hover:border-primary/30",
              )}
            >
              <opt.icon
                className={cn(
                  "size-7",
                  platform === opt.id
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              />
              <span className="text-[13px] font-bold">{opt.title}</span>
              <span className="text-[10px] text-muted-foreground">
                {opt.sub}
              </span>
            </button>
          ))}
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
          Accept & Connect
        </Button>
        <button
          type="button"
          onClick={() => setStage("consent")}
          className="mt-2 w-full text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to terms
        </button>

        {status && <StatusLine status={status} />}
      </div>
    </div>
  );
}
