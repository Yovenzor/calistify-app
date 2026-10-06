import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Entry gate — played at the exact moment the athlete submits their name
 * and is about to enter the app. Nine hidden slats wipe in from the left
 * (staggered, almost together), the lime seams glow while a scan line
 * sweeps and the wordmark appears, then the slats slide out to the right —
 * an opening onto the dashboard behind. Self-removes after ≈1.8s.
 */
const SLATS = 9;
const IN_MS = 380;
const IN_STAGGER = 35;
const OUT_BASE = 820;
const OUT_STAGGER = 45;
const OUT_MS = 480;
const GATE_MS = OUT_BASE + (SLATS - 1) * OUT_STAGGER + OUT_MS;

export function EntryGate() {
  const [show, setShow] = useState(true);

  // Unmount once the gate has fully opened (pointer-events stay off the
  // whole time, so the app underneath is never blocked, even if this lags).
  useEffect(() => {
    const timer = setTimeout(() => setShow(false), GATE_MS + 140);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[90] overflow-hidden"
      aria-hidden="true"
    >
      {/* Dark veil so the app is swallowed while the slats arrive */}
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
    </div>,
    document.body,
  );
}
