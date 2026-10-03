import { EmptyState, SectionLabel } from "@/components/AppUI";
import { MuscleMap } from "@/components/MuscleMap";
import { ProgressChart } from "@/components/ProgressChart";
import { useAthlete } from "@/hooks/use-athlete";
import { getAchievement } from "@/lib/achievements";
import { formatDuration, formatNumber, formatVolume } from "@/lib/format";
import {
  buildChartSeries,
  type ChartMetric,
  type ChartRange,
} from "@/lib/stats";
import { cn } from "@/lib/utils";
import { CalendarDays, LineChart, Timer, Trophy, User } from "lucide-react";
import { useMemo, useState } from "react";

const METRICS: { id: ChartMetric; label: string; unit: string }[] = [
  { id: "volume", label: "Volume", unit: "kg" },
  { id: "reps", label: "Reps", unit: "reps" },
  { id: "weight", label: "Weight", unit: "kg" },
  { id: "duration", label: "Duration", unit: "min" },
];

const RANGES: ChartRange[] = ["7D", "30D", "3M", "1Y", "All"];

/** Progress overview: training chart, weekly calendar and muscle activation. */
export default function Progress() {
  const athlete = useAthlete();
  const [metric, setMetric] = useState<ChartMetric>("volume");
  const [range, setRange] = useState<ChartRange>("30D");

  const series = useMemo(
    () => buildChartSeries(athlete.workouts, athlete.weights, metric, range),
    [athlete.workouts, athlete.weights, metric, range],
  );

  const points = useMemo(
    () =>
      metric === "duration"
        ? series.map((p) => ({ ...p, value: Math.round(p.value / 60) }))
        : series,
    [series, metric],
  );

  const unit = METRICS.find((m) => m.id === metric)?.unit ?? "kg";

  /* real monthly progress: workouts completed this calendar month vs goal */
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  const monthWorkouts = athlete.workouts.filter(
    (w) => w.date >= monthStart && w.date < monthEnd,
  ).length;
  const weeklyGoal = athlete.profile?.weeklyGoal ?? 0;
  const monthlyGoal = Math.max(1, weeklyGoal * 4);
  const goalPct = Math.min(
    100,
    Math.round((monthWorkouts / monthlyGoal) * 100),
  );

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight">Progress</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Your training trends over time
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <p className="text-[9px] tracking-[0.1em] text-muted-foreground uppercase">
            Workouts
          </p>
          <p className="num mt-1.5 text-[19px] font-bold">
            {athlete.totals.totalWorkouts}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <p className="text-[9px] tracking-[0.1em] text-muted-foreground uppercase">
            Volume
          </p>
          <p className="num mt-1.5 truncate text-[19px] font-bold">
            {formatVolume(athlete.totals.totalVolume, "kg")}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <p className="text-[9px] tracking-[0.1em] text-muted-foreground uppercase">
            Time
          </p>
          <p className="num mt-1.5 truncate text-[19px] font-bold">
            {formatDuration(athlete.totals.totalDurationSec)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <section>
        <SectionLabel action={
          <span className="text-[11px] text-muted-foreground">
            {RANGES.includes(range) ? range : ""}
          </span>
        }>
          Training Progress
        </SectionLabel>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1">
            {METRICS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetric(m.id)}
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all",
                  metric === m.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {points.length > 0 ? (
            <ProgressChart points={points} unit={unit} />
          ) : (
            <div className="flex flex-col items-center px-2 py-9 text-center">
              <span className="flex size-10 items-center justify-center rounded-2xl border border-border bg-[#0c0c0c]">
                <LineChart className="size-4 text-muted-foreground" strokeWidth={1.6} />
              </span>
              <p className="mt-3 text-sm font-semibold">No training data yet</p>
              <p className="mt-1.5 max-w-[250px] text-[12px] leading-5 text-muted-foreground">
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

      {/* Weekly goal */}
      <section>
        <SectionLabel
          action={
            <span className="text-[11px] text-muted-foreground">
              {athlete.totals.totalWorkouts} total
            </span>
          }
        >
          Monthly Goal
        </SectionLabel>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] text-muted-foreground">
              {monthWorkouts} of {monthlyGoal} workouts this month
            </p>
            <p className="num text-[15px] font-bold text-primary">{goalPct}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 shadow-[0_0_12px_rgba(182,255,0,0.5)]"
              style={{ width: `${goalPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* Muscle activity */}
      <section>
        <SectionLabel
          action={
            <span className="text-[11px] text-muted-foreground">
              {athlete.trainedMuscles.filter((m) => m.score > 0).length} trained
            </span>
          }
        >
          Muscle Activity
        </SectionLabel>
        <div className="rounded-2xl border border-border bg-card p-4">
          {athlete.muscleScoreTotal > 0 ? (
            <>
              <MuscleMap activation={athlete.trainedMuscles} />
              <div className="mt-4 space-y-2.5 border-t border-border/70 pt-3">
                {athlete.trainedMuscles
                  .filter((m) => m.score > 0)
                  .slice(0, 6)
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
            </>
          ) : (
            <EmptyState
              icon={User}
              title="No muscles trained yet"
              description="Complete a workout and only the muscles you actually hit will activate here."
            />
          )}
        </div>
      </section>

      {/* Calendar summary */}
      <section>
        <SectionLabel>Activity</SectionLabel>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
              <CalendarDays className="size-4 text-primary" />
            </span>
            <div>
              <p className="text-[13px] font-semibold">
                {athlete.workouts.length === 0
                  ? "No activity recorded"
                  : `${new Set(athlete.workouts.map((w) => w.day)).size} active days`}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {athlete.streak === 0
                  ? "Start a workout to build your streak"
                  : `${athlete.streak}-day current streak`}
              </p>
            </div>
          </div>
          <div className="mt-3 border-t border-border/70 pt-3 text-[12px] text-muted-foreground">
            <div className="flex justify-between py-1">
              <span>Total sets</span>
              <span className="num font-medium text-foreground">
                {formatNumber(athlete.totals.totalSets)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>Total reps</span>
              <span className="num font-medium text-foreground">
                {formatNumber(athlete.totals.totalReps)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>Training time</span>
              <span className="num font-medium text-foreground">
                {formatDuration(athlete.totals.totalDurationSec)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section>
        <SectionLabel
          action={
            <span className="text-[11px] text-muted-foreground">
              {athlete.achievements.length} unlocked
            </span>
          }
        >
          Achievements
        </SectionLabel>
        {athlete.achievements.length === 0 ? (
          <EmptyState
            icon={Timer}
            title="No achievements yet"
            description="Achievements unlock from real milestones — your first one lands after your first workout."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {athlete.achievements.map((a) => {
              const def = getAchievement(a.achievementId);
              return (
                <div
                  key={a._id}
                  className="rounded-2xl border border-primary/25 bg-primary/[0.05] p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10">
                      <Trophy className="size-3 text-primary" />
                    </span>
                    <p className="text-[13px] font-semibold">
                      {def?.name ?? a.achievementId}
                    </p>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">
                    {def?.description ?? "Achievement unlocked"}
                  </p>
                  <p className="mt-1.5 text-[9px] tracking-[0.08em] text-primary/70 uppercase">
                    Unlocked{" "}
                    {new Date(a.unlockedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
