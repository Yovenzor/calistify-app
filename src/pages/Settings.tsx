import { api } from "@/convex/_generated/api";
import { SectionLabel } from "@/components/AppUI";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAthlete } from "@/hooks/use-athlete";
import { cn } from "@/lib/utils";
import { ArrowLeft, Bell, Timer, Trash2, TriangleAlert, Volume2 } from "lucide-react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router";

const REST_OPTIONS = [
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "1.5m", value: 90 },
  { label: "2m", value: 120 },
  { label: "3m", value: 180 },
];

/** Settings: units, rest timer, notifications and data management. */
export default function Settings() {
  const navigate = useNavigate();
  const athlete = useAthlete();
  const updateSettings = useMutation(api.profiles.updateSettings);
  const updateProfile = useMutation(api.profiles.update);
  const clearHistory = useMutation(api.workouts.clearHistory);
  const resetAll = useMutation(api.workouts.resetAll);

  const [confirm, setConfirm] = useState<null | "clear" | "reset">(null);
  const [busy, setBusy] = useState(false);

  const profile = athlete.profile;
  if (!profile) return null;

  const run = async (kind: "clear" | "reset") => {
    setBusy(true);
    try {
      if (kind === "clear") await clearHistory({});
      else await resetAll({});
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:border-primary/30"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Settings</h1>
          <p className="text-[12px] text-muted-foreground">
            Units, timers and your data
          </p>
        </div>
      </div>

      {/* Units */}
      <section>
        <SectionLabel>Units</SectionLabel>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4">
          <div>
            <p className="text-[14px] font-medium">Weight Unit</p>
            <p className="text-[11px] text-muted-foreground">
              Applies to bodyweight, sets and volume
            </p>
          </div>
          <div className="flex rounded-xl border border-border bg-secondary p-1">
            {(["kg", "lb"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => void updateProfile({ weightUnit: u })}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-[12px] font-semibold uppercase transition-all",
                  profile.weightUnit === u
                    ? "bg-primary text-primary-foreground shadow-[0_4px_14px_-6px_rgba(182,255,0,0.5)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Rest timer */}
      <section>
        <SectionLabel>Rest Timer</SectionLabel>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="px-4 py-4">
            <div className="flex items-center gap-2.5">
              <Timer className="size-4 text-primary" />
              <p className="text-[14px] font-medium">Default Duration</p>
            </div>
            <div className="mt-3 flex gap-2">
              {REST_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    void updateSettings({ restDurationSec: opt.value })
                  }
                  className={cn(
                    "flex-1 rounded-lg border py-2 text-[12px] font-semibold transition-all",
                    profile.restDurationSec === opt.value
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/70 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <Timer className="size-4 text-muted-foreground" />
              <div>
                <p className="text-[13px] font-medium">Auto-start Timer</p>
                <p className="text-[10px] text-muted-foreground">
                  Begin rest after completing a set
                </p>
              </div>
            </div>
            <Switch
              checked={profile.autoStartRest}
              onCheckedChange={(v) => void updateSettings({ autoStartRest: v })}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/70 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <Volume2 className="size-4 text-muted-foreground" />
              <div>
                <p className="text-[13px] font-medium">Timer Sound</p>
                <p className="text-[10px] text-muted-foreground">
                  Beep when rest ends
                </p>
              </div>
            </div>
            <Switch
              checked={profile.timerSound}
              onCheckedChange={(v) => void updateSettings({ timerSound: v })}
            />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section>
        <SectionLabel>Notifications</SectionLabel>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4">
          <div className="flex items-center gap-2.5">
            <Bell className="size-4 text-muted-foreground" />
            <div>
              <p className="text-[13px] font-medium">Workout Reminders</p>
              <p className="text-[10px] text-muted-foreground">
                Remind me to train on scheduled days
              </p>
            </div>
          </div>
          <Switch
            checked={profile.workoutReminders}
            onCheckedChange={(v) => void updateSettings({ workoutReminders: v })}
          />
        </div>
      </section>

      {/* Data & privacy */}
      <section>
        <SectionLabel>Data &amp; Privacy</SectionLabel>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <div>
              <p className="text-[13px] font-medium">Clear Workout History</p>
              <p className="text-[10px] text-muted-foreground">
                Deletes workouts, sets, records and PRs
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => setConfirm("clear")}
            >
              <Trash2 className="size-3.5" />
              Clear
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-4">
            <div>
              <p className="text-[13px] font-medium">Reset All Data</p>
              <p className="text-[10px] text-muted-foreground">
                Everything back to zero — workouts, achievements, skills and
                weight history
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => setConfirm("reset")}
            >
              <TriangleAlert className="size-3.5" />
              Reset
            </Button>
          </div>
        </div>

        <p className="mt-3 px-1 text-[10px] leading-4 text-muted-foreground/70">
          Your profile, name, photo and settings are never deleted by these
          actions — only training data is removed.
        </p>
      </section>

      {/* Confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setConfirm(null)}
          />
          <div className="rise-in relative w-full max-w-[360px] rounded-2xl border border-border bg-[#0c0c0c] p-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10">
              <TriangleAlert className="size-5 text-destructive" />
            </div>
            <h3 className="mt-3.5 text-[16px] font-bold">
              {confirm === "clear" ? "Clear workout history?" : "Reset all data?"}
            </h3>
            <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
              {confirm === "clear"
                ? "All workouts, sets, records and personal bests will be permanently deleted. This cannot be undone."
                : "Workouts, achievements, skill progress and weight history will be permanently reset to zero. Your profile is kept. This cannot be undone."}
            </p>
            <div className="mt-4 flex gap-2.5">
              <Button
                variant="secondary"
                className="h-10 flex-1 rounded-xl border border-border"
                onClick={() => setConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                className="h-10 flex-1 rounded-xl bg-destructive text-white hover:bg-destructive/90"
                disabled={busy}
                onClick={() => run(confirm)}
              >
                {busy ? "Working…" : confirm === "clear" ? "Clear" : "Reset"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
