import { api } from "@/convex/_generated/api";
import { SectionLabel } from "@/components/AppUI";
import { SKILLS } from "@/lib/skills";
import { cn } from "@/lib/utils";
import { Check, Lock, Target, Trophy } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

/**
 * Skill progression trees. A new user starts with everything locked —
 * steps unlock in order through manual tracking, never automatically.
 */
export default function Skills() {
  const toggleStep = useMutation(api.progress.toggleSkillStep);
  const progress = useQuery(api.progress.skillProgress);
  const [error, setError] = useState<string | null>(null);

  const rows = progress ?? [];

  const isDone = (skillId: string, stepId: string) =>
    rows.find((r) => r.skillId === skillId)?.completedSteps.includes(stepId) ??
    false;

  const completedCount = (skillId: string) =>
    rows.find((r) => r.skillId === skillId)?.completedSteps.length ?? 0;

  const click = async (skillId: string, stepId: string, index: number) => {
    try {
      setError(null);
      await toggleStep({ skillId, stepId, stepIndex: index });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update skill.");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight">Skills</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Track your progression through calisthenics skills
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-[12px] text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {SKILLS.map((skill) => {
          const done = completedCount(skill.id);
          const total = skill.steps.length;
          return (
            <div
              key={skill.id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="flex items-center justify-between border-b border-border/70 bg-[#0c0c0c] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg",
                      done === total ? "bg-primary/15" : "bg-secondary",
                    )}
                  >
                    {done === total ? (
                      <Trophy className="size-3.5 text-primary" />
                    ) : (
                      <Target className="size-3.5 text-muted-foreground" />
                    )}
                  </span>
                  <p className="text-[13px] font-semibold tracking-[0.1em] uppercase">
                    {skill.name}
                  </p>
                </div>
                <span
                  className={cn(
                    "num text-[11px] font-semibold",
                    done === total ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {done}/{total}
                </span>
              </div>

              <div className="h-0.5 w-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${(done / total) * 100}%` }}
                />
              </div>

              <div className="px-4 py-3">
                <ol>
                  {skill.steps.map((step, i) => {
                    const complete = isDone(skill.id, step.id);
                    const prevComplete =
                      i === 0 || isDone(skill.id, skill.steps[i - 1].id);
                    const current = !complete && prevComplete;
                    const locked = !complete && !prevComplete;

                    return (
                      <li key={step.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => click(skill.id, step.id, i)}
                            disabled={locked}
                            aria-label={`${step.name} — ${complete ? "completed" : locked ? "locked" : "current"}`}
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-all active:scale-90",
                              complete &&
                                "border-primary bg-primary text-primary-foreground shadow-[0_0_12px_rgba(182,255,0,0.4)]",
                              current && "border-primary bg-primary/10 text-primary",
                              locked &&
                                "cursor-not-allowed border-border bg-[#0c0c0c] text-muted-foreground/50",
                            )}
                          >
                            {complete ? (
                              <Check className="size-3.5" strokeWidth={3} />
                            ) : locked ? (
                              <Lock className="size-3" />
                            ) : (
                              i + 1
                            )}
                          </button>
                          {i < skill.steps.length - 1 && (
                            <span
                              className={cn(
                                "w-px flex-1 transition-colors",
                                complete ? "bg-primary/50" : "bg-border",
                              )}
                              style={{ minHeight: 22 }}
                            />
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => click(skill.id, step.id, i)}
                          disabled={locked}
                          className={cn(
                            "flex flex-1 items-center justify-between rounded-lg px-1 py-1.5 text-left text-[13px] transition-colors",
                            complete && "font-medium text-foreground",
                            current && "font-semibold text-primary",
                            locked &&
                              "cursor-not-allowed text-muted-foreground/50",
                            !locked && !complete && "hover:text-foreground",
                          )}
                        >
                          <span>{step.name}</span>
                          {current && (
                            <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold tracking-[0.1em] uppercase">
                              Current
                            </span>
                          )}
                          {complete && (
                            <span className="text-[9px] font-semibold tracking-[0.08em] text-primary uppercase">
                              Done
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          );
        })}
      </div>

      <SectionLabel className="mt-1">How it works</SectionLabel>
      <p className="rounded-2xl border border-dashed border-border bg-card/50 px-4 py-4 text-[12px] leading-5 text-muted-foreground">
        Tap a step to mark it complete. Steps unlock in order — you never start
        with advanced skills, and nothing is marked complete without you
        performing it.
      </p>
    </div>
  );
}
