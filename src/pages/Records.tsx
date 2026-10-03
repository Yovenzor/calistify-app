import { EmptyState, SectionLabel } from "@/components/AppUI";
import { Button } from "@/components/ui/button";
import { useAthlete } from "@/hooks/use-athlete";
import { formatFullDate } from "@/lib/format";
import { Dumbbell, Play, Trophy } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router";

/** All personal records, grouped by metric. Empty for new users. */
export default function Records() {
  const { records } = useAthlete();
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const map = new Map<string, typeof records>();
    for (const r of records) {
      const arr = map.get(r.metric) ?? [];
      arr.push(r);
      map.set(r.metric, arr);
    }
    return Array.from(map.entries());
  }, [records]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight">Records</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Personal bests earned from your logged workouts
        </p>
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No records yet"
          description="Complete a workout to start building your personal records."
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
      ) : (
        <div className="space-y-6">
          {groups.map(([metric, items]) => (
            <div key={metric}>
              <SectionLabel>
                {metric === "weight"
                  ? "Max Added Weight"
                  : metric === "duration"
                    ? "Best Holds"
                    : "Most Reps"}
              </SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                {items.map((r) => (
                  <div
                    key={r._id}
                    className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
                  >
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                      <Trophy className="size-3.5 text-primary" />
                    </span>
                    <p className="mt-3 truncate text-[12px] font-medium text-muted-foreground">
                      {r.exerciseName}
                    </p>
                    <p className="num mt-1 text-[24px] leading-none font-bold tracking-tight text-primary">
                      {metric === "weight"
                        ? `+${Math.round(r.value)} kg`
                        : metric === "duration"
                          ? `${Math.round(r.value)}s`
                          : `${Math.round(r.value)} reps`}
                    </p>
                    <p className="mt-2 text-[10px] text-muted-foreground/70">
                      {formatFullDate(r.date)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {records.length > 0 && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-5 text-[12px] text-muted-foreground">
          <Dumbbell className="size-3.5" />
          Beat these numbers in your next workout to set new records.
        </div>
      )}
    </div>
  );
}
