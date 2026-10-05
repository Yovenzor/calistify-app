import { EmptyState, SectionLabel, StatCard } from "@/components/AppUI";
import { api } from "@/convex/_generated/api";
import { MonthlyRecap } from "@/components/MonthlyRecap";
import { ProgressChart } from "@/components/ProgressChart";
import { WorkoutCard } from "@/components/WorkoutCard";
import { Button } from "@/components/ui/button";
import { useAthlete } from "@/hooks/use-athlete";
import {
  formatDuration,
  formatNumber,
  formatVolume,
  greetingForHour,
} from "@/lib/format";
import {
  buildChartSeries,
  type ChartMetric,
  type ChartRange,
} from "@/lib/stats";
import { cn } from "@/lib/utils";
import {
  Activity,
  CalendarDays,
  Dumbbell,
  Flame,
  Play,
  Repeat,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "convex/react";

const METRICS: { id: ChartMetric; label: string; unit: string }[] = [
  { id: "volume", label: "Volume", unit: "kg" },
  { id: "reps", label: "Reps", unit: "reps" },
  { id: "weight", label: "Weight", unit: "kg" },
  { id: "duration", label: "Duration", unit: "min" },
];

const RANGES: ChartRange[] = ["7D", "30D", "3M", "1Y", "All"];

export default function Dashboard() {
  const athlete = useAthlete();
  const navigate = useNavigate();
  const templates = useQuery(api.workouts.listTemplates);
  const [metric, setMetric] = useState<ChartMetric>("volume");
  const [range, setRange] = useState<ChartRange>("30D");

  const name = athlete.profile?.name ?? "Athlete";
  const hour = new Date().getHours();
  const goal = athlete.profile?.weeklyGoal ?? 4;
  const unit = athlete.profile?.weightUnit ?? "kg";

  const series = useMemo(
    () => buildChartSeries(athlete.workouts, athlete.weights, metric, range),
    [athlete.workouts, athlete.weights, metric, range],
  );

  const recent = athlete.workouts.slice(0, 4);
  const topRecords = athlete.records.slice(0, 4);
  const lastWorkout = athlete.workouts[0];

  /* "today's workout": a saved template first, else the last session */
  const plannedWorkout = templates?.length
    ? {
        name: templates[0].name,
        exerciseCount: templates[0].exerciseIds.length,
        setCount: 0,
        kind: "template" as const,
      }
    : lastWorkout
      ? {
          name: lastWorkout.name,
          exerciseCount: lastWorkout.exerciseCount,
          setCount: lastWorkout.sets,
          kind: "history" as const,
        }
      : null;

  const chartUnit =
    metric === "weight" || metric === "volume"
      ? unit
      : (METRICS.find((m) => m.id === metric)?.unit ?? "kg");

  const chartPoints = useMemo(() => {
    const conv = (v: number) =>
      unit === "lb" && (metric === "weight" || metric === "volume")
        ? v * 2.20462
        : v;
    const scaled = series.map((p) => ({ ...p, value: conv(p.value) }));
    if (metric === "duration")
      return scaled.map((p) => ({ ...p, value: Math.round(p.value / 60) }));
    if (metric === "weight" || metric === "volume")
      return scaled.map((p) => ({ ...p, value: Math.round(p.value) }));
    return scaled;
  }, [series, metric, unit]);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <section>
        <h1 className="text-[26px] leading-tight font-bold tracking-tight">
          {greetingForHour(hour)}, {name}.
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Stay consistent. Get stronger.
        </p>
      </section>

      {/* Monthly recap — first thing on home, above today's workout */}
      <MonthlyRecap unit={unit} />

      {/* Today's workout */}
      <section>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border/70 bg-[#0c0c0c] px-5 py-3">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
              Today&apos;s Workout
            </p>
            <CalendarDays className="size-3.5 text-muted-foreground" />
          </div>

          <div className="px-5 py-4">
            {plannedWorkout ? (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[22px] font-bold tracking-tight">
                    {plannedWorkout.name}
                  </p>
                  <span className="shrink-0 text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                    {plannedWorkout.kind === "template"
                      ? "Template"
                      : "Last session"}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {plannedWorkout.exerciseCount > 0
                    ? `${plannedWorkout.exerciseCount} ${plannedWorkout.exerciseCount === 1 ? "exercise" : "exercises"}${
                        plannedWorkout.setCount > 0
                          ? ` · ${plannedWorkout.setCount} sets`
                          : ""
                      } · ready when you are`
                    : "Ready when you are"}
                </p>
                <div className="mt-4 flex gap-3">
                  <Button
                    className="h-11 flex-1 rounded-xl font-semibold shadow-[0_8px_24px_-10px_rgba(182,255,0,0.5)]"
                    onClick={() => navigate("/app/workout/new")}
                  >
                    <Play className="size-4 fill-current" />
                    Start Workout
                  </Button>
                  {plannedWorkout.kind === "history" && (
                    <Button
                      variant="secondary"
                      className="h-11 rounded-xl border border-border"
                      onClick={() =>
                        navigate(`/app/workouts/${lastWorkout._id}`)
                      }
                    >
                      <Repeat className="size-4" />
                      View
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-[19px] font-bold tracking-tight">
                  No workout planned yet
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Start an empty session, pick a template or repeat a previous
                  workout.
                </p>
                <Button
                  className="mt-4 h-11 w-full rounded-xl font-semibold shadow-[0_8px_24px_-10px_rgba(182,255,0,0.5)]"
                  onClick={() => navigate("/app/workout/new")}
                >
                  <Play className="size-4 fill-current" />
                  Start Workout
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section>
        <SectionLabel>Statistics</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Weekly Workouts"
            value={String(athlete.weekly)}
            hint={`Goal: ${goal} / week`}
            icon={CalendarDays}
          />
          <StatCard
            label="Total Workouts"
            value={formatNumber(athlete.totals.totalWorkouts)}
            icon={Dumbbell}
          />
          <StatCard
            label="Training Time"
            value={formatDuration(athlete.totals.totalDurationSec)}
            icon={Timer}
          />
          <StatCard
            label="Total Reps"
            value={formatNumber(athlete.totals.totalReps)}
            icon={Activity}
          />
          <StatCard
            label="Total Volume"
            value={formatVolume(athlete.totals.totalVolume, unit)}
            icon={Zap}
          />
          <StatCard
            label="Current Streak"
            value={`${athlete.streak} ${athlete.streak === 1 ? "day" : "days"}`}
            icon={Flame}
          />
        </div>
      </section>

      {/* This week */}
      <section>
        <SectionLabel
          action={
            <span className="text-[11px] text-muted-foreground">
              {athlete.weekly} / {goal} workouts
            </span>
          }
        >
          This Week
        </SectionLabel>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="grid grid-cols-7 gap-2">
            {athlete.week.map((day) => {
              const active = day.workouts.length > 0;
              return (
                <Link
                  key={day.key}
                  to={
                    active
                      ? `/app/workouts/${day.workouts[0]._id}`
                      : "/app/workout/new"
                  }
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl py-2.5 transition-colors",
                    active
                      ? "bg-primary/10 hover:bg-primary/15"
                      : "hover:bg-secondary",
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-semibold",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {day.label}
                  </span>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border transition-all duration-300",
                      active
                        ? "border-primary bg-primary shadow-[0_0_12px_rgba(182,255,0,0.45)]"
                        : "border-border bg-[#0c0c0c]",
                    )}
                  >
                    {active && (
                      <span className="size-1.5 rounded-full bg-primary-foreground" />
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
          {athlete.weekly === 0 && (
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              No workouts this week yet — tap a day to start.
            </p>
          )}
        </div>
      </section>

      {/* Training progress */}
      <section>
        <SectionLabel>Training Progress</SectionLabel>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1">
            {METRICS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetric(m.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all",
                  metric === m.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {chartPoints.length > 0 ? (
            <ProgressChart points={chartPoints} unit={chartUnit} />
          ) : (
            <div className="px-2 py-8 text-center">
              <p className="text-sm font-semibold">No training data yet</p>
              <p className="mx-auto mt-1.5 max-w-[250px] text-[12px] leading-5 text-muted-foreground">
                Complete your first workout to start tracking progress.
              </p>
            </div>
          )}

          <div className="mt-4 flex gap-1.5 border-t border-border/70 pt-3">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-all",
                  range === r
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Personal records */}
      <section>
        <SectionLabel
          action={
            <Link
              to="/app/records"
              className="text-[11px] font-medium text-primary hover:underline"
            >
              View all
            </Link>
          }
        >
          Personal Records
        </SectionLabel>
        {topRecords.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {topRecords.map((r) => (
              <div
                key={`${r.exerciseId}-${r.metric}`}
                className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/25"
              >
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                  <Trophy className="size-3.5 text-primary" />
                </span>
                <p className="mt-3 truncate text-[12px] font-medium text-muted-foreground">
                  {r.exerciseName}
                </p>
                <p className="num mt-1 text-[22px] leading-none font-bold tracking-tight text-primary">
                  {formatRecordValue(r.metric, r.value, unit)}
                </p>
                <p className="mt-1.5 text-[10px] tracking-[0.08em] text-muted-foreground/80 uppercase">
                  Personal Best
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Trophy}
            title="No records yet"
            description="Complete a workout to start building your personal records."
            action={
              <Button
                variant="secondary"
                size="sm"
                className="rounded-lg border border-border"
                onClick={() => navigate("/app/workout/new")}
              >
                Start Workout
              </Button>
            }
          />
        )}
      </section>

      {/* Recent workouts */}
      <section>
        <SectionLabel
          action={
            <Link
              to="/app/workouts"
              className="text-[11px] font-medium text-primary hover:underline"
            >
              View all
            </Link>
          }
        >
          Recent Workouts
        </SectionLabel>
        {recent.length > 0 ? (
          <div className="space-y-3">
            {recent.map((w) => (
              <WorkoutCard key={w._id} workout={w} unit={unit} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Dumbbell}
            title="No workouts yet"
            description="Start your first workout to begin building your history."
            action={
              <Button
                size="sm"
                className="rounded-lg"
                onClick={() => navigate("/app/workout/new")}
              >
                <Play className="size-3.5 fill-current" />
                Start Workout
              </Button>
            }
          />
        )}
      </section>

      {/* Muscle activity */}
      <section>
        <SectionLabel
          action={
            <Link
              to="/app/progress"
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Muscle map
            </Link>
          }
        >
          Muscle Activity
        </SectionLabel>
        <div className="rounded-2xl border border-border bg-card p-4">
          {athlete.muscleScoreTotal > 0 ? (
            <div className="space-y-2.5">
              {athlete.trainedMuscles
                .filter((m) => m.score > 0)
                .slice(0, 5)
                .map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-[11px] text-muted-foreground">
                      {m.id
                        .replace("_", " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${Math.round(m.ratio * 100)}%` }}
                      />
                    </div>
                    <span className="num w-8 text-right text-[11px] font-semibold text-primary">
                      {Math.round(m.ratio * 100)}%
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Activity className="size-4 text-muted-foreground" />
              </span>
              <div>
                <p className="text-[13px] font-semibold">
                  No muscles trained yet
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Your activation map fills in as you log workouts.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatRecordValue(
  metric: string,
  value: number,
  unit: "kg" | "lb",
): string {
  if (metric === "weight") {
    return unit === "lb"
      ? `+${Math.round(value * 2.20462)} lb`
      : `+${Math.round(value)} kg`;
  }
  if (metric === "duration") return `${Math.round(value)}s`;
  return `${Math.round(value)} reps`;
}
