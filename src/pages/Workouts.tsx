import { SectionLabel, EmptyState } from "@/components/AppUI";
import { WorkoutCard } from "@/components/WorkoutCard";
import { Button } from "@/components/ui/button";
import { useAthlete } from "@/hooks/use-athlete";
import { dateKey, formatFullDate } from "@/lib/format";
import { Dumbbell, Play, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

/** Full workout history, newest first, with month grouping and search. */
export default function Workouts() {
  const { workouts, loading } = useAthlete();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workouts.filter((w) => {
      if (selectedDay && w.day !== selectedDay) return false;
      if (q && !w.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [workouts, query, selectedDay]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const w of filtered) {
      const key = new Date(w.date).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      const arr = map.get(key) ?? [];
      arr.push(w);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const workoutDays = useMemo(
    () => new Set(workouts.map((w) => dateKey(new Date(w.date)))),
    [workouts],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight">Workouts</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {workouts.length === 0
            ? "Your training history starts here"
            : `${workouts.length} completed ${workouts.length === 1 ? "session" : "sessions"}`}
        </p>
      </div>

      {/* Search + quick filter */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search workouts..."
          className="h-11 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-[14px] outline-none transition-colors focus:border-primary/40"
        />
      </div>

      {selectedDay && (
        <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5">
          <span className="text-[12px] font-medium text-primary">
            {formatFullDate(new Date(selectedDay + "T12:00:00").getTime())}
          </span>
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            className="text-[12px] font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}

      {!loading && workouts.length === 0 ? (
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
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching workouts"
          description="Try a different search term or clear the filter."
        />
      ) : (
        <div className="space-y-6">
          {groups.map(([month, items]) => (
            <div key={month}>
              <SectionLabel>{month}</SectionLabel>
              <div className="space-y-3">
                {items.map((w) => (
                  <WorkoutCard key={w._id} workout={w} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar strip — real workout days only */}
      {workouts.length > 0 && (
        <div>
          <SectionLabel
            action={
              <span className="text-[11px] text-muted-foreground">
                {workoutDays.size} active{" "}
                {workoutDays.size === 1 ? "day" : "days"}
              </span>
            }
          >
            Calendar
          </SectionLabel>
          <WorkoutCalendar
            workoutDays={workoutDays}
            selected={selectedDay}
            onSelect={(d) => setSelectedDay(d === selectedDay ? null : d)}
          />
        </div>
      )}
    </div>
  );
}

function WorkoutCalendar({
  workoutDays,
  selected,
  onSelect,
}: {
  workoutDays: Set<string>;
  selected: string | null;
  onSelect: (day: string) => void;
}) {
  const [offset, setOffset] = useState(0);
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + offset);

  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = (firstDay + 6) % 7; // Monday-first

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOffset((o) => o - 1)}
          className="flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="text-[13px] font-semibold">
          {base.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset >= 0}
          className="flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="py-1 text-center text-[9px] font-semibold text-muted-foreground/70"
          >
            {d}
          </div>
        ))}
        {Array.from({ length: blanks }).map((_, i) => (
          <div key={`b-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const hasWorkout = workoutDays.has(key);
          const isSelected = selected === key;
          return (
            <button
              key={key}
              type="button"
              disabled={!hasWorkout}
              onClick={() => onSelect(key)}
              className={
                "flex aspect-square flex-col items-center justify-center rounded-lg border text-[11px] transition-all " +
                (isSelected
                  ? "border-primary bg-primary/15 text-primary"
                  : hasWorkout
                    ? "border-primary/30 bg-primary/[0.07] text-foreground hover:bg-primary/15"
                    : "border-transparent text-muted-foreground/40")
              }
            >
              <span className="num font-medium">{dayNum}</span>
              <span
                className={
                  "mt-0.5 size-1 rounded-full " +
                  (hasWorkout ? "bg-primary" : "bg-transparent")
                }
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
