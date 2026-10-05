import { api } from "@/convex/_generated/api";
import { DifficultyBadge, EmptyState, SectionLabel } from "@/components/AppUI";
import { Button } from "@/components/ui/button";
import { EXERCISE_MEDIA, getExercise } from "@/lib/exercises";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscles";
import { useAthlete } from "@/hooks/use-athlete";
import { formatFullDate, formatVolume } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowLeft, BarChart3, Dumbbell, History, Trophy } from "lucide-react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";

type Tab = "history" | "records" | "statistics";

/**
 * Exercise detail. Progression data comes from real logged sessions —
 * a never-performed exercise shows an intentional empty state.
 */
export default function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("history");
  const { profile } = useAthlete();
  const unit = profile?.weightUnit ?? "kg";
  const def = id ? getExercise(id) : undefined;
  const data = useQuery(
    api.workouts.exerciseHistory,
    id ? { exerciseId: id } : "skip",
  );

  if (!def) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Exercise not found"
        description="This exercise is not in the database."
        action={
          <Button
            size="sm"
            variant="secondary"
            className="rounded-lg border border-border"
            onClick={() => navigate("/app/exercises")}
          >
            Back to exercises
          </Button>
        }
      />
    );
  }

  const stats = data?.stats ?? null;
  const media = EXERCISE_MEDIA[def.id];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:border-primary/30"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[20px] font-bold tracking-tight">
            {def.name}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <DifficultyBadge level={def.difficulty} />
            <span className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {def.category}
            </span>
          </div>
        </div>
      </div>

      {/* Animation */}
      {media && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <img
            src={media}
            alt={`Animation of ${def.name}`}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full bg-secondary object-contain"
          />
          {media.endsWith(".gif") && (
            <p className="border-t border-border/60 px-4 py-2 text-center text-[10px] leading-4 text-muted-foreground/70">
              Animation ©{" "}
              <a
                href="https://www.gymvisual.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline transition-colors hover:text-muted-foreground"
              >
                Gym visual
              </a>
            </p>
          )}
        </div>
      )}

      {/* Muscles */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
            Primary Muscles
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {def.primary.map((m) => (
              <span
                key={m}
                className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
              >
                {MUSCLE_LABELS[m as MuscleGroup] ?? m}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
            Secondary Muscles
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {def.secondary.length > 0 ? (
              def.secondary.map((m) => (
                <span
                  key={m}
                  className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {MUSCLE_LABELS[m as MuscleGroup] ?? m}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-muted-foreground">None</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
        <span className="text-[12px] text-muted-foreground">Equipment</span>
        <span className="text-[13px] font-medium">{def.equipment}</span>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-border bg-secondary p-1">
        {(
          [
            ["history", "History", History],
            ["records", "Records", Trophy],
            ["statistics", "Statistics", BarChart3],
          ] as const
        ).map(([id2, label, Icon]) => (
          <button
            key={id2}
            type="button"
            onClick={() => setTab(id2)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition-all",
              tab === id2
                ? "bg-primary text-primary-foreground shadow-[0_4px_14px_-6px_rgba(182,255,0,0.55)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "history" &&
        (data === undefined ? (
          <div className="flex justify-center py-8">
            <div className="size-5 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : (data?.sessions.length ?? 0) === 0 ? (
          <EmptyState
            icon={History}
            title="No data yet"
            description="Log this exercise in a workout to see your progression."
          />
        ) : (
          <div className="space-y-3">
            {data!.sessions.map((s, i) => (
              <button
                key={`${s.workoutId}-${i}`}
                type="button"
                onClick={() => navigate(`/app/workouts/${s.workoutId}`)}
                className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold">
                    {formatFullDate(s.date)}
                  </span>
                  <span className="num text-[13px] font-bold text-primary">
                    {formatVolume(s.volume, "kg")}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {s.sets
                    .filter((set) => set.completed)
                    .map((set, j) => (
                      <div
                        key={j}
                        className="flex justify-between text-[12px] text-muted-foreground"
                      >
                        <span className="num">Set {set.order}</span>
                        <span className="num">
                          {set.isBodyweight && set.weightKg === 0
                            ? "Bodyweight"
                            : unit === "lb"
                              ? `${set.isBodyweight ? "BW + " : ""}${Math.round(set.weightKg * 2.20462)} lb`
                              : `${set.isBodyweight ? "BW + " : ""}${Math.round(set.weightKg)} kg`}{" "}
                          ×{" "}
                          {set.durationSec
                            ? `${Math.round(set.durationSec)}s`
                            : set.reps}
                        </span>
                      </div>
                    ))}
                </div>
              </button>
            ))}
          </div>
        ))}

      {tab === "records" &&
        (data === undefined ? null : (data?.records.length ?? 0) === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No records yet"
            description="Complete a workout with this exercise to establish your first personal best."
          />
        ) : (
          <div className="space-y-3">
            {data!.records.map((r) => (
              <div
                key={r._id}
                className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/[0.06] px-4 py-4"
              >
                <div>
                  <p className="text-[13px] font-medium">
                    {r.metric === "weight"
                      ? "Max Added Weight"
                      : r.metric === "duration"
                        ? "Best Hold"
                        : "Most Reps"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Set on {formatFullDate(r.date)}
                  </p>
                </div>
                <p className="num text-[22px] font-bold text-primary">
                  {r.metric === "weight"
                    ? unit === "lb"
                      ? `+${Math.round(r.value * 2.20462)} lb`
                      : `+${Math.round(r.value)} kg`
                    : r.metric === "duration"
                      ? `${Math.round(r.value)}s`
                      : `${Math.round(r.value)} reps`}
                </p>
              </div>
            ))}
          </div>
        ))}

      {tab === "statistics" &&
        (stats === null && data !== undefined ? (
          <EmptyState
            icon={BarChart3}
            title="No data yet"
            description="Log this exercise in a workout to see your progression."
          />
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Sessions" value={String(stats.sessions)} />
            <StatTile
              label="Last Performed"
              value={formatFullDate(stats.lastPerformed)}
            />
            <StatTile
              label="Total Volume"
              value={formatVolume(stats.totalVolume, unit)}
            />
            <StatTile label="Total Reps" value={String(stats.totalReps)} />
            <StatTile label="Total Sets" value={String(stats.totalSets)} />
            <StatTile
              label="Best Set"
              value={
                stats.bestWeight > 0
                  ? `${stats.bestReps} @ ${
                      unit === "lb"
                        ? `+${Math.round(stats.bestWeight * 2.20462)} lb`
                        : `+${Math.round(stats.bestWeight)} kg`
                    }`
                  : `${stats.bestReps} reps`
              }
            />
          </div>
        ) : null)}

      <SectionLabel className="mt-2">Quick Start</SectionLabel>
      <Button
        className="h-11 w-full rounded-xl font-semibold"
        onClick={() => navigate("/app/workout/new")}
      >
        <Dumbbell className="size-4" />
        Add to a workout
      </Button>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[9px] tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="num mt-1.5 truncate text-[16px] font-bold">{value}</p>
    </div>
  );
}
