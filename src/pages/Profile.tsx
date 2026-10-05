import { api } from "@/convex/_generated/api";
import { SectionLabel } from "@/components/AppUI";
import { PhotoEditor } from "@/components/PhotoEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAthlete } from "@/hooks/use-athlete";
import {
  formatDuration,
  formatNumber,
  formatVolume,
  fromDisplayWeight,
  toDisplayWeight,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Dumbbell,
  LogOut,
  Ruler,
  Settings,
  Trophy,
  User,
} from "lucide-react";
import { useMutation } from "convex/react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";

/** Athlete profile: identity, key stats, editor and links. */
export default function Profile() {
  const athlete = useAthlete();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const update = useMutation(api.profiles.update);
  const uploadUrl = useMutation(api.profiles.generateUploadUrl);

  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<{
    name: string;
    weight: string;
    unit: "kg" | "lb";
    weeklyGoal: string;
  } | null>(null);

  const profile = athlete.profile;
  if (!profile) return null;

  const unit = profile.weightUnit;
  const initials = (profile.name || "A")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const openEditor = () => {
    setForm({
      name: profile.name,
      weight: profile.bodyweightKg
        ? String(toDisplayWeight(profile.bodyweightKg, unit))
        : "",
      unit,
      weeklyGoal: String(profile.weeklyGoal),
    });
    setEditing(true);
  };

  const save = async () => {
    if (!form) return;
    setBusy(true);
    try {
      const weightVal = parseFloat(form.weight);
      await update({
        name: form.name,
        weightUnit: form.unit,
        weeklyGoal: Math.max(0, parseInt(form.weeklyGoal, 10) || 0),
        ...(Number.isFinite(weightVal) && weightVal > 0
          ? {
              bodyweightKg: fromDisplayWeight(weightVal, form.unit),
              day: new Date().toLocaleDateString("en-CA"),
            }
          : {}),
      });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const onPhoto = async (file: Blob) => {
    setBusy(true);
    try {
      const url = await uploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      const { storageId } = (await res.json()) as { storageId: string };
      await update({ imageStorageId: storageId as never });
    } catch (err) {
      console.error("Photo upload failed", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:border-primary/30"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="text-[22px] font-bold tracking-tight">Profile</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate("/app/settings")}
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:border-primary/30"
          aria-label="Settings"
        >
          <Settings className="size-4 text-muted-foreground" />
        </button>
      </div>

      {/* Identity */}
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-5 py-7">
        <div className="relative">
          <Avatar className="size-24 border-2 border-primary/40">
            <AvatarImage
              src={profile.imageUrl ?? undefined}
              alt={profile.name}
            />
            <AvatarFallback className="bg-secondary text-2xl font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full border border-border bg-primary text-primary-foreground shadow-[0_4px_14px_-6px_rgba(182,255,0,0.6)] transition-transform active:scale-90"
            aria-label="Change photo"
            disabled={busy}
          >
            <Camera className="size-3.5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setCropFile(f);
              e.target.value = "";
            }}
          />
        </div>

        <p className="mt-4 text-[22px] font-bold tracking-tight">
          {profile.name}
        </p>
        <p className="text-[11px] tracking-[0.16em] text-primary uppercase">
          Athlete
        </p>

        <div className="mt-5 grid w-full grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-secondary py-3">
            <p className="num text-[17px] font-bold">{athlete.streak}</p>
            <p className="text-[9px] tracking-[0.06em] text-muted-foreground uppercase">
              Streak
            </p>
          </div>
          <div className="rounded-xl bg-secondary py-3">
            <p className="num text-[17px] font-bold">
              {athlete.totals.totalWorkouts}
            </p>
            <p className="text-[9px] tracking-[0.06em] text-muted-foreground uppercase">
              Workouts
            </p>
          </div>
          <div className="rounded-xl bg-secondary py-3">
            <p className="num text-[17px] font-bold">
              {athlete.records.length}
            </p>
            <p className="text-[9px] tracking-[0.06em] text-muted-foreground uppercase">
              PRs
            </p>
          </div>
        </div>

        <Button
          onClick={openEditor}
          className="mt-5 h-11 w-full rounded-xl font-semibold"
        >
          Edit Profile
        </Button>
      </div>

      {/* Overview stats */}
      <div>
        <SectionLabel>Overview</SectionLabel>
        <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border bg-card">
          <Row
            icon={Ruler}
            label="Bodyweight"
            value={
              profile.bodyweightKg
                ? `${toDisplayWeight(profile.bodyweightKg, unit)} ${unit}`
                : "Not set"
            }
          />
          <Row
            icon={Dumbbell}
            label="Weekly goal"
            value={`${profile.weeklyGoal} workouts / week`}
          />
          <Row
            icon={Trophy}
            label="Total volume"
            value={formatVolume(athlete.totals.totalVolume, unit)}
          />
          <Row
            icon={User}
            label="Total training time"
            value={formatDuration(athlete.totals.totalDurationSec)}
          />
          <Row
            icon={Trophy}
            label="Total records"
            value={formatNumber(athlete.records.length)}
          />
          <Row
            icon={Dumbbell}
            label="Total reps"
            value={formatNumber(athlete.totals.totalReps)}
          />
        </div>
      </div>

      {/* Links */}
      <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border bg-card">
        <LinkRow to="/app/skills" label="Skills" />
        <LinkRow to="/app/records" label="Personal Records" />
        <LinkRow to="/app/settings" label="Settings" />
        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[14px] text-destructive transition-colors hover:bg-destructive/5"
        >
          <span className="flex items-center gap-2.5">
            <LogOut className="size-4" />
            Sign out
          </span>
        </button>
      </div>

      {/* Editor sheet */}
      {editing &&
        form &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setEditing(false)}
            />
            <div className="rise-in relative max-h-[92dvh] w-full max-w-[440px] overflow-y-auto rounded-t-3xl border border-border bg-[#0a0a0a] px-5 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
              <h2 className="text-[18px] font-bold">Edit Profile</h2>

              <div className="mt-5 space-y-4">
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-11 border-border bg-[#0c0c0c] focus-visible:ring-primary/30"
                    maxLength={40}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Bodyweight</FieldLabel>
                    <Input
                      value={form.weight}
                      onChange={(e) =>
                        setForm({ ...form, weight: e.target.value })
                      }
                      inputMode="decimal"
                      placeholder={form.unit === "kg" ? "72" : "159"}
                      className="h-11 border-border bg-[#0c0c0c] focus-visible:ring-primary/30"
                    />
                  </div>
                  <div>
                    <FieldLabel>Unit</FieldLabel>
                    <div className="flex rounded-xl border border-border bg-secondary p-1">
                      {(["kg", "lb"] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setForm({ ...form, unit: u })}
                          className={cn(
                            "flex-1 rounded-lg py-1.5 text-[12px] font-semibold uppercase transition-all",
                            form.unit === u
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <FieldLabel>Weekly workout goal</FieldLabel>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          weeklyGoal: String(
                            Math.max(
                              0,
                              (parseInt(form.weeklyGoal, 10) || 0) - 1,
                            ),
                          ),
                        })
                      }
                      className="h-11 w-11 rounded-xl border border-border bg-secondary text-lg font-bold"
                    >
                      −
                    </button>
                    <div className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border bg-[#0c0c0c]">
                      <span className="num text-[15px] font-bold">
                        {form.weeklyGoal || "0"}
                      </span>
                      <span className="ml-1.5 text-[12px] text-muted-foreground">
                        per week
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          weeklyGoal: String(
                            Math.min(
                              14,
                              (parseInt(form.weeklyGoal, 10) || 0) + 1,
                            ),
                          ),
                        })
                      }
                      className="h-11 w-11 rounded-xl border border-border bg-secondary text-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <p className="text-[11px] leading-4 text-muted-foreground">
                  Changing your bodyweight adds today to your weight history —
                  past workout volumes stay accurate.
                </p>

                <div className="flex gap-3 pt-1">
                  <Button
                    variant="secondary"
                    className="h-12 flex-1 rounded-xl border border-border"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="h-12 flex-1 rounded-xl font-semibold"
                    onClick={save}
                    disabled={busy}
                  >
                    {busy ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {cropFile && (
        <PhotoEditor
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onDone={async (blob) => {
            setCropFile(null);
            await onPhoto(blob);
          }}
        />
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
      {children}
    </span>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ruler;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </span>
      <span className="num text-[13px] font-semibold">{value}</span>
    </div>
  );
}

function LinkRow({ to, label }: { to: string; label: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[14px] transition-colors hover:bg-accent/50"
    >
      {label}
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  );
}
