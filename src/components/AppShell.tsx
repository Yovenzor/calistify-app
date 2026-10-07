import { BottomNav } from "@/components/BottomNav";
import { EntryGate } from "@/components/EntryGate";
import { Onboarding } from "@/components/Onboarding";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAthlete } from "@/hooks/use-athlete";
import { useSession } from "@/lib/session";
import { Loader2, Play } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";

/**
 * The mobile app shell: a phone-width column, scrollable content area and a
 * fixed bottom tab bar. Also gates first-run users into onboarding and keeps
 * an in-progress workout reachable from every screen.
 */
export function AppShell() {
  const { loading, profile } = useAthlete();
  const { workout, elapsedMs } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  // True once the athlete submits their name — plays the entry ceremony
  // over the swap into the app (the gate self-removes after the sequence).
  const [entryGate, setEntryGate] = useState(false);

  // Warm the tab page chunks as soon as the shell mounts, so the first visit
  // to each section never waits on code splitting — tab switches feel instant
  // from the very first tap.
  useEffect(() => {
    void Promise.all([
      import("@/pages/Dashboard"),
      import("@/pages/Workouts"),
      import("@/pages/Exercises"),
      import("@/pages/Progress"),
      import("@/pages/Records"),
    ]);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile || !profile.onboarded) {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-[440px] bg-background">
        <Onboarding onEnter={() => setEntryGate(true)} />
      </div>
    );
  }

  const isActiveWorkoutRoute = location.pathname.startsWith(
    "/app/workout/active",
  );

  const elapsedLabel = (() => {
    const total = Math.floor(elapsedMs / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  })();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col border-x border-border/70 bg-background shadow-[0_0_80px_rgba(0,0,0,0.6)]">
      {!isActiveWorkoutRoute && (
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/70 bg-background/85 px-5 py-3.5 backdrop-blur-xl">
          <Link to="/app" aria-label="Calistify home">
            <img
              src="/assets/logo-transparent.png"
              alt="Calistify"
              width={399}
              height={169}
              className="block h-7 w-auto select-none"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/app/skills"
              className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Skills
            </Link>
            <Link
              to="/app/profile"
              className="flex max-w-[55%] items-center gap-2 transition-opacity hover:opacity-80"
              aria-label="Profile"
            >
              <span className="truncate text-[13px] font-semibold text-foreground">
                {profile.name}
              </span>
              <Avatar className="size-7 border border-primary/30">
                <AvatarImage
                  src={profile.imageUrl ?? undefined}
                  alt={profile.name}
                />
                <AvatarFallback className="bg-secondary text-[11px] font-bold text-primary">
                  {(profile.name || "A").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>
      )}

      <main
        key={location.pathname}
        className={
          isActiveWorkoutRoute
            ? "fade-in flex-1 px-4 pt-4 pb-32"
            : "fade-in flex-1 px-5 pt-5 pb-32"
        }
      >
        {/* Inner boundary: a lazily-loaded page suspends here instead of at
            the root, so the bottom nav (and header) commit the route change
            immediately and its animation never waits on a chunk download. */}
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      {workout && !isActiveWorkoutRoute && (
        <button
          type="button"
          onClick={() => navigate("/app/workout/active")}
          className="fixed bottom-[84px] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/30 bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_rgba(182,255,0,0.6)] transition-transform active:scale-95"
        >
          <Play className="size-3.5 fill-current" />
          Resume · {workout.name}
          <span className="num opacity-80">{elapsedLabel}</span>
        </button>
      )}

      {!isActiveWorkoutRoute && <BottomNav />}
      {entryGate && <EntryGate />}
    </div>
  );
}
