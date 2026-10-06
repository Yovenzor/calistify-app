import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Activity, ArrowRight, ChartLine, Medal, User } from "lucide-react";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

const FEATURES = [
  { icon: Activity, title: "Track Workouts" },
  { icon: ChartLine, title: "See Progress" },
  { icon: Medal, title: "Break Records" },
] as const;

/**
 * Entrance gate timing — nine hidden slats wipe in from the left
 * (staggered but almost together), the lime seams glow while a scan line
 * sweeps and the wordmark appears, then the slats slide out to the right
 * like an opening that reveals the screen. Total ≈ 1.66s.
 */
const SLATS = 9;
const IN_MS = 380;
const IN_STAGGER = 35;
const OUT_BASE = 820;
const OUT_STAGGER = 45;
const OUT_MS = 480;
const GATE_MS = OUT_BASE + (SLATS - 1) * OUT_STAGGER + OUT_MS;

/**
 * Minimal first-run screen. The entered name is stored on the athlete
 * profile and used everywhere — it is never sample data.
 *
 * Deliberately composed differently from the auth screens (centered stack,
 * live monogram preview instead of the left-aligned marketing headline) so
 * it reads as a profile setup moment, not another auth step — announced by
 * a full-screen slat-gate opening on mount.
 */
export function Onboarding() {
  const completeOnboarding = useMutation(api.profiles.completeOnboarding);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState(true);

  // Unmount the gate once it has fully opened (self-healing: if anything
  // delays the timer, the content underneath is still fully usable because
  // the overlay never captures pointer events).
  useEffect(() => {
    const timer = setTimeout(() => setGate(false), GATE_MS + 140);
    return () => clearTimeout(timer);
  }, []);

  const suggested = user?.name ?? "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim() || suggested.trim();
    if (!value) {
      setError("Please enter a name to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding({ name: value });
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  // Live monogram — mirrors exactly what will be saved (typed name, with the
  // account name as the same fallback the submit uses).
  const displayName = name.trim() || suggested.trim();
  const initials = displayName
    ? displayName
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase()
    : "";

  return (
    <div className="fade-in relative flex min-h-dvh flex-col bg-background px-6 pt-8 pb-10">
      {/* ── Entrance gate ─────────────────────────────────────────── */}
      {gate && (
        <div
          className="pointer-events-none fixed inset-0 z-[90] overflow-hidden"
          aria-hidden="true"
        >
          {/* Dark veil so the screen is swallowed while the slats arrive */}
          <div
            className="absolute inset-0 bg-background"
            style={{
              animation:
                "gate-veil 300ms ease-out both, gate-veil-out 320ms ease-in 700ms forwards",
            }}
          />

          {/* The hidden bars: in from the left, hold, out to the right */}
          {Array.from({ length: SLATS }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 w-full border-t border-primary/40 bg-[#070707]"
              style={{
                top: `${(i * 100) / SLATS}%`,
                height: `calc(100% / ${SLATS} + 2px)`,
                animation: [
                  `slat-in ${IN_MS}ms cubic-bezier(0.83,0,0.17,1) ${i * IN_STAGGER}ms both`,
                  `slat-out ${OUT_MS}ms cubic-bezier(0.83,0,0.17,1) ${OUT_BASE + i * OUT_STAGGER}ms forwards`,
                ].join(", "),
              }}
            />
          ))}

          {/* Lime scan line sweeping down through the seams */}
          <div className="gate-scan absolute top-0 left-0 h-[2px] w-full bg-primary shadow-[0_0_18px_2px_rgba(182,255,0,0.5)]" />

          {/* Wordmark powering on in the middle of the hold */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/assets/logo-transparent.png"
              alt=""
              className="gate-emblem h-9 w-auto"
            />
          </div>
        </div>
      )}

      <img
        src="/assets/logo-transparent.png"
        alt="Calistify"
        width={399}
        height={169}
        className="mx-auto block h-8 w-auto select-none"
      />

      <div className="flex flex-1 flex-col justify-center py-10">
        <div className="mx-auto w-full max-w-[320px]">
          {/* Live monogram preview of the name being typed */}
          <div className="pop-in mx-auto flex size-16 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10">
            {initials ? (
              <span className="text-[22px] font-bold text-primary">
                {initials}
              </span>
            ) : (
              <User className="size-7 text-primary/70" strokeWidth={2} />
            )}
          </div>

          <p className="mt-6 text-center text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
            Almost there
          </p>
          <h1 className="mt-3 text-center text-[30px] leading-[1.12] font-bold tracking-tight">
            What should we call <span className="text-primary">you?</span>
          </h1>
          <p className="mx-auto mt-3 max-w-[270px] text-center text-[14px] leading-6 text-muted-foreground">
            The name you&apos;ll see across your dashboard, records and recaps.
          </p>

          <form onSubmit={submit} className="mt-7">
            <label
              htmlFor="athlete-name"
              className="block text-center text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
            >
              Your name
            </label>
            <Input
              id="athlete-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="mt-3 h-12 border-border bg-[#0d0d0d] text-center text-base focus-visible:ring-primary/30"
              autoFocus
              maxLength={40}
            />
            {error && (
              <p className="mt-2 text-center text-xs text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="mt-5 h-12 w-full rounded-xl text-[15px] font-semibold shadow-[0_8px_24px_-8px_rgba(182,255,0,0.45)]"
            >
              {busy ? "Setting up…" : "Start Training"}
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </div>

        <div className="rise-in mt-9 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {FEATURES.map(({ icon: Icon, title }) => (
            <span
              key={title}
              className="flex items-center gap-1.5 text-[12px] text-muted-foreground"
            >
              <Icon className="size-3.5 text-primary" strokeWidth={2.2} />
              {title}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
