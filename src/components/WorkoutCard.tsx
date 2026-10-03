import { formatRelativeDay, formatDuration, formatVolume } from "@/lib/format";
import { ChevronRight, Dumbbell } from "lucide-react";
import { Link } from "react-router";

export interface WorkoutCardData {
  _id: string;
  name: string;
  date: number;
  durationSec: number;
  volume: number;
  reps: number;
  exerciseCount: number;
}

/**
 * Compact workout summary card used on the dashboard, history and calendar.
 * All values come from a real saved workout.
 */
export function WorkoutCard({ workout }: { workout: WorkoutCardData }) {
  return (
    <Link
      to={`/app/workouts/${workout._id}`}
      className="group block rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">
            {workout.name}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {formatRelativeDay(workout.date)} ·{" "}
            {formatDuration(workout.durationSec)}
          </p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-[#0c0c0c] transition-colors group-hover:border-primary/40">
          <Dumbbell className="size-3.5 text-muted-foreground group-hover:text-primary" />
        </span>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-border/70 pt-3">
        <div>
          <p className="text-[9px] tracking-[0.1em] text-muted-foreground/80 uppercase">
            Exercises
          </p>
          <p className="num mt-0.5 text-[15px] font-semibold">
            {workout.exerciseCount}
          </p>
        </div>
        <div>
          <p className="text-[9px] tracking-[0.1em] text-muted-foreground/80 uppercase">
            Volume
          </p>
          <p className="num mt-0.5 text-[15px] font-semibold">
            {formatVolume(workout.volume, "kg")}
          </p>
        </div>
        <div>
          <p className="text-[9px] tracking-[0.1em] text-muted-foreground/80 uppercase">
            Reps
          </p>
          <p className="num mt-0.5 text-[15px] font-semibold">{workout.reps}</p>
        </div>
      </div>

      <div className="mt-2 flex justify-end">
        <ChevronRight className="size-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
