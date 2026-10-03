import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ── Session types ─────────────────────────────────────────────────────── */

export interface SessionSet {
  id: string;
  /** additional load on top of bodyweight (kg) when isBodyweight */
  weightKg: number;
  reps: number;
  durationSec?: number;
  rpe?: number;
  isBodyweight: boolean;
  completed: boolean;
}

export interface SessionExercise {
  instanceId: string;
  exerciseId: string;
  notes?: string;
  sets: SessionSet[];
}

export interface ActiveWorkout {
  name: string;
  startedAt: number;
  paused: boolean;
  pausedAt: number | null;
  pausedTotalMs: number;
  exercises: SessionExercise[];
}

const STORAGE_KEY = "calistify-active-workout-v1";

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function loadStored(): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveWorkout;
    if (!parsed || typeof parsed.startedAt !== "number") return null;
    if (!Array.isArray(parsed.exercises)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* ── Context ───────────────────────────────────────────────────────────── */

interface SessionContextValue {
  workout: ActiveWorkout | null;
  /** ms elapsed on the workout timer (excludes paused time) */
  elapsedMs: number;
  restEndsAt: number | null;
  restDurationSec: number;

  startWorkout: (name: string, exercises: SessionExercise[]) => void;
  resumeWorkout: () => void;
  setWorkoutName: (name: string) => void;
  pauseToggle: () => void;
  discardWorkout: () => void;
  clearWorkout: () => void;

  addExercise: (exerciseId: string) => void;
  removeExercise: (instanceId: string) => void;
  addSet: (instanceId: string) => void;
  removeSet: (instanceId: string, setId: string) => void;
  updateSet: (
    instanceId: string,
    setId: string,
    patch: Partial<SessionSet>,
  ) => void;
  completeSet: (instanceId: string, setId: string) => void;
  setExerciseNotes: (instanceId: string, notes: string) => void;

  startRest: (seconds?: number) => void;
  adjustRest: (deltaSeconds: number) => void;
  skipRest: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function ActiveWorkoutProvider({ children }: { children: ReactNode }) {
  const profile = useQuery(api.profiles.get);
  const [workout, setWorkout] = useState<ActiveWorkout | null>(() =>
    typeof window === "undefined" ? null : loadStored(),
  );
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const restTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const restDurationSec = profile?.restDurationSec ?? 90;

  /* persist session */
  useEffect(() => {
    if (workout) localStorage.setItem(STORAGE_KEY, JSON.stringify(workout));
    else localStorage.removeItem(STORAGE_KEY);
  }, [workout]);

  /* wall clock tick for rest countdown completion */
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const beep = useCallback(() => {
    if (!profile?.timerSound) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      osc.onended = () => void ctx.close();
    } catch {
      /* audio unavailable — ignore */
    }
  }, [profile?.timerSound]);

  const clearRest = useCallback(() => {
    if (restTimeout.current) clearTimeout(restTimeout.current);
    restTimeout.current = null;
    setRestEndsAt(null);
  }, []);

  const startRest = useCallback(
    (seconds?: number) => {
      const dur = seconds ?? restDurationSec;
      if (dur <= 0) return;
      if (restTimeout.current) clearTimeout(restTimeout.current);
      const ends = Date.now() + dur * 1000;
      setRestEndsAt(ends);
      restTimeout.current = setTimeout(() => {
        beep();
        setRestEndsAt(null);
        restTimeout.current = null;
      }, dur * 1000);
    },
    [restDurationSec, beep],
  );

  const adjustRest = useCallback(
    (delta: number) => {
      setRestEndsAt((current) => {
        if (current === null) {
          const dur = Math.max(0, restDurationSec + delta);
          if (dur > 0) startRest(dur);
          return current;
        }
        const next = Math.max(Date.now(), current + delta * 1000);
        if (restTimeout.current) clearTimeout(restTimeout.current);
        if (next <= Date.now()) {
          restTimeout.current = null;
          beep();
          return null;
        }
        restTimeout.current = setTimeout(() => {
          beep();
          setRestEndsAt(null);
          restTimeout.current = null;
        }, next - Date.now());
        return next;
      });
    },
    [startRest, restDurationSec, beep],
  );

  const skipRest = useCallback(() => clearRest(), [clearRest]);

  useEffect(() => {
    return () => {
      if (restTimeout.current) clearTimeout(restTimeout.current);
    };
  }, []);

  /* ── workout mutations ── */

  const startWorkout = useCallback(
    (name: string, exercises: SessionExercise[]) => {
      clearRest();
      setWorkout({
        name: name.trim() || "Workout",
        startedAt: Date.now(),
        paused: false,
        pausedAt: null,
        pausedTotalMs: 0,
        exercises,
      });
    },
    [clearRest],
  );

  const patchWorkout = useCallback(
    (fn: (w: ActiveWorkout) => ActiveWorkout) => {
      setWorkout((w) => (w ? fn(w) : w));
    },
    [],
  );

  const pauseToggle = useCallback(() => {
    patchWorkout((w) => {
      if (!w.paused) {
        return { ...w, paused: true, pausedAt: Date.now() };
      }
      const pausedTotalMs =
        w.pausedTotalMs + (w.pausedAt ? Date.now() - w.pausedAt : 0);
      return { ...w, paused: false, pausedAt: null, pausedTotalMs };
    });
  }, [patchWorkout]);

  const elapsedMs = useMemo(() => {
    if (!workout) return 0;
    const end = workout.paused && workout.pausedAt ? workout.pausedAt : Date.now();
    return Math.max(0, end - workout.startedAt - workout.pausedTotalMs);
  }, [workout, workout?.paused, workout?.pausedAt, workout?.pausedTotalMs]);

  const addExercise = useCallback(
    (exerciseId: string) => {
      patchWorkout((w) => ({
        ...w,
        exercises: [
          ...w.exercises,
          {
            instanceId: uid(),
            exerciseId,
            sets: [
              {
                id: uid(),
                weightKg: 0,
                reps: 0,
                isBodyweight: true,
                completed: false,
              },
            ],
          },
        ],
      }));
    },
    [patchWorkout],
  );

  const removeExercise = useCallback(
    (instanceId: string) => {
      patchWorkout((w) => ({
        ...w,
        exercises: w.exercises.filter((e) => e.instanceId !== instanceId),
      }));
    },
    [patchWorkout],
  );

  const addSet = useCallback(
    (instanceId: string) => {
      patchWorkout((w) => ({
        ...w,
        exercises: w.exercises.map((e) => {
          if (e.instanceId !== instanceId) return e;
          const last = e.sets[e.sets.length - 1];
          return {
            ...e,
            sets: [
              ...e.sets,
              {
                id: uid(),
                weightKg: last?.weightKg ?? 0,
                reps: last?.reps ?? 0,
                durationSec: last?.durationSec,
                isBodyweight: last?.isBodyweight ?? true,
                completed: false,
              },
            ],
          };
        }),
      }));
    },
    [patchWorkout],
  );

  const removeSet = useCallback(
    (instanceId: string, setId: string) => {
      patchWorkout((w) => ({
        ...w,
        exercises: w.exercises.map((e) =>
          e.instanceId === instanceId
            ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
            : e,
        ),
      }));
    },
    [patchWorkout],
  );

  const updateSet = useCallback(
    (instanceId: string, setId: string, patch: Partial<SessionSet>) => {
      patchWorkout((w) => ({
        ...w,
        exercises: w.exercises.map((e) =>
          e.instanceId === instanceId
            ? {
                ...e,
                sets: e.sets.map((s) =>
                  s.id === setId ? { ...s, ...patch } : s,
                ),
              }
            : e,
        ),
      }));
    },
    [patchWorkout],
  );

  const completeSet = useCallback(
    (instanceId: string, setId: string) => {
      let becameComplete = false;
      patchWorkout((w) => ({
        ...w,
        exercises: w.exercises.map((e) => {
          if (e.instanceId !== instanceId) return e;
          return {
            ...e,
            sets: e.sets.map((s) => {
              if (s.id !== setId) return s;
              becameComplete = !s.completed;
              return { ...s, completed: !s.completed };
            }),
          };
        }),
      }));
      if (becameComplete && profile?.autoStartRest !== false) startRest();
    },
    [patchWorkout, profile?.autoStartRest, startRest],
  );

  const setExerciseNotes = useCallback(
    (instanceId: string, notes: string) => {
      patchWorkout((w) => ({
        ...w,
        exercises: w.exercises.map((e) =>
          e.instanceId === instanceId ? { ...e, notes } : e,
        ),
      }));
    },
    [patchWorkout],
  );

  const setWorkoutName = useCallback(
    (name: string) => patchWorkout((w) => ({ ...w, name })),
    [patchWorkout],
  );

  const discardWorkout = useCallback(() => {
    clearRest();
    setWorkout(null);
  }, [clearRest]);

  const value: SessionContextValue = {
    workout,
    elapsedMs,
    restEndsAt,
    restDurationSec,
    startWorkout,
    resumeWorkout: () => {},
    setWorkoutName,
    pauseToggle,
    discardWorkout,
    clearWorkout: () => setWorkout(null),
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    updateSet,
    completeSet,
    setExerciseNotes,
    startRest,
    adjustRest,
    skipRest,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within ActiveWorkoutProvider");
  return ctx;
}
