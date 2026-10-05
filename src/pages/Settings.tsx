import { api } from "@/convex/_generated/api";
import { SectionLabel } from "@/components/AppUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAthlete } from "@/hooks/use-athlete";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Bell,
  ShieldCheck,
  Timer,
  Trash2,
  TriangleAlert,
  UserX,
  Volume2,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import QRCode from "qrcode";

const REST_OPTIONS = [
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "1.5m", value: 90 },
  { label: "2m", value: 120 },
  { label: "3m", value: 180 },
];

const CONFIRMS = {
  clear: {
    title: "Clear workout history?",
    body: "All workouts, sets, records and personal bests will be permanently deleted. This cannot be undone.",
    cta: "Clear",
  },
  reset: {
    title: "Reset all data?",
    body: "Workouts, achievements, skill progress and weight history will be permanently reset to zero. Your profile is kept. This cannot be undone.",
    cta: "Reset",
  },
  delete: {
    title: "Delete your account?",
    body: "Your profile, photo, settings, workouts, records and every sign-in method will be permanently deleted. You will be signed out immediately. This cannot be undone.",
    cta: "Delete account",
  },
} as const;

type ConfirmKind = keyof typeof CONFIRMS;

/** Settings: units, rest timer, notifications and data management. */
export default function Settings() {
  const navigate = useNavigate();
  const athlete = useAthlete();
  const updateSettings = useMutation(api.profiles.updateSettings);
  const updateProfile = useMutation(api.profiles.update);
  const clearHistory = useMutation(api.workouts.clearHistory);
  const resetAll = useMutation(api.workouts.resetAll);
  const deleteAccount = useMutation(api.account.deleteAccount);
  const { signOut } = useAuthActions();

  // Google Authenticator (TOTP) setup
  const twoFa = useQuery(api.twoFactor.status);
  const setupTwoFa = useMutation(api.twoFactor.setup);
  const enableTwoFa = useMutation(api.twoFactor.enable);
  const disableTwoFa = useMutation(api.twoFactor.disable);

  const [confirm, setConfirm] = useState<null | ConfirmKind>(null);
  const [busy, setBusy] = useState(false);

  const [pending, setPending] = useState<null | {
    secret: string;
    url: string;
  }>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [offCode, setOffCode] = useState("");
  const [twoFaBusy, setTwoFaBusy] = useState(false);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);
  const [twoFaNotice, setTwoFaNotice] = useState<string | null>(null);

  const profile = athlete.profile;
  if (!profile) return null;

  const startTwoFaSetup = async () => {
    setTwoFaBusy(true);
    setTwoFaError(null);
    setTwoFaNotice(null);
    try {
      const res = await setupTwoFa({});
      const dataUrl = await QRCode.toDataURL(res.url, {
        margin: 1,
        width: 256,
        color: { dark: "#050505", light: "#FFFFFF" },
      });
      setPending(res);
      setQrDataUrl(dataUrl);
      setTotpCode("");
    } catch (error) {
      setTwoFaError(
        error instanceof Error ? error.message : "Could not start setup.",
      );
    } finally {
      setTwoFaBusy(false);
    }
  };

  const confirmTwoFaSetup = async () => {
    if (totpCode.length !== 6) return;
    setTwoFaBusy(true);
    setTwoFaError(null);
    try {
      await enableTwoFa({ code: totpCode });
      setPending(null);
      setQrDataUrl(null);
      setTotpCode("");
      setTwoFaNotice("Two-factor authentication is now on.");
    } catch (error) {
      setTwoFaError(
        error instanceof Error
          ? error.message
          : "That code isn't right. Try the current code.",
      );
      setTotpCode("");
    } finally {
      setTwoFaBusy(false);
    }
  };

  const cancelTwoFaSetup = () => {
    setPending(null);
    setQrDataUrl(null);
    setTotpCode("");
    setTwoFaError(null);
  };

  const removeTwoFa = async () => {
    if (offCode.length !== 6) return;
    setTwoFaBusy(true);
    setTwoFaError(null);
    try {
      await disableTwoFa({ code: offCode });
      setOffCode("");
      setTwoFaNotice("Two-factor authentication is off.");
    } catch (error) {
      setTwoFaError(
        error instanceof Error
          ? error.message
          : "That code isn't right. Try the current code.",
      );
      setOffCode("");
    } finally {
      setTwoFaBusy(false);
    }
  };

  const run = async (kind: ConfirmKind) => {
    setBusy(true);
    try {
      if (kind === "clear") await clearHistory({});
      else if (kind === "reset") await resetAll({});
      else {
        // Full account deletion — wipe everything, then leave the session.
        await deleteAccount({});
        try {
          await signOut();
        } catch {
          // Session is already gone after deletion; signing out is best-effort.
        }
        navigate("/auth", { replace: true });
        return;
      }
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
            onCheckedChange={(v) =>
              void updateSettings({ workoutReminders: v })
            }
          />
        </div>
      </section>

      {/* Security — Google Authenticator (TOTP) */}
      <section>
        <SectionLabel>Security</SectionLabel>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-start justify-between gap-3 px-4 py-4">
            <div className="flex items-start gap-2.5">
              <ShieldCheck
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  twoFa?.enabled ? "text-primary" : "text-muted-foreground",
                )}
              />
              <div>
                <p className="text-[13px] font-medium">Google Authenticator</p>
                <p className="text-[10px] text-muted-foreground">
                  {twoFa?.enabled
                    ? "On — password sign-ins now need a 6-digit app code."
                    : "Protect password sign-ins with a 6-digit code from your phone."}
                </p>
              </div>
            </div>
            {!twoFa?.enabled && !pending && (
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0 rounded-lg border border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => void startTwoFaSetup()}
                disabled={twoFaBusy}
              >
                Set up
              </Button>
            )}
          </div>

          {twoFaNotice && !pending && !twoFa?.enabled && (
            <p className="border-t border-border/70 px-4 py-3 text-[11px] text-primary">
              {twoFaNotice}
            </p>
          )}

          {pending && (
            <div className="border-t border-border/70 px-4 py-4">
              <ol className="space-y-1 text-[11px] leading-4 text-muted-foreground">
                <li>
                  <span className="font-semibold text-foreground">1.</span> Open
                  Google Authenticator and scan this QR code (or enter the key
                  below).
                </li>
                <li>
                  <span className="font-semibold text-foreground">2.</span> Type
                  the 6-digit code it shows to confirm.
                </li>
              </ol>

              <div className="mt-3 flex flex-col items-center gap-3">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="Google Authenticator setup QR code"
                    className="h-44 w-44 rounded-xl border border-border"
                  />
                )}
                <div className="w-full">
                  <p className="text-center text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    Setup key
                  </p>
                  <p className="num mt-1.5 w-full rounded-lg border border-border bg-[#0c0c0c] px-3 py-2 text-center text-[12px] font-medium break-all select-all">
                    {pending.secret.match(/.{1,4}/g)?.join(" ")}
                  </p>
                </div>
              </div>

              <Input
                inputMode="numeric"
                value={totpCode}
                onChange={(e) =>
                  setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
                aria-label="Authenticator code"
                maxLength={6}
                className="mt-3 h-11 border-border bg-[#0c0c0c] text-center text-[16px] font-semibold tracking-[0.5em] focus-visible:ring-primary/30"
              />

              {twoFaError && (
                <p className="mt-2 text-[11px] text-destructive">
                  {twoFaError}
                </p>
              )}

              <div className="mt-3 flex gap-2.5">
                <Button
                  className="h-10 flex-1 rounded-xl"
                  disabled={twoFaBusy || totpCode.length !== 6}
                  onClick={() => void confirmTwoFaSetup()}
                >
                  {twoFaBusy ? "Verifying…" : "Turn on"}
                </Button>
                <Button
                  variant="secondary"
                  className="h-10 flex-1 rounded-xl border border-border"
                  onClick={cancelTwoFaSetup}
                  disabled={twoFaBusy}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {twoFa?.enabled && !pending && (
            <div className="border-t border-border/70 px-4 py-4">
              <p className="text-[11px] text-muted-foreground">
                Turn it off by entering a current code from the app:
              </p>
              <Input
                inputMode="numeric"
                value={offCode}
                onChange={(e) =>
                  setOffCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
                aria-label="Authenticator code to turn off"
                maxLength={6}
                className="mt-3 h-11 border-border bg-[#0c0c0c] text-center text-[16px] font-semibold tracking-[0.5em] focus-visible:ring-primary/30"
              />

              {twoFaError && (
                <p className="mt-2 text-[11px] text-destructive">
                  {twoFaError}
                </p>
              )}
              {twoFaNotice && (
                <p className="mt-2 text-[11px] text-primary">{twoFaNotice}</p>
              )}

              <Button
                variant="secondary"
                className="mt-3 h-10 w-full rounded-xl border border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={twoFaBusy || offCode.length !== 6}
                onClick={() => void removeTwoFa()}
              >
                Turn off two-factor
              </Button>
            </div>
          )}
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

      {/* Account */}
      <section>
        <SectionLabel>Account</SectionLabel>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-card px-4 py-4">
          <div>
            <p className="text-[13px] font-medium">Delete Account</p>
            <p className="text-[10px] text-muted-foreground">
              Permanently removes your profile, photo, sign-in methods and all
              training data
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => setConfirm("delete")}
          >
            <UserX className="size-3.5" />
            Delete
          </Button>
        </div>
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
              {CONFIRMS[confirm].title}
            </h3>
            <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
              {CONFIRMS[confirm].body}
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
                {busy ? "Working…" : CONFIRMS[confirm].cta}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
