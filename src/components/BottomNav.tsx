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

/**
 * Floating pill tab bar — the mobile replacement for the desktop sidebar.
 * Every item renders icon-only; the active one expands to reveal its label
 * while the others stay collapsed, with the width animating smoothly.
 */
export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
      <ul className="flex max-w-full items-center justify-center gap-1 rounded-full border border-border/80 bg-[#0a0a0a]/95 p-1.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex">
            <NavLink
              to={to}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  "flex h-11 items-center overflow-hidden rounded-full transition-all duration-300 ease-out",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="flex w-11 shrink-0 items-center justify-center">
                    <Icon
                      className={cn(
                        "size-5 transition-transform duration-300 ease-out",
                        isActive && "scale-105",
                      )}
                      strokeWidth={isActive ? 2.2 : 1.7}
                    />
                  </span>
                  <span
                    aria-hidden={!isActive}
                    className={cn(
                      "overflow-hidden whitespace-nowrap text-[12px] font-semibold leading-none transition-all duration-300 ease-out",
                      isActive
                        ? "max-w-[96px] pr-3.5 opacity-100"
                        : "max-w-0 opacity-0",
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
