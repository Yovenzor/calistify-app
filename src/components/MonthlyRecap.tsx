import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { formatDuration, formatNumber, formatVolume } from "@/lib/format";
import { computeMonthlyRecap, type MonthlyRecapData } from "@/lib/recap";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Download, Flame, Share2, Trophy, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const SEEN_STORAGE_KEY = "calistify:monthly-recap:last-seen";

function muscleLabel(id: string): string {
  return id.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function prValue(metric: string, value: number, unit: "kg" | "lb"): string {
  if (metric === "weight") {
    return unit === "lb"
      ? `+${Math.round(value * 2.20462)} lb`
      : `+${Math.round(value)} kg`;
  }
  if (metric === "duration") return `${Math.round(value)}s`;
  return `${Math.round(value)} reps`;
}

/* ── Count-up number ──────────────────────────────────────────────────── */

/** Animates 0 → value with an ease-out; children render the formatted text. */
function CountUp({
  value,
  duration = 1300,
  children,
}: {
  value: number;
  duration?: number;
  children: (n: number) => React.ReactNode;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{children(n)}</>;
}

/* ── Steps ────────────────────────────────────────────────────────────── */

type StepKind =
  | "workouts"
  | "time"
  | "volume"
  | "muscles"
  | "prs"
  | "streaks"
  | "share";

const STEP_ORDER: StepKind[] = [
  "workouts",
  "time",
  "volume",
  "muscles",
  "prs",
  "streaks",
  "share",
];

/** How long a step animates before its Next button fades in. */
const STEP_DELAY: Record<StepKind, number> = {
  workouts: 1350,
  time: 1500,
  volume: 1500,
  muscles: 1900,
  prs: 1600,
  streaks: 1500,
  share: 0,
};

/* ── Share image (1080 × 1920 canvas) ─────────────────────────────────── */

const IMG_W = 1080;
const IMG_H = 1920;
const LIME = "#B6FF00";
const WHITE = "#F5F5F5";
const MUTED = "#8A8A8A";
const TRACK = "#1E1E1E";

async function renderRecapImage(
  data: MonthlyRecapData,
  unit: "kg" | "lb",
): Promise<Blob> {
  // Make sure Inter is loaded so canvas text matches the app.
  try {
    await document.fonts.ready;
  } catch {
    /* fall back to system fonts */
  }
  const font = (weight: number, size: number) =>
    `${weight} ${size}px Inter, system-ui, sans-serif`;
  const canvas = document.createElement("canvas");
  canvas.width = IMG_W;
  canvas.height = IMG_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, IMG_W, IMG_H);

  const left = 80;
  const right = IMG_W - 80;

  // Header
  ctx.textAlign = "left";
  ctx.fillStyle = LIME;
  ctx.font = font(700, 30);
  ctx.fillText("CALISTIFY  ·  MONTHLY RECAP", left, 150);
  ctx.fillStyle = WHITE;
  ctx.font = font(700, 66);
  ctx.fillText(data.monthLabel, left, 240);
  ctx.fillStyle = "#2A2A2A";
  ctx.fillRect(left, 292, right - left, 2);

  // Headline stats
  const stats: Array<{ label: string; value: string }> = [
    { label: "WORKOUTS COMPLETED", value: formatNumber(data.workouts) },
    { label: "TIME TRAINED", value: formatDuration(data.durationSec) },
    { label: "TOTAL VOLUME LIFTED", value: formatVolume(data.volumeKg, unit) },
  ];
  stats.forEach((s, i) => {
    const labelY = 370 + i * 180;
    ctx.fillStyle = MUTED;
    ctx.font = font(600, 28);
    ctx.fillText(s.label, left, labelY);
    ctx.fillStyle = LIME;
    ctx.font = font(800, 84);
    ctx.fillText(s.value, left, labelY + 90);
  });

  // Muscle work (descending)
  ctx.fillStyle = WHITE;
  ctx.font = font(700, 30);
  ctx.fillText("MUSCLE WORK", left, 930);
  const maxPct = Math.max(1, ...data.muscles.map((m) => m.pct));
  data.muscles.forEach((m, i) => {
    const y = 995 + i * 78;
    ctx.fillStyle = WHITE;
    ctx.font = font(600, 30);
    ctx.fillText(muscleLabel(m.id), left, y);
    const barX = 420;
    const barW = right - 170 - barX;
    ctx.fillStyle = TRACK;
    ctx.fillRect(barX, y - 22, barW, 14);
    ctx.fillStyle = LIME;
    ctx.fillRect(barX, y - 22, Math.max(8, (barW * m.pct) / maxPct), 14);
    ctx.fillStyle = LIME;
    ctx.font = font(700, 30);
    ctx.textAlign = "right";
    ctx.fillText(`${m.pct}%`, right, y);
    ctx.textAlign = "left";
  });

  // Personal records
  const prTitleY = 995 + data.muscles.length * 78 + 55;
  ctx.fillStyle = WHITE;
  ctx.font = font(700, 30);
  ctx.fillText("PERSONAL RECORDS", left, prTitleY);
  const shownPrs = data.prs.slice(0, 3);
  if (shownPrs.length === 0) {
    ctx.fillStyle = MUTED;
    ctx.font = font(500, 30);
    ctx.fillText(
      "No new records this month — every rep counts.",
      left,
      prTitleY + 66,
    );
  } else {
    shownPrs.forEach((pr, i) => {
      const y = prTitleY + 66 + i * 66;
      ctx.fillStyle = WHITE;
      ctx.font = font(600, 31);
      ctx.fillText(pr.exerciseName, left, y);
      ctx.fillStyle = LIME;
      ctx.font = font(700, 31);
      ctx.textAlign = "right";
      ctx.fillText(prValue(pr.metric, pr.value, unit), right, y);
      ctx.textAlign = "left";
    });
    if (data.prs.length > shownPrs.length) {
      ctx.fillStyle = MUTED;
      ctx.font = font(500, 26);
      ctx.fillText(
        `+${data.prs.length - shownPrs.length} more this month`,
        left,
        prTitleY + 66 + shownPrs.length * 66,
      );
    }
  }

  // Streak
  const streakY = IMG_H - 300;
  ctx.fillStyle = MUTED;
  ctx.font = font(600, 28);
  ctx.fillText("BEST RUN OF THE MONTH", left, streakY);
  ctx.fillStyle = LIME;
  ctx.font = font(800, 72);
  ctx.fillText(`${data.dayStreak}-DAY STREAK`, left, streakY + 86);
  ctx.fillStyle = WHITE;
  ctx.font = font(500, 30);
  ctx.fillText(
    `${data.weekStreak} ${data.weekStreak === 1 ? "week" : "weeks"} with training`,
    left,
    streakY + 140,
  );

  // Footer
  ctx.fillStyle = "#2A2A2A";
  ctx.fillRect(left, IMG_H - 96, right - left, 2);
  ctx.fillStyle = LIME;
  ctx.font = font(700, 30);
  ctx.textAlign = "center";
  ctx.fillText("Train Smarter. Build Stronger.", IMG_W / 2, IMG_H - 44);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not render recap image"));
    }, "image/png");
  });
}

/* ── Full-screen stepped overlay ──────────────────────────────────────── */

function RecapOverlay({
  data,
  unit,
  onClose,
}: {
  data: MonthlyRecapData;
  unit: "kg" | "lb";
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  /** Which step has finished animating — derived, never reset synchronously. */
  const [readyStep, setReadyStep] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const kind = STEP_ORDER[step];
  const isLastContent = kind === "streaks";
  const shareStep = kind === "share";
  const showNext = !shareStep && readyStep === step;

  // The Next button only appears once the step has finished animating.
  useEffect(() => {
    if (shareStep) return;
    const timer = setTimeout(
      () => setReadyStep(step),
      STEP_DELAY[STEP_ORDER[step]],
    );
    return () => clearTimeout(timer);
  }, [step, kind, shareStep]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shareImage = async (mode: "share" | "save") => {
    setSharing(true);
    setShareError(null);
    try {
      const blob = await renderRecapImage(data, unit);
      const file = new File([blob], `calistify-recap-${data.monthKey}.png`, {
        type: "image/png",
      });
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (
        mode === "share" &&
        typeof nav.share === "function" &&
        nav.canShare?.({ files: [file] })
      ) {
        try {
          await nav.share({
            files: [file],
            title: `My ${data.monthLabel} recap`,
            text: `I trained ${data.workouts} times in ${data.monthLabel} 💪`,
          });
        } catch (err) {
          // User closing the share sheet is not an error.
          if (!(err instanceof DOMException && err.name === "AbortError")) {
            throw err;
          }
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch (error) {
      console.error("Sharing recap failed:", error);
      setShareError("Couldn't prepare the image — please try again.");
    } finally {
      setSharing(false);
    }
  };

  const volumeDisplay = unit === "lb" ? data.volumeKg * 2.20462 : data.volumeKg;

  const eyebrow = (text: string) => (
    <p className="text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">
      {text}
    </p>
  );

  const giant = (content: React.ReactNode) => (
    <p className="num mt-5 text-[84px] leading-none font-black tracking-tight text-primary">
      {content}
    </p>
  );

  const caption = (text: string) => (
    <p className="mt-5 text-[15px] leading-6 text-muted-foreground">{text}</p>
  );

  const content = (() => {
    switch (kind) {
      case "workouts":
        return (
          <>
            {eyebrow("Total workouts")}
            {giant(
              <CountUp value={data.workouts}>{(n) => formatNumber(n)}</CountUp>,
            )}
            {caption(`Sessions completed in ${data.monthLabel}.`)}
          </>
        );
      case "time":
        return (
          <>
            {eyebrow("Time trained")}
            {giant(
              <CountUp value={data.durationSec}>
                {(n) => formatDuration(Math.round(n))}
              </CountUp>,
            )}
            {caption("Total time under the bar this month.")}
          </>
        );
      case "volume":
        return (
          <>
            {eyebrow("Total volume")}
            {giant(
              <CountUp value={Math.round(volumeDisplay)}>
                {(n) => formatNumber(n)}
              </CountUp>,
            )}
            <p className="num mt-3 text-[26px] font-bold text-foreground">
              {unit}
            </p>
            {caption("Moved, lifted and pressed in total.")}
          </>
        );
      case "muscles":
        return (
          <>
            {eyebrow("Muscle work")}
            <h2 className="mt-4 text-[30px] leading-tight font-bold tracking-tight">
              Most worked to <span className="text-primary">least</span>
            </h2>
            <div className="mt-7 space-y-4 text-left">
              {data.muscles.length === 0 && (
                <p className="text-[14px] text-muted-foreground">
                  No muscle data recorded this month.
                </p>
              )}
              {data.muscles.map((m, i) => {
                const max = Math.max(1, ...data.muscles.map((x) => x.pct));
                return (
                  <div key={m.id}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[14px] font-medium">
                        {muscleLabel(m.id)}
                      </span>
                      <span className="num text-[14px] font-bold text-primary">
                        {m.pct}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.round((m.pct / max) * 100)}%`,
                        }}
                        transition={{
                          duration: 0.7,
                          delay: 0.35 + i * 0.2,
                          ease: "easeOut",
                        }}
                        className="h-full rounded-full bg-primary"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-6 text-[12px] text-muted-foreground/70">
              Share of all your training volume this month.
            </p>
          </>
        );
      case "prs":
        return (
          <>
            {eyebrow("Personal records")}
            <h2 className="mt-4 text-[30px] leading-tight font-bold tracking-tight">
              {data.prs.length > 0
                ? `${data.prs.length} new ${data.prs.length === 1 ? "record" : "records"} 🏆`
                : "Still chasing them"}
            </h2>
            {data.prs.length > 0 ? (
              <div className="mt-7 space-y-2.5 text-left">
                {data.prs.slice(0, 5).map((pr, i) => (
                  <motion.div
                    key={pr.key}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.14 }}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Trophy className="size-4 shrink-0 text-primary" />
                      <span className="truncate text-[13px] font-medium">
                        {pr.exerciseName}
                      </span>
                    </span>
                    <span className="num shrink-0 text-[14px] font-bold text-primary">
                      {prValue(pr.metric, pr.value, unit)}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              caption(
                "No new PRs this month — every rep still counts. Go break one next month.",
              )
            )}
          </>
        );
      case "streaks":
        return (
          <>
            {eyebrow("Your streak")}
            {giant(
              <span className="flex items-center justify-center gap-4">
                <Flame className="size-16 shrink-0" strokeWidth={2.2} />
                <CountUp value={data.dayStreak}>
                  {(n) => formatNumber(n)}
                </CountUp>
              </span>,
            )}
            <p className="mt-3 text-[22px] font-bold">day best streak</p>
            {caption(
              `${data.weekStreak} ${data.weekStreak === 1 ? "week" : "weeks"} with at least one session in ${data.monthLabel}.`,
            )}
          </>
        );
      case "share":
        return (
          <>
            {eyebrow("That's a wrap")}
            <h2 className="mt-4 text-[32px] leading-tight font-bold tracking-tight">
              Your {data.monthLabel}
              <br />
              <span className="text-primary">in review</span>
            </h2>
            <div className="mx-auto mt-7 w-full max-w-[300px] space-y-2.5 text-left">
              {[
                { label: "Workouts", value: String(data.workouts) },
                {
                  label: "Time trained",
                  value: formatDuration(data.durationSec),
                },
                {
                  label: "Volume",
                  value: formatVolume(data.volumeKg, unit),
                },
                {
                  label: "Best streak",
                  value: `${data.dayStreak} days`,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                >
                  <span className="text-[13px] text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="num text-[14px] font-bold text-primary">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-col gap-2.5">
              <Button
                className="h-12 w-full rounded-xl text-[15px] font-semibold shadow-[0_8px_24px_-8px_rgba(182,255,0,0.45)]"
                disabled={sharing}
                onClick={() => void shareImage("share")}
              >
                <Share2 className="mr-2 size-4" />
                Share image
              </Button>
              <Button
                variant="secondary"
                className="h-11 w-full rounded-xl border border-border"
                disabled={sharing}
                onClick={() => void shareImage("save")}
              >
                <Download className="mr-2 size-4" />
                Save to device
              </Button>
            </div>
            <p className="mt-4 text-[11px] leading-4 text-muted-foreground/70">
              Opens your phone&apos;s share sheet — post to Instagram, send on
              WhatsApp or save to your gallery.
            </p>
            {shareError && (
              <p className="mt-3 text-[12px] text-destructive">{shareError}</p>
            )}
          </>
        );
    }
  })();

  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#050505]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-6 pt-6 pb-8">
        {/* header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-primary uppercase">
              Monthly recap
            </p>
            <p className="mt-0.5 text-[13px] font-medium text-muted-foreground">
              {data.monthLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:border-primary/30"
            aria-label="Close recap"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* progress dots */}
        <div className="mt-5 flex justify-center gap-1.5">
          {STEP_ORDER.map((s, i) => (
            <span
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step
                  ? "w-6 bg-primary"
                  : i < step
                    ? "w-1.5 bg-primary/50"
                    : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>

        {/* step content */}
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={kind}
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full flex-col items-center"
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* footer — Next appears only after the step finishes */}
        <div className="flex min-h-[52px] items-center justify-center">
          <AnimatePresence mode="wait">
            {showNext && (
              <motion.div
                key={`next-${step}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <Button
                  className="h-12 min-w-[220px] rounded-xl px-8 text-[15px] font-semibold shadow-[0_8px_24px_-8px_rgba(182,255,0,0.45)]"
                  onClick={() => setStep((s) => s + 1)}
                >
                  {isLastContent ? "See your summary" : "Next"}
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </motion.div>
            )}
            {shareStep && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <Button
                  variant="ghost"
                  className="h-11 rounded-xl text-[14px] font-semibold text-muted-foreground"
                  onClick={onClose}
                  disabled={sharing}
                >
                  Back to home
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Home card + visibility logic ─────────────────────────────────────── */

/**
 * One recap per month, offered from the 1st of the month (reviewing the
 * month before) until it has been opened once. Renders the launch card on
 * top of the home section and the full-screen stepper.
 */
export function MonthlyRecap({ unit }: { unit: "kg" | "lb" }) {
  const workouts = useQuery(api.workouts.list);
  const records = useQuery(api.progress.records);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SEEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const data = useMemo(() => {
    if (!workouts || !records) return null;
    return computeMonthlyRecap(workouts, records);
  }, [workouts, records]);

  const close = () => {
    setOpen(false);
    if (data) {
      setLastSeen(data.monthKey);
      try {
        localStorage.setItem(SEEN_STORAGE_KEY, data.monthKey);
      } catch {
        /* storage unavailable — card may reappear next visit */
      }
    }
  };

  if (!data || lastSeen === data.monthKey) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/12 via-primary/[0.04] to-transparent px-5 py-4 text-left transition-all hover:border-primary/60 active:scale-[0.99]"
      >
        <span className="absolute top-4 right-4 flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
        </span>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-primary uppercase">
          Monthly recap
        </p>
        <p className="mt-1.5 text-[19px] font-bold tracking-tight">
          Your {data.monthLabel} in review
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Workouts, volume, muscle work, PRs and streaks — one tap away.
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
          Watch recap
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>

      {open && <RecapOverlay data={data} unit={unit} onClose={close} />}
    </>
  );
}
