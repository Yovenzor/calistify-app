import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Activity, ArrowRight, ChartLine, Medal } from "lucide-react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router";

const FEATURES = [
  { icon: Activity, title: "Track Workouts" },
  { icon: ChartLine, title: "See Progress" },
  { icon: Medal, title: "Break Records" },
] as const;

/**
 * Minimal first-run screen. The entered name is stored on the athlete
 * profile and used everywhere — it is never sample data.
 */
export function Onboarding() {
  const completeOnboarding = useMutation(api.profiles.completeOnboarding);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="fade-in relative flex min-h-dvh flex-col bg-background px-6 pt-8 pb-10">
      <Logo size="md" />

      <div className="flex flex-1 flex-col justify-center py-10">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
          Welcome to Calistify
        </p>
        <h1 className="mt-4 text-[34px] leading-[1.08] font-bold tracking-tight">
          Train smarter.
          <br />
          Build <span className="text-primary">stronger.</span>
        </h1>
        <p className="mt-4 max-w-[300px] text-[15px] leading-6 text-muted-foreground">
          Track every rep. Master every skill. Become stronger. Let&apos;s set
          up your athlete profile.
        </p>

        <form onSubmit={submit} className="mt-9">
          <label
            htmlFor="athlete-name"
            className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
          >
            What should we call you?
          </label>
          <Input
            id="athlete-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={suggested || "e.g. Yovenzor"}
            className="mt-3 h-12 border-border bg-[#0d0d0d] text-base focus-visible:ring-primary/30"
            autoFocus
            maxLength={40}
          />
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={busy}
            className="mt-5 h-12 w-full rounded-xl text-[15px] font-semibold shadow-[0_8px_24px_-8px_rgba(182,255,0,0.45)]"
          >
            {busy ? "Setting up…" : "Start Training"}
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {FEATURES.map(({ icon: Icon, title }) => (
            <div
              key={title}
              className="rise-in flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-2 py-4 text-center"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-4 text-primary" strokeWidth={2} />
              </span>
              <span className="text-[11px] leading-tight font-medium text-muted-foreground">
                {title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
