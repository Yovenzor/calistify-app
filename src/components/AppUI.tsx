import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Small uppercase section label used above card groups. */
export function SectionLabel({
  children,
  className,
  action,
}: {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between", className)}>
      <h2 className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Dashboard statistic card — label on top, big number below. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-4 transition-colors duration-200 hover:border-primary/25">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </p>
        {Icon && (
          <Icon
            className="size-3.5 text-muted-foreground/70 transition-colors group-hover:text-primary"
            strokeWidth={1.8}
          />
        )}
      </div>
      <p className="num mt-2.5 text-[22px] leading-none font-bold tracking-tight">
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 text-[11px] text-muted-foreground/80">{hint}</p>
      )}
    </div>
  );
}

/** Polished empty state — every zero-data screen uses this. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-2xl border border-border bg-[#0c0c0c]">
        <Icon className="size-5 text-muted-foreground" strokeWidth={1.6} />
      </span>
      <p className="mt-3.5 text-sm font-semibold">{title}</p>
      <p className="mt-1.5 max-w-[260px] text-[13px] leading-5 text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Difficulty pill used across exercise cards. */
export function DifficultyBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    Beginner: "border-primary/25 text-primary bg-primary/10",
    Intermediate: "border-border text-foreground bg-secondary",
    Advanced: "border-border text-muted-foreground bg-secondary",
    Elite: "border-destructive/30 text-destructive bg-destructive/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.08em] uppercase",
        styles[level] ?? "border-border text-muted-foreground bg-secondary",
      )}
    >
      {level}
    </span>
  );
}
