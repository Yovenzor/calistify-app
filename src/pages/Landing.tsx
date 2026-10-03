import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  Activity,
  ArrowRight,
  Dumbbell,
  Flame,
  Play,
  Trophy,
} from "lucide-react";
import { motion } from "framer-motion";
import { Navigate, useNavigate } from "react-router";

const FEATURES = [
  {
    icon: Dumbbell,
    title: "Log every set",
    text: "Weight, reps, holds and RPE — with rest timers built in.",
  },
  {
    icon: Activity,
    title: "Real progress",
    text: "Volume, reps, bodyweight and streaks charted from actual data.",
  },
  {
    icon: Trophy,
    title: "Earn records",
    text: "Personal bests and achievements unlock only when you beat them.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

export default function Landing() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col border-x border-border/70 bg-background px-6 pt-8 pb-10">
      <motion.header {...fadeUp} className="flex items-center justify-between">
        <Logo size="md" />
        <button
          type="button"
          onClick={() => navigate("/auth")}
          className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign in
        </button>
      </motion.header>

      <main className="flex flex-1 flex-col justify-center py-10">
        <motion.div {...fadeUp}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-primary uppercase">
            <Flame className="size-3" />
            Calisthenics tracker
          </span>

          <h1 className="mt-5 text-[38px] leading-[1.05] font-bold tracking-tight">
            Train smarter.
            <br />
            Build <span className="text-primary">stronger.</span>
          </h1>
          <p className="mt-4 max-w-[310px] text-[15px] leading-6 text-muted-foreground">
            Calistify tracks every rep, every skill and every record — so your
            athlete profile grows with real training, not guesswork.
          </p>
        </motion.div>

        {/* phone mock stat strip */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.1 }}
          className="mt-8 grid grid-cols-3 gap-3"
        >
          {[
            ["0", "Workouts"],
            ["0", "Records"],
            ["0", "Streak"],
          ].map(([v, l]) => (
            <div
              key={l}
              className="rounded-2xl border border-border bg-card px-3 py-4 text-center"
            >
              <p className="num text-[22px] leading-none font-bold text-primary">
                {v}
              </p>
              <p className="mt-1.5 text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                {l}
              </p>
            </div>
          ))}
        </motion.div>
        <p className="mt-2.5 text-center text-[11px] text-muted-foreground/70">
          Your numbers start at zero and only grow from real workouts.
        </p>

        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.16 }}
          className="mt-9 space-y-3"
        >
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="size-4 text-primary" strokeWidth={1.9} />
              </span>
              <div>
                <p className="text-[14px] font-semibold">{title}</p>
                <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </main>

      <motion.footer
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.24 }}
        className="space-y-3"
      >
        <Button
          onClick={() => navigate("/auth")}
          className="h-12 w-full rounded-xl text-[15px] font-semibold shadow-[0_12px_34px_-14px_rgba(182,255,0,0.7)]"
        >
          <Play className="size-4 fill-current" />
          Start Training
          <ArrowRight className="size-4" />
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Free to use · Your data stays in your account
        </p>
      </motion.footer>
    </div>
  );
}
