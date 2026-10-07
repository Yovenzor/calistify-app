import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Entry ceremony — played at the exact moment the athlete submits their
 * name. Three coach-command words (PUSH. PULL. PROGRESS.) roll through a
 * mask beat by beat while dots light up under them, then the wordmark
 * rolls in and the whole composition pushes through the camera behind a
 * lime flash as the veil dissolves onto the dashboard. Self-removes ≈2.4s.
 */

/** Each beat: a word and the ms at which it starts rolling. */
const BEATS = [
  { word: "PUSH.", at: 120 },
  { word: "PULL.", at: 560 },
  { word: "PROGRESS.", at: 1000 },
] as const;
const WORD_IN_MS = 300;
const WORD_OUT_AT = 380; // delay offset from the beat
const WORD_OUT_MS = 260;
/** Totals below must stay in sync with index.css (outro/veil at 1840ms). */
const OUTRO_AT = 1840;
const OUTRO_MS = 420;
const UNMOUNT_MS = OUTRO_AT + OUTRO_MS + 160;

export function EntryGate() {
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [show, setShow] = useState(true);

  // Unmount once the composition has pushed through (pointer-events stay
  // off the whole time, so the app underneath is never blocked).
  useEffect(() => {
    const timer = setTimeout(
      () => setShow(false),
      reducedMotion ? 640 : UNMOUNT_MS,
    );
    return () => clearTimeout(timer);
  }, [reducedMotion]);

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
      {/* Dark veil so the app is swallowed before the beats arrive */}
      <div
        className="absolute inset-0 bg-background"
        style={{
          animation:
            "gate-veil 260ms ease-out both, gate-veil-out 420ms ease-in 1840ms forwards",
        }}
      />

      {/* Everything that pushes through the camera together at the end */}
      <div className="gate-outro absolute inset-0 flex flex-col items-center justify-center">
        {/* Lime light gathering behind the wordmark */}
        <div className="gate-glow absolute top-1/2 left-1/2 size-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(182,255,0,0.13),transparent_65%)]" />

        {/* Shockwave ring as the mark lands */}
        <div className="gate-ring absolute top-1/2 left-1/2 size-40 rounded-full border border-primary/40" />

        {/* Masked stage: words and wordmark roll through the same slot */}
        <div className="relative h-[76px] w-full overflow-hidden">
          {BEATS.map(({ word, at }, i) => (
            <div
              key={word}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                animation: `word-in ${WORD_IN_MS}ms cubic-bezier(0.22, 1, 0.36, 1) ${at}ms both, word-out ${WORD_OUT_MS}ms cubic-bezier(0.65, 0, 0.35, 1) ${at + WORD_OUT_AT}ms forwards`,
              }}
            >
              <span
                className={`text-[46px] leading-none font-extrabold tracking-[-0.03em] uppercase ${
                  i === BEATS.length - 1 ? "text-primary" : "text-foreground"
                }`}
              >
                {word}
              </span>
            </div>
          ))}

          {/* Wordmark rolls in on the last beat and pushes through camera */}
          <div className="gate-mark absolute inset-0 flex flex-col items-center justify-center">
            <img
              src="/assets/logo-transparent.png"
              alt=""
              className="h-8 w-auto"
            />
            <span className="gate-rule mt-2.5 h-[3px] w-14 origin-left rounded-full bg-primary" />
          </div>
        </div>

        {/* Beat dots — one lights per word */}
        <div className="mt-7 flex gap-2">
          {BEATS.map(({ word, at }) => (
            <span
              key={word}
              className="size-1.5 rounded-full bg-primary/25"
              style={{
                animation: `dot-on 240ms cubic-bezier(0.22, 1, 0.36, 1) ${at}ms both`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Lime flash at the moment of the push-through */}
      <div className="gate-flash absolute inset-0 bg-primary" />
    </div>,
    document.body,
  );
}
