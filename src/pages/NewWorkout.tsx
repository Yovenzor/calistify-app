import { api } from "@/convex/_generated/api";
import { EmptyState, SectionLabel } from "@/components/AppUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAthlete } from "@/hooks/use-athlete";
import { useSession, type SessionExercise } from "@/lib/session";
import { formatRelativeDay, formatDuration } from "@/lib/format";
import { EXERCISES, getExercise, matchesExercise } from "@/lib/exercises";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Dumbbell,
  FilePlus2,
  Play,
  Repeat,
  Save,
  Search,
  X,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";

type Mode = "empty" | "template" | "repeat";

/**
 * Fast workout creation: empty workout, saved template, or repeat a previous
 * session. Exercises can be added right here before starting the timer.
 */
export default function NewWorkout() {
  const navigate = useNavigate();
  const { startWorkout } = useSession();
  const { workouts } = useAthlete();
  const templates = useQuery(api.workouts.listTemplates);
  const createTemplate = useMutation(api.workouts.createTemplate);

  const [mode, setMode] = useState<Mode>("empty");
  const [name, setName] = useState("");
  const [exerciseIds, setExerciseIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [repeatId, setRepeatId] = useState<string | null>(null);
  const repeatDetail = useQuery(
    api.workouts.get,
    repeatId ? { id: repeatId as never } : "skip",
  );

  const recentWorkouts = workouts.slice(0, 6);

  const filtered = useMemo(
    () => EXERCISES.filter((e) => matchesExercise(e, query)),
    [query],
  );

  const handleStart = () => {
    const exercises: SessionExercise[] = exerciseIds.map((id) => ({
      instanceId: Math.random().toString(36).slice(2),
      exerciseId: id,
      sets: [
        {
          id: Math.random().toString(36).slice(2),
          weightKg: 0,
          reps: 0,
          isBodyweight: true,
          completed: false,
        },
      ],
    }));
    startWorkout(name || "New Workout", exercises);
    navigate("/app/workout/active");
  };

  /* load the chosen previous workout, then start a copy of it */
  useEffect(() => {
    if (!repeatId || !repeatDetail) return;
    const exercises: SessionExercise[] = repeatDetail.exercises.map((e) => ({
      instanceId: Math.random().toString(36).slice(2),
      exerciseId: e.exerciseId,
      sets: e.sets
        .filter((s) => s.completed)
        .slice(0, 1)
        .map((s) => ({
          id: Math.random().toString(36).slice(2),
          weightKg: s.weightKg,
          reps: s.reps,
          durationSec: s.durationSec,
          isBodyweight: s.isBodyweight,
          completed: false,
        })),
      notes: undefined,
    }));
    // keep one default set per exercise even if the source had none
    const normalized = exercises.map((e) =>
      e.sets.length > 0
        ? e
        : {
            ...e,
            sets: [
              {
                id: Math.random().toString(36).slice(2),
                weightKg: 0,
                reps: 0,
                isBodyweight: true,
                completed: false,
              },
            ],
          },
    );
    startWorkout(repeatDetail.workout.name, normalized);
    navigate("/app/workout/active");
  }, [repeatId, repeatDetail, startWorkout, navigate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:border-primary/30"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">New Workout</h1>
          <p className="text-[12px] text-muted-foreground">
            Choose how you want to begin
          </p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-2.5">
        {(
          [
            { id: "empty", label: "Empty", icon: FilePlus2 },
            { id: "template", label: "Template", icon: Save },
            { id: "repeat", label: "Repeat", icon: Repeat },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border px-2 py-4 transition-all",
              mode === id
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="text-[11px] font-semibold">{label}</span>
          </button>
        ))}
      </div>

      {mode === "template" && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <SectionLabel>Templates</SectionLabel>
          {templates && templates.length > 0 ? (
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => {
                    setName(t.name);
                    setExerciseIds(t.exerciseIds);
                    setMode("empty");
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-[#0c0c0c] px-4 py-3 text-left transition-colors hover:border-primary/30"
                >
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {t.exerciseIds.length} exercises
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              No templates yet. Build a workout below and save it as a template
              from the active session.
            </p>
          )}
        </div>
      )}

      {mode === "repeat" && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <SectionLabel>Previous Workouts</SectionLabel>
          {recentWorkouts.length > 0 ? (
            <div className="space-y-2">
              {recentWorkouts.map((w) => (
                <button
                  key={w._id}
                  type="button"
                  onClick={() => setRepeatId(w._id)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-[#0c0c0c] px-4 py-3 text-left transition-colors hover:border-primary/30"
                >
                  <span className="text-sm font-medium">{w.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeDay(w.date)} ·{" "}
                    {formatDuration(w.durationSec)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              No previous workouts to repeat yet.
            </p>
          )}
        </div>
      )}

      {/* Workout setup */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <label
          htmlFor="workout-name"
          className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
        >
          Workout Name
        </label>
        <Input
          id="workout-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Push Day"
          className="mt-2 h-11 border-border bg-[#0c0c0c] focus-visible:ring-primary/30"
        />

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Exercises
          </span>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
          >
            <Search className="size-3.5" />
            Add exercise
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {exerciseIds.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">
              No exercises yet — you can also add them during the workout.
            </p>
          ) : (
            exerciseIds.map((id, idx) => {
              const ex = getExercise(id);
              if (!ex) return null;
              return (
                <div
                  key={`${id}-${idx}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-[#0c0c0c] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      {ex.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {ex.primary.join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setExerciseIds((ids) => ids.filter((_, i) => i !== idx))
                    }
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${ex.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Button
        onClick={handleStart}
        className="h-12 w-full rounded-xl text-[15px] font-semibold shadow-[0_10px_30px_-12px_rgba(182,255,0,0.6)]"
      >
        <Play className="size-4 fill-current" />
        Create Workout
      </Button>

      <Button
        variant="ghost"
        className="w-full text-muted-foreground"
        disabled={exerciseIds.length === 0}
        onClick={async () => {
          await createTemplate({
            name: name || "Template",
            exerciseIds,
          });
        }}
      >
        <Save className="size-4" />
        {exerciseIds.length > 0
          ? "Save as template"
          : "Add exercises to save a template"}
      </Button>

      {/* Exercise picker sheet */}
      {pickerOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setPickerOpen(false)}
            />
            <div className="rise-in relative flex max-h-[80dvh] w-full max-w-[440px] flex-col rounded-t-3xl border border-border bg-[#0a0a0a]">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <p className="text-[15px] font-semibold">Add Exercise</p>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
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
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={Search}
                    title="No exercises found"
                    description="Try a different search or filter."
                  />
                ) : (
                  <div className="space-y-2">
                    {filtered.map((ex) => {
                      const added = exerciseIds.includes(ex.id);
                      return (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => {
                            setExerciseIds((ids) =>
                              added
                                ? ids.filter((i) => i !== ex.id)
                                : [...ids, ex.id],
                            );
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                            added
                              ? "border-primary/50 bg-primary/10"
                              : "border-border bg-card hover:border-primary/25",
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium">
                              {ex.name}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {ex.primary.join(" · ")} · {ex.equipment}
                            </p>
                          </div>
                          {added ? (
                            <span className="text-[11px] font-semibold text-primary">
                              Added
                            </span>
                          ) : (
                            <Dumbbell className="size-4 text-muted-foreground" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
