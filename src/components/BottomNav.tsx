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

/** Fixed bottom tab bar — the mobile replacement for the desktop sidebar. */
export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[440px] border-t border-border bg-[#080808]/95 backdrop-blur-xl">
      <ul className="flex items-stretch justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 rounded-xl py-1.5 transition-colors duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "flex h-7 w-12 items-center justify-center rounded-full transition-all duration-200",
                      isActive && "bg-primary/10",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-[19px] transition-transform duration-200",
                        isActive && "scale-105",
                      )}
                      strokeWidth={isActive ? 2.2 : 1.7}
                    />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium tracking-tight transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground",
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
