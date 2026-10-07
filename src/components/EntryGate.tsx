import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Entry ceremony — played at the exact moment the athlete submits their
 * name, and on every entry into the app. A black airlock seals with a
 * charged lime seam, a gauge counts 1→10 REPS while its arc and tick
 * marks close the ring, the completed ring pulses a shockwave, the
 * numeral gives way to the wordmark inside the ring — then the airlock
 * splits open at the seam onto the dashboard. Self-removes ≈2.5s.
 */

const COUNT_START = 180;
const COUNT_STEP = 110;
const COUNT_MAX = 10;
/** Must exceed the airlock open (1860+440) and scene fade (1840+360).
 *  These milestones are declared in index.css — keep them in sync. */
const UNMOUNT_MS = 2460;
const REDUCED_MS = 640;

export function EntryGate() {
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [show, setShow] = useState(true);
  const [count, setCount] = useState(1);

  // Unmount once the airlock has opened (pointer-events stay off the whole
  // time, so the app underneath is never blocked, even if this lags).
  useEffect(() => {
    const timer = setTimeout(
      () => setShow(false),
      reducedMotion ? REDUCED_MS : UNMOUNT_MS,
    );
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  // The rep count: starts after the airlock seals, ticks up to COUNT_MAX,
  // then holds (the updater clamps, the cleanup stops the interval).
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        setCount((c) => Math.min(c + 1, COUNT_MAX));
      }, COUNT_STEP);
    }, COUNT_START);
    return () => {
      clearTimeout(start);
      if (interval !== undefined) clearInterval(interval);
    };
  }, []);

  if (!show) return null;

  // Reduced motion: keep the ceremony to a quiet veil + wordmark crossfade.
  if (reducedMotion) {
    return createPortal(
      <div
        className="pointer-events-none fixed inset-0 z-[90] overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 bg-background"
          style={{
            animation:
              "gate-veil 200ms ease-out both, gate-veil-out 300ms ease-in 320ms forwards",
          }}
        />
        <div className="absolute inset-x-0 top-[15%] flex justify-center">
          <img
            src="/assets/logo-transparent.png"
            alt=""
            className="h-8 w-auto"
          />
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[90] overflow-hidden"
      aria-hidden="true"
    >
      {/* The airlock: two doors that seal shut, then split open at the end */}
      <div className="gate-doors absolute inset-0">
        <div className="gate-door-up absolute inset-x-0 top-0 h-1/2 bg-background">
          <span
            className="gate-seam absolute inset-x-0 bottom-0 block h-[2px] bg-primary"
            style={{ boxShadow: "0 0 16px 2px rgba(182,255,0,0.6)" }}
          />
        </div>
        <div className="gate-door-down absolute inset-x-0 bottom-0 h-1/2 bg-background">
          <span
            className="gate-seam absolute inset-x-0 top-0 block h-[2px] bg-primary"
            style={{ boxShadow: "0 0 16px 2px rgba(182,255,0,0.6)" }}
          />
        </div>
      </div>

      {/* The gauge scene: ring, ticks, count, wordmark */}
      <div className="gate-scene absolute inset-0 flex flex-col items-center justify-center">
        <div className="relative size-[200px]">
          <svg
            className="absolute inset-0 size-full"
            viewBox="0 0 200 200"
            aria-hidden="true"
          >
            <circle
              cx="100"
              cy="100"
              r="78"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="6"
            />
            <circle
              cx="100"
              cy="100"
              r="78"
              fill="none"
              stroke="#b6ff00"
              strokeWidth="6"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset={100 - count * 10}
              transform="rotate(-90 100 100)"
              style={{
                transition: `stroke-dashoffset ${COUNT_STEP}ms linear`,
                filter: "drop-shadow(0 0 6px rgba(182,255,0,0.55))",
              }}
            />
          </svg>

          {/* Ten tick marks around the ring, one lighting per rep */}
          {Array.from({ length: COUNT_MAX }, (_, i) => (
            <span
              key={i}
              className="absolute top-1/2 left-1/2 block h-2 w-[3px] rounded-full bg-primary"
              style={{
                transform: `translate(-50%, -50%) rotate(${i * 36}deg) translateY(-96px)`,
                opacity: count >= i + 1 ? 1 : 0.28,
                transition: "opacity 160ms ease-out",
              }}
            />
          ))}

          {/* The count: punches once per rep, then hands over to the mark */}
          <div className="gate-count absolute inset-0 flex flex-col items-center justify-center">
            <span
              key={count}
              className="count-pop num text-[60px] leading-none font-extrabold text-primary"
            >
              {count}
            </span>
            <span className="mt-1.5 text-[10px] font-semibold tracking-[0.28em] text-muted-foreground uppercase">
              Reps
            </span>
          </div>

          {/* Wordmark settles inside the completed ring */}
          <div className="gate-logo absolute inset-0 flex flex-col items-center justify-center">
            <img
              src="/assets/logo-transparent.png"
              alt=""
              className="h-8 w-auto"
            />
            <span className="gate-rule mt-2.5 h-[3px] w-14 rounded-full bg-primary" />
          </div>

          {/* Shockwave when the ring completes on the tenth rep */}
          <div className="gate-shock absolute top-1/2 left-1/2 size-40 rounded-full border-2 border-primary/70" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
