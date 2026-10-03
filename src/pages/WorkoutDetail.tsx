import { api } from "@/convex/_generated/api";
import { EmptyState, SectionLabel } from "@/components/AppUI";
import { Button } from "@/components/ui/button";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscles";
import { getExercise } from "@/lib/exercises";
import {
  formatClock,
  formatFullDate,
  formatTime,
  formatVolume,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Activity,
  ArrowLeft,
  ArrowLeftRight,
  Check,
  Clock,
  Dumbbell,
  Repeat,
  Trophy,
} from "lucide-react";
import { useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router";

/** Full detail of one completed workout, straight from the saved document. */
export default function WorkoutDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const data = useQuery(
    api.workouts.get,
    id ? { id: id as never } : "skip",
  );

  if (data === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (data === null) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Workout not found"
        description="This workout may have been deleted."
        action={
          <Button
            size="sm"
            variant="secondary"
            className="rounded-lg border border-border"
            onClick={() => navigate("/app/workouts")}
          >
            Back to history
          </Button>
        }
      />
    );
  }

  const { workout, exercises, prs } = data;
  const muscles = Object.entries(workout.muscleActivation)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:border-primary/30"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-[19px] font-bold tracking-tight">
            {workout.name}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {formatFullDate(workout.date)}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-y-4">
          <Meta
            icon={Clock}
            label="Start / End"
            value={`${formatTime(workout.startedAt)} – ${formatTime(workout.endedAt)}`}
          />
          <Meta
            icon={Activity}
            label="Duration"
            value={formatClock(workout.durationSec)}
          />
          <Meta
            icon={Dumbbell}
            label="Exercises"
            value={String(workout.exerciseCount)}
          />
          <Meta
            icon={Check}
            label="Sets · Reps"
            value={`${workout.sets} · ${workout.reps}`}
          />
          <Meta
            icon={ArrowLeftRight}
            label="Volume"
            value={formatVolume(workout.volume, "kg")}
          />
          <Meta
            icon={Trophy}
            label="PRs"
            value={String(prs.length)}
            highlight={prs.length > 0}
          />
        </div>
      </div>

      {/* PRs earned */}
      {prs.length > 0 && (
        <div>
          <SectionLabel>Records Set</SectionLabel>
          <div className="space-y-2">
            {prs.map((pr) => (
              <div
                key={pr._id}
                className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/[0.06] px-4 py-3"
              >
                <span className="text-[13px] font-medium">{pr.exerciseName}</span>
                <span className="num text-[15px] font-bold text-primary">
                  {pr.metric === "weight"
                    ? `+${Math.round(pr.value)} kg`
                    : pr.metric === "duration"
                      ? `${Math.round(pr.value)}s`
                      : `${Math.round(pr.value)} reps`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Muscles trained */}
      <div>
        <SectionLabel>Muscles Trained</SectionLabel>
        {muscles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {muscles.map(([id, score]) => (
              <span
                key={id}
                className="rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
              >
                {MUSCLE_LABELS[id as MuscleGroup] ?? id}
                <span className="num ml-1.5 text-primary/60">
                  {Math.round(score)}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            No muscle activation recorded.
          </p>
        )}
      </div>

      {/* Exercise by exercise */}
      <div>
        <SectionLabel>Performance</SectionLabel>
        <div className="space-y-3">
          {exercises.map((ex) => {
            const def = getExercise(ex.exerciseId);
            return (
              <div
                key={ex._id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="flex items-center justify-between border-b border-border/70 bg-[#0c0c0c] px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">{ex.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {def?.difficulty} · {def?.primary.join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="num text-[13px] font-bold text-primary">
                      {formatVolume(ex.volume, "kg")}
                    </p>
                    <p className="num text-[10px] text-muted-foreground">
                      {ex.reps} reps
                    </p>
                  </div>
                </div>

                <div className="px-4 py-2">
                  <div className="grid grid-cols-[24px_1fr_1fr_40px] gap-2 py-1.5 text-[9px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                    <span>Set</span>
                    <span>Weight</span>
                    <span>{def?.timed ? "Seconds" : "Reps"}</span>
                    <span className="text-center">Done</span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {ex.sets.map((s) => (
                      <div
                        key={s.order}
                        className={cn(
                          "grid grid-cols-[24px_1fr_1fr_40px] items-center gap-2 py-2 text-[13px]",
                          !s.completed && "opacity-40",
                        )}
                      >
                        <span className="num text-muted-foreground">{s.order}</span>
                        <span className="num">
                          {s.isBodyweight && s.weightKg === 0
                            ? "Bodyweight"
                            : s.isBodyweight
                              ? `BW + ${Math.round(s.weightKg)} kg`
                              : `${Math.round(s.weightKg)} kg`}
                        </span>
                        <span className="num">
                          {def?.timed
                            ? `${Math.round(s.durationSec ?? 0)}s`
                            : s.reps}
                        </span>
                        <span className="flex justify-center">
                          {s.completed ? (
                            <Check className="size-3.5 text-primary" strokeWidth={3} />
                          ) : (
                            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  {ex.notes && (
                    <p className="mt-2 border-t border-border/50 pt-2 text-[11px] text-muted-foreground italic">
                      {ex.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Button
        variant="secondary"
        className="h-11 w-full rounded-xl border border-border"
        onClick={() => navigate("/app/workout/new")}
      >
        <Repeat className="size-4" />
        Repeat this workout
      </Button>
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-secondary">
        <Icon
          className={cn("size-3.5", highlight ? "text-primary" : "text-muted-foreground")}
        />
      </span>
      <div className="min-w-0">
        <p className="text-[9px] tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </p>
        <p className="num truncate text-[13px] font-semibold">{value}</p>
      </div>
    </div>
  );
}
