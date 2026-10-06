import { cn } from "@/lib/utils";
import { Dumbbell, House, ListChecks, TrendingUp, Trophy } from "lucide-react";
import { NavLink } from "react-router";

const TABS = [
  { to: "/app", label: "Home", icon: House, end: true },
  { to: "/app/workouts", label: "Workouts", icon: Dumbbell, end: false },
  { to: "/app/exercises", label: "Exercises", icon: ListChecks, end: false },
  { to: "/app/progress", label: "Progress", icon: TrendingUp, end: false },
  { to: "/app/records", label: "Records", icon: Trophy, end: false },
] as const;

/** One shared iOS-style curve so every part of the switch moves together. */
const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

/**
 * Floating pill tab bar — the mobile replacement for the desktop sidebar.
 * The pill keeps a constant width (its edges never jump), items are spread
 * with justify-between so the outer icons stay pinned, and only the active
 * item's label slides open while the rest stay icon-only.
 */
export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
      <ul className="flex w-[344px] max-w-full items-center justify-between gap-1 overflow-hidden rounded-full border border-border/80 bg-[#0a0a0a]/95 p-1.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex">
            <NavLink
              to={to}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  "flex h-11 items-center rounded-full transition-colors duration-300",
                  EASE,
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="flex w-11 shrink-0 items-center justify-center">
                    <Icon className="size-5" strokeWidth={2} />
                  </span>
                  <span
                    aria-hidden={!isActive}
                    className={cn(
                      "overflow-hidden whitespace-nowrap text-[12px] font-semibold leading-none transition-all duration-300",
                      EASE,
                      isActive
                        ? "max-w-[96px] translate-x-0 pr-3.5 opacity-100"
                        : "max-w-0 -translate-x-1.5 opacity-0",
                    )}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
