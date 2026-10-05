import { DifficultyBadge, EmptyState } from "@/components/AppUI";
import {
  EXERCISES,
  CATEGORY_FILTERS,
  DIFFICULTY_FILTERS,
  matchesExercise,
} from "@/lib/exercises";
import { cn } from "@/lib/utils";
import { ArrowRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

/** Exercise database with live search and two filter rows. */
export default function Exercises() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [difficulty, setDifficulty] = useState<string>("All");

  const filtered = useMemo(() => {
    return EXERCISES.filter((e) => {
      if (category !== "All" && e.category !== category) return false;
      if (difficulty !== "All" && e.difficulty !== difficulty) return false;
      return matchesExercise(e, query);
    });
  }, [query, category, difficulty]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight">Exercises</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Your calisthenics exercise database
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, muscle, equipment..."
          className="h-12 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-[14px] outline-none transition-colors focus:border-primary/40"
        />
      </div>

      {/* Category filters */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-[12px] font-medium transition-all",
              category === c
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Difficulty filters */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {DIFFICULTY_FILTERS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDifficulty(d)}
            className={cn(
              "shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all",
              difficulty === d
                ? "border-border bg-secondary text-foreground"
                : "border-transparent bg-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {d}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No exercises found"
          description="Try a different search or filter."
        />
      ) : (
        <div className="grid gap-3 min-[380px]:grid-cols-2">
          {filtered.map((ex) => (
            <Link
              key={ex.id}
              to={`/app/exercises/${ex.id}`}
              className="group flex flex-col rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] leading-snug font-semibold">
                  {ex.name}
                </p>
                <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <div className="mt-2">
                <DifficultyBadge level={ex.difficulty} />
              </div>
              <p className="mt-2.5 text-[11px] leading-4 text-muted-foreground">
                {ex.primary
                  .map((m) =>
                    m
                      .replace("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase()),
                  )
                  .join(" · ")}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/60">
                {ex.equipment}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
