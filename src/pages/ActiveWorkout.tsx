import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAthlete } from "@/hooks/use-athlete";
import { EXERCISES, getExercise } from "@/lib/exercises";
import { formatClock, formatRestClock, formatVolume } from "@/lib/format";
import { useSession, type SessionExercise } from "@/lib/session";
import { computeWorkoutStats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Pause,
  Play,
  Plus,
  Search,
  Timer,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { useMutation } from "convex/react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";

/**
 * The active workout screen: running timer, per-set logging with completion
 * checks, rest timer, bodyweight handling and the finish flow.
 */
export default function ActiveWorkout() {
  const navigate = useNavigate();
  const session = useSession();
  const { profile } = useAthlete();
  const finishMutation = useMutation(api.workouts.finish);
  const now = session.now;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [done, setDone] = useState<null | {
    workoutId: string;
    stats: {
      exerciseCount: number;
      setCount: number;
      repCount: number;
      volume: number;
    };
    newPRs: {
      exerciseId: string;
      exerciseName: string;
      metric: string;
      value: number;
      previous: number;
    }[];
    newAchievements: { id: string; name: string; description: string }[];
    durationSec: number;
    name: string;
    unit: "kg" | "lb";
  }>(null);

  const workout = session.workout;

  /* completion screen renders even after the session is cleared */
  if (done) {
    return (
      <FinishScreen
        data={done}
        onDone={() => navigate("/app")}
        onView={() => navigate(`/app/workouts/${done.workoutId}`)}
      />
    );
  }

  /* leaving the route keeps the session alive (persisted in localStorage) */
  if (!workout) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-semibold">No active workout</p>
        <p className="max-w-[260px] text-[13px] text-muted-foreground">
          Start a new session from the dashboard to begin logging sets.
        </p>
        <Button
          onClick={() => navigate("/app/workout/new")}
          className="rounded-xl"
        >
          Start Workout
        </Button>
      </div>
    );
  }

  const elapsedMs = (() => {
    const end = workout.paused && workout.pausedAt ? workout.pausedAt : now;
    return Math.max(0, end - workout.startedAt - workout.pausedTotalMs);
  })();

  const bodyweight = profile?.bodyweightKg ?? 0;
  const unit = profile?.weightUnit ?? "kg";
  const stats = computeWorkoutStats(
    workout.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      sets: e.sets.map((s) => ({
        weightKg: s.weightKg,
        reps: s.reps,
        durationSec: s.durationSec,
        isBodyweight: s.isBodyweight,
      })),
    })),
    bodyweight,
  );

  const handleFinish = async () => {
    setFinishing(true);
    setFinishError(null);
    const day = new Date(workout.startedAt).toLocaleDateString("en-CA");
    try {
      const result = await finishMutation({
        name: workout.name,
        day,
        startedAt: workout.startedAt,
        endedAt: Date.now(),
        durationSec: Math.round(elapsedMs / 1000),
        exercises: workout.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          name: getExercise(e.exerciseId)?.name ?? e.exerciseId,
          notes: e.notes,
          sets: e.sets.map((s) => ({
            weightKg: s.weightKg,
            reps: s.reps,
            durationSec: s.durationSec,
            rpe: s.rpe,
            isBodyweight: s.isBodyweight,
          })),
        })),
      });
      if (!result.ok || !result.workoutId || !result.stats) {
        setFinishError(result.error ?? "Could not save the workout.");
        setFinishing(false);
        return;
      }
      setDone({
        workoutId: result.workoutId,
        stats: result.stats,
        newPRs: (result.newPRs ?? []).map((p) => ({
          ...p,
          metric: String(p.metric),
        })),
        newAchievements: result.newAchievements ?? [],
        durationSec: Math.round(elapsedMs / 1000),
        name: workout.name,
        unit,
      });
      session.clearWorkout();
    } catch (err) {
      setFinishError(err instanceof Error ? err.message : "Failed to save.");
      setFinishing(false);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/app")}
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:border-primary/30"
          aria-label="Back to dashboard (workout stays active)"
        >
          <ArrowLeft className="size-4" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <input
            value={workout.name}
            onChange={(e) => session.setWorkoutName(e.target.value)}
            className="w-full max-w-[180px] truncate rounded-lg border border-transparent bg-transparent text-center text-[15px] font-bold tracking-tight outline-none transition-colors hover:border-border focus:border-primary/50"
            aria-label="Workout name"
          />
          <div className="mt-0.5 flex items-center justify-center gap-1.5">
            <span className="num text-[19px] font-semibold tabular-nums text-primary">
              {formatClock(elapsedMs / 1000)}
            </span>
            {workout.paused && (
              <span className="rounded border border-primary/30 bg-primary/10 px-1 text-[9px] font-semibold text-primary uppercase">
                Paused
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={session.pauseToggle}
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:border-primary/30"
          aria-label={workout.paused ? "Resume" : "Pause"}
        >
          {workout.paused ? (
            <Play className="size-4 text-primary" />
          ) : (
            <Pause className="size-4" />
          )}
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-border bg-card px-3 py-3">
        {[
          ["Ex", String(stats.exerciseCount)],
          ["Sets", String(stats.setCount)],
          ["Reps", String(stats.repCount)],
          ["Vol", formatVolume(stats.volume, unit)],
        ].map(([label, value]) => (
          <div key={label} className="text-center">
            <p className="text-[9px] tracking-[0.1em] text-muted-foreground uppercase">
              {label}
            </p>
            <p className="num mt-0.5 truncate text-[13px] font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Exercises */}
      {workout.exercises.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-5 py-8 text-center">
          <p className="text-sm font-semibold">No exercises yet</p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            Add your first exercise to start logging sets.
          </p>
          <Button
            onClick={() => setPickerOpen(true)}
            className="mt-4 rounded-xl"
            variant="secondary"
          >
            <Plus className="size-4" />
            Add Exercise
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {workout.exercises.map((ex) => (
            <ExerciseCard key={ex.instanceId} ex={ex} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 text-[13px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <Plus className="size-4" />
        Add Exercise
      </button>

      {/* Finish */}
      <div className="space-y-2 pt-1">
        <Button
          onClick={handleFinish}
          disabled={finishing || stats.setCount === 0}
          className="h-12 w-full rounded-xl text-[15px] font-semibold shadow-[0_10px_30px_-12px_rgba(182,255,0,0.55)]"
        >
          {finishing ? "Saving…" : "Finish Workout"}
        </Button>
        {stats.setCount === 0 && (
          <p className="text-center text-[11px] text-muted-foreground">
            Complete at least one set to finish.
          </p>
        )}
        {finishError && (
          <p className="text-center text-[12px] text-destructive">
            {finishError}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm("Discard this workout? Logged sets will be lost.")
            ) {
              session.discardWorkout();
              navigate("/app");
            }
          }}
          className="w-full py-2 text-[12px] text-muted-foreground hover:text-destructive"
        >
          Discard workout
        </button>
      </div>

      {pickerOpen && (
        <ExercisePicker
          query={query}
          setQuery={setQuery}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <RestTimerBar />
    </div>
  );
}

/* ── Exercise card ─────────────────────────────────────────────────────── */

function ExerciseCard({ ex }: { ex: SessionExercise }) {
  const session = useSession();
  const def = getExercise(ex.exerciseId);
  const [notesOpen, setNotesOpen] = useState(!!ex.notes);
  const isTimed = def?.timed ?? false;

  if (!def) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border/70 bg-[#0c0c0c] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight">
            {def.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              {def.difficulty}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {def.primary.join(", ")}
            </span>
          </div>
          {def.secondary.length > 0 && (
            <p className="mt-0.5 text-[10px] text-muted-foreground/70">
              Secondary: {def.secondary.join(", ")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => session.removeExercise(ex.instanceId)}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive"
          aria-label={`Remove ${def.name}`}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* header row */}
      <div className="grid grid-cols-[22px_1fr_1fr_40px_44px] gap-1.5 border-b border-border/70 px-4 py-2 text-[9px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        <span>Set</span>
        <span>Weight</span>
        <span>{isTimed ? "Secs" : "Reps"}</span>
        <span className="text-center">✓</span>
        <span className="text-center">RPE</span>
      </div>

      <div className="divide-y divide-border/60">
        {ex.sets.map((set, i) => (
          <div
            key={set.id}
            className={cn(
              "grid grid-cols-[22px_1fr_1fr_40px_44px] items-center gap-1.5 px-4 py-2.5 transition-colors",
              set.completed && "bg-primary/[0.06]",
            )}
          >
            <span
              className={cn(
                "num text-[12px] font-semibold",
                set.completed ? "text-primary" : "text-muted-foreground",
              )}
            >
              {i + 1}
            </span>

            <SetInput
              value={set.weightKg}
              onChange={(v) =>
                session.updateSet(ex.instanceId, set.id, { weightKg: v })
              }
              suffix={set.isBodyweight ? "+kg" : "kg"}
              resetKey={`${set.id}-${set.isBodyweight ? "bw" : "w"}`}
            />

            <SetInput
              value={isTimed ? (set.durationSec ?? 0) : set.reps}
              onChange={(v) =>
                session.updateSet(
                  ex.instanceId,
                  set.id,
                  isTimed ? { durationSec: v } : { reps: v },
                )
              }
              suffix={isTimed ? "s" : "reps"}
            />

            <button
              type="button"
              onClick={() => session.completeSet(ex.instanceId, set.id)}
              className={cn(
                "mx-auto flex size-7 items-center justify-center rounded-lg border transition-all active:scale-90",
                set.completed
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_0_12px_rgba(182,255,0,0.4)]"
                  : "border-border bg-secondary text-muted-foreground hover:border-primary/40",
              )}
              aria-label={
                set.completed ? "Mark set incomplete" : "Mark set complete"
              }
            >
              <Check className="size-3.5" strokeWidth={3} />
            </button>

            <input
              inputMode="decimal"
              key={`${set.id}-rpe`}
              defaultValue={set.rpe ? String(set.rpe) : ""}
              placeholder="—"
              aria-label={`RPE for set ${i + 1}`}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, "");
                const parsed = parseFloat(raw);
                session.updateSet(
                  ex.instanceId,
                  set.id,
                  Number.isFinite(parsed)
                    ? { rpe: parsed }
                    : { rpe: undefined },
                );
              }}
              className="num h-8 w-full rounded-lg border border-border bg-[#0c0c0c] px-1 text-center text-[11px] font-medium outline-none transition-colors focus:border-primary/50"
            />
          </div>
        ))}
      </div>

      {/* bodyweight / additional weight toggle */}
      {def.weighted && (
        <div className="flex items-center justify-between border-t border-border/60 px-4 py-2.5">
          <span className="text-[11px] text-muted-foreground">
            {ex.sets[0]?.isBodyweight
              ? "Bodyweight + additional load"
              : "Weighted (no bodyweight added)"}
          </span>
          <button
            type="button"
            onClick={() => {
              const next = !ex.sets[0]?.isBodyweight;
              ex.sets.forEach((s) =>
                session.updateSet(ex.instanceId, s.id, {
                  isBodyweight: next,
                }),
              );
            }}
            className="rounded-lg border border-border bg-secondary px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Toggle BW
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border/60 px-4 py-2">
        <button
          type="button"
          onClick={() => session.addSet(ex.instanceId)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
        >
          <Plus className="size-3.5" />
          Add Set
        </button>
        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          Notes
          <ChevronDown
            className={cn(
              "size-3 transition-transform",
              notesOpen && "rotate-180",
            )}
          />
        </button>
      </div>

      {notesOpen && (
        <div className="border-t border-border/60 px-4 py-3">
          <Input
            value={ex.notes ?? ""}
            onChange={(e) =>
              session.setExerciseNotes(ex.instanceId, e.target.value)
            }
            placeholder="Notes for this exercise…"
            className="h-9 border-border bg-[#0c0c0c] text-[13px] focus-visible:ring-primary/30"
          />
        </div>
      )}
    </div>
  );
}

/* ── Numeric set input ─────────────────────────────────────────────────── */

function SetInput({
  value,
  onChange,
  suffix,
  disabled,
  resetKey,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  disabled?: boolean;
  /** changing this remounts the field (e.g. when bodyweight toggles) */
  resetKey?: string;
}) {
  return (
    <div className="relative">
      <input
        key={resetKey}
        inputMode="decimal"
        defaultValue={value ? String(value) : ""}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, "");
          const parsed = parseFloat(raw);
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
        className={cn(
          "num h-8 w-full rounded-lg border border-border bg-[#0c0c0c] px-2 pr-8 text-[13px] font-medium outline-none transition-colors focus:border-primary/50",
          disabled && "opacity-50",
        )}
        placeholder={disabled ? suffix : ""}
      />
      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[9px] font-medium text-muted-foreground">
        {disabled ? "" : suffix}
      </span>
    </div>
  );
}

/* ── Rest timer bar ────────────────────────────────────────────────────── */

export function RestTimerBar() {
  const { restEndsAt, adjustRest, skipRest, restDurationSec, now } =
    useSession();

  if (restEndsAt === null) return null;
  const remaining = Math.max(0, Math.ceil((restEndsAt - now) / 1000));
  const progress = Math.min(1, remaining / Math.max(1, restDurationSec));

  return (
    <div className="rise-in fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[440px] border-t border-primary/30 bg-[#0a0a0a]/97 backdrop-blur-xl">
      <div className="h-0.5 w-full bg-secondary">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex items-center justify-between px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <Timer className="size-4 text-primary" />
          <div>
            <p className="text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
              Rest
            </p>
            <p className="num text-[17px] leading-none font-bold text-primary">
              {formatRestClock(remaining)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => adjustRest(-30)}
            className="rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            -30s
          </button>
          <button
            type="button"
            onClick={() => adjustRest(30)}
            className="rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            +30s
          </button>
          <button
            type="button"
            onClick={skipRest}
            className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Exercise picker sheet ─────────────────────────────────────────────── */

function ExercisePicker({
  query,
  setQuery,
  onClose,
}: {
  query: string;
  setQuery: (v: string) => void;
  onClose: () => void;
}) {
  const session = useSession();
  const q = query.trim().toLowerCase();
  const list = q
    ? EXERCISES.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.equipment.toLowerCase().includes(q) ||
          e.primary.some((m) => m.includes(q)),
      )
    : EXERCISES;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="rise-in relative flex max-h-[82dvh] w-full max-w-[440px] flex-col rounded-t-3xl border border-border bg-[#0a0a0a]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="text-[15px] font-semibold">Add Exercise</p>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, muscle, equipment..."
              className="h-10 border-border bg-[#0c0c0c] pl-9 focus-visible:ring-primary/30"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-[max(2rem,env(safe-area-inset-bottom))]">
          {list.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              No exercises found. Try a different search.
            </p>
          ) : (
            <div className="space-y-2">
              {list.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    session.addExercise(ex.id);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      {ex.name}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {ex.difficulty} · {ex.primary.join(", ")}
                    </p>
                  </div>
                  <Plus className="size-4 shrink-0 text-primary" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Completion screen ─────────────────────────────────────────────────── */

function FinishScreen({
  data,
  onDone,
  onView,
}: {
  data: {
    workoutId: string;
    stats: {
      exerciseCount: number;
      setCount: number;
      repCount: number;
      volume: number;
    };
    newPRs: {
      exerciseId: string;
      exerciseName: string;
      metric: string;
      value: number;
      previous: number;
    }[];
    newAchievements: { id: string; name: string; description: string }[];
    durationSec: number;
    name: string;
    unit: "kg" | "lb";
  };
  onDone: () => void;
  onView: () => void;
}) {
  const { workouts } = useAthlete();
  const prev = useMemo(
    () =>
      workouts.find((w) => w.name === data.name && w._id !== data.workoutId),
    [workouts, data.name, data.workoutId],
  );

  const comparison = useMemo(() => {
    if (!prev) return null;
    const current = {
      volume: data.stats.volume,
      reps: data.stats.repCount,
      duration: data.durationSec,
    };
    const pct = (cur: number, before: number) =>
      before === 0 ? null : Math.round(((cur - before) / before) * 100);
    return {
      volume: pct(current.volume, prev.volume),
      reps: pct(current.reps, prev.reps),
      duration: pct(current.duration, prev.durationSec),
      prevName: prev.name,
    };
  }, [prev, data]);

  return (
    <div className="fade-in flex min-h-[75vh] flex-col items-center justify-center text-center">
      <div className="flex size-20 items-center justify-center rounded-full border border-primary/40 bg-primary/10 shadow-[0_0_60px_-10px_rgba(182,255,0,0.55)]">
        <Check className="size-10 text-primary" strokeWidth={3} />
      </div>

      <h1 className="mt-6 text-[26px] font-bold tracking-tight">
        Workout Complete
      </h1>
      <p className="num mt-2 text-[40px] leading-none font-bold tracking-tight text-primary">
        {formatClock(data.durationSec)}
      </p>
      <p className="mt-2 text-[13px] tracking-[0.14em] text-muted-foreground uppercase">
        {data.name}
      </p>

      <div className="mt-7 grid w-full grid-cols-4 gap-2">
        {[
          ["Exercises", String(data.stats.exerciseCount)],
          ["Sets", String(data.stats.setCount)],
          ["Reps", String(data.stats.repCount)],
          ["Volume", formatVolume(data.stats.volume, data.unit)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card px-1.5 py-3"
          >
            <p className="num truncate text-[15px] font-bold">{value}</p>
            <p className="mt-0.5 text-[9px] tracking-[0.06em] text-muted-foreground uppercase">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* PRs */}
      {data.newPRs.length > 0 && (
        <div className="mt-6 w-full rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="size-4 text-primary" />
            <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
              New Records
            </p>
          </div>
          <div className="mt-3 space-y-2">
            {data.newPRs.map((pr) => (
              <div
                key={`${pr.exerciseId}-${pr.metric}`}
                className="flex items-center justify-between text-[13px]"
              >
                <span className="text-muted-foreground">
                  {pr.exerciseName} · {pr.metric}
                </span>
                <span className="num font-semibold text-primary">
                  {formatPRValue(pr.metric, pr.value, data.unit)}
                  <span className="ml-1.5 text-[10px] text-muted-foreground line-through">
                    {formatPRValue(pr.metric, pr.previous, data.unit)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {data.newAchievements.length > 0 && (
        <div className="mt-4 w-full rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Achievements Unlocked
          </p>
          <div className="mt-3 space-y-2">
            {data.newAchievements.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5 text-left">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Trophy className="size-3 text-primary" />
                </span>
                <div>
                  <p className="text-[13px] font-medium">{a.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {a.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison */}
      <div className="mt-4 w-full rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {comparison ? `Vs previous ${data.name}` : "First recorded workout"}
        </p>
        {comparison ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(
              [
                ["Volume", comparison.volume],
                ["Reps", comparison.reps],
                ["Duration", comparison.duration],
              ] as const
            ).map(([label, pct]) => (
              <div key={label} className="text-center">
                <p
                  className={cn(
                    "num text-[17px] font-bold",
                    pct === null
                      ? "text-muted-foreground"
                      : pct >= 0
                        ? "text-primary"
                        : "text-destructive",
                  )}
                >
                  {pct === null
                    ? "—"
                    : `${pct >= 0 ? "↑" : "↓"} ${Math.abs(pct)}%`}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-muted-foreground">
            Nothing to compare against yet — your history starts now.
          </p>
        )}
      </div>

      <div className="mt-7 flex w-full gap-3">
        <Button
          variant="secondary"
          className="h-12 flex-1 rounded-xl border border-border font-semibold"
          onClick={onView}
        >
          View Workout
        </Button>
        <Button
          className="h-12 flex-1 rounded-xl font-semibold shadow-[0_10px_30px_-12px_rgba(182,255,0,0.55)]"
          onClick={onDone}
        >
          Done
        </Button>
      </div>
    </div>
  );
}

function formatPRValue(
  metric: string,
  value: number,
  unit: "kg" | "lb" = "kg",
): string {
  if (metric === "weight") {
    return unit === "lb"
      ? `+${Math.round(value * 2.20462)} lb`
      : `+${Math.round(value)} kg`;
  }
  if (metric === "duration") return `${Math.round(value)}s`;
  return `${Math.round(value)} reps`;
}
