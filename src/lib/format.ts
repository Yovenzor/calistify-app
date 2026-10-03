/** Formatting helpers shared across the app. */

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatRestClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** Weight display respecting the user's unit. */
export function formatWeight(kg: number, unit: "kg" | "lb"): string {
  if (unit === "lb") return `${Math.round(kg * 2.20462)} lb`;
  return `${Math.round(kg)} kg`;
}

export function formatVolume(kg: number, unit: "kg" | "lb"): string {
  if (unit === "lb") return `${formatNumber(kg * 2.20462)} lb`;
  return `${formatNumber(kg)} kg`;
}

export function toDisplayWeight(kg: number, unit: "kg" | "lb"): number {
  return unit === "lb" ? Math.round(kg * 2.20462 * 10) / 10 : Math.round(kg * 10) / 10;
}

export function fromDisplayWeight(value: number, unit: "kg" | "lb"): number {
  return unit === "lb" ? Math.round((value / 2.20462) * 100) / 100 : Math.round(value * 100) / 100;
}

export function greetingForHour(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function dateKey(d: Date | number): string {
  const x = typeof d === "number" ? new Date(d) : d;
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatRelativeDay(ts: number): string {
  const today = startOfDay(new Date()).getTime();
  const target = startOfDay(new Date(ts)).getTime();
  const diff = Math.round((today - target) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatFullDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function weekStart(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun
  const diff = day === 0 ? 6 : day - 1; // Monday-start week
  x.setDate(x.getDate() - diff);
  return x;
}
