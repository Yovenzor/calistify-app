import { Dumbbell, House, ListChecks, TrendingUp, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Entry ceremony — played at the exact moment the athlete submits their
 * name. A veil swallows the screen, then four navigation pills rise out of
 * the depth and settle into a floating, isometric stack (the product's own
 * pill nav shot like a layered mockup), a sheen sweeps across the stack
 * while the wordmark powers on, and finally the stack rotates flat and
 * flies through the camera as a lime burst opens onto the dashboard.
 * Self-removes after ≈2.3s.
 */

const ENTER_AT = 240;
const STAGGER = 130;
const SHEEN_AT = 1000;
const SHEEN_STAGGER = 110;
const EXIT_AT = 1520;
const OPEN_MS = 640;
/** Total length — must stay in sync with the .gate-stage / .gate-fade
 *  durations declared in index.css. */
const GATE_MS = EXIT_AT + OPEN_MS;
const UNMOUNT_MS = GATE_MS + 160;

/** Back-to-front layers of the stack. `y` / `z` offset each pill inside the
 *  tilted stage plane so they fan out diagonally with real depth, exactly
 *  like stacked nav bars floating over a surface. */
const LAYERS = [
  { kind: "ghost", y: -114, z: 0 },
  { kind: "mid", y: -38, z: 26 },
  { kind: "lime", y: 38, z: 52 },
  { kind: "hero", y: 114, z: 78 },
] as const;

type LayerKind = (typeof LAYERS)[number]["kind"];

const SHEEN_BG =
  "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)";

function Pill({ kind, sheenDelay }: { kind: LayerKind; sheenDelay: number }) {
  const sheen = (
    <span
      className="gate-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3"
      style={{ background: SHEEN_BG, animationDelay: `${sheenDelay}ms` }}
    />
  );

  // Front pill: the real nav, with the active Home item expanded.
  if (kind === "hero") {
    return (
      <div className="relative flex h-14 w-[300px] items-center justify-between overflow-hidden rounded-full border border-white/10 bg-[#0a0a0a] px-1.5 shadow-[0_36px_70px_-24px_rgba(0,0,0,0.95),0_14px_30px_-16px_rgba(0,0,0,0.9)]">
        <span className="flex h-11 items-center gap-1 rounded-full bg-primary pr-3.5 pl-1 text-[#061400]">
          <span className="flex size-9 items-center justify-center">
            <House className="size-5" strokeWidth={2.4} />
          </span>
          <span className="text-[12px] font-extrabold">Home</span>
        </span>
        <span className="flex size-11 items-center justify-center text-[#4b4b4b]">
          <Dumbbell className="size-5" strokeWidth={2} />
        </span>
        <span className="flex size-11 items-center justify-center text-[#4b4b4b]">
          <ListChecks className="size-5" strokeWidth={2} />
        </span>
        <span className="flex size-11 items-center justify-center text-[#4b4b4b]">
          <TrendingUp className="size-5" strokeWidth={2} />
        </span>
        <span className="flex size-11 items-center justify-center text-[#4b4b4b]">
          <Trophy className="size-5" strokeWidth={2} />
        </span>
        {sheen}
      </div>
    );
  }

  const isLime = kind === "lime";
  const dot = isLime ? "bg-[#061400]/30" : "bg-white/[0.06]";
  const active = isLime
    ? "bg-[#061400]/40"
    : kind === "mid"
      ? "bg-primary/60"
      : "bg-white/[0.05]";
  const shell = isLime
    ? "border-primary bg-primary shadow-[0_30px_60px_-18px_rgba(182,255,0,0.35),0_14px_30px_-16px_rgba(0,0,0,0.9)]"
    : "border-white/[0.07] bg-[#0c0c0c] shadow-[0_34px_64px_-22px_rgba(0,0,0,0.95),0_12px_26px_-14px_rgba(0,0,0,0.9)]";

  // Layers behind the hero: soft mockup shapes, no real copy — depth only.
  return (
    <div
      className={`relative flex h-14 w-[300px] items-center justify-between overflow-hidden rounded-full border px-4 ${shell}`}
    >
      <span className={`h-8 w-16 rounded-full ${active}`} />
      <span className={`size-5 rounded-full ${dot}`} />
      <span
        className={`size-5 rounded-full ${kind === "mid" ? "bg-primary/60" : dot}`}
      />
      <span className={`size-5 rounded-full ${dot}`} />
      <span className={`size-5 rounded-full ${dot}`} />
      {sheen}
    </div>
  );
}

export function EntryGate() {
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [show, setShow] = useState(true);

  // Unmount once the stack has flown through (pointer-events stay off the
  // whole time, so the app underneath is never blocked, even if this lags).
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
      {/* Dark veil so the app is swallowed before the stack arrives */}
      <div
        className="absolute inset-0 bg-background"
        style={{
          animation:
            "gate-veil 300ms ease-out both, gate-veil-out 640ms ease-in 1520ms forwards",
        }}
      />

      {/* Group opacity sits above the perspective chain so the 3D stacking
          is never flattened while the scene fades in and out */}
      <div className="gate-fade absolute inset-0">
        <div className="absolute inset-0" style={{ perspective: "1200px" }}>
          <div
            className="gate-stage absolute inset-0"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Lime light pooling under the floating stack */}
            <div
              className="absolute left-1/2 top-1/2 size-[460px] rounded-full"
              style={{
                transform: "translate(-50%, -50%) translateZ(-70px)",
                background:
                  "radial-gradient(circle, rgba(182,255,0,0.14), transparent 65%)",
              }}
            />

            {LAYERS.map((layer, i) => (
              <div
                key={layer.kind}
                className="absolute left-1/2 top-1/2"
                style={{
                  transform: `translate(-50%, -50%) translateY(${layer.y}px) translateZ(${layer.z}px)`,
                  transformStyle: "preserve-3d",
                }}
              >
                <div
                  className="gate-float"
                  style={{ animationDelay: `${ENTER_AT + i * STAGGER}ms` }}
                >
                  <Pill
                    kind={layer.kind}
                    sheenDelay={SHEEN_AT + i * SHEEN_STAGGER}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lime burst marking the moment the stack passes through the camera */}
      <div
        className="gate-burst absolute left-1/2 top-1/2 size-52 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(182,255,0,0.5), rgba(182,255,0,0) 70%)",
          border: "1px solid rgba(182,255,0,0.6)",
        }}
      />

      {/* Wordmark powering on above the stack during the hold */}
      <div className="gate-mark absolute inset-x-0 top-[15%] flex justify-center">
        <img src="/assets/logo-transparent.png" alt="" className="h-8 w-auto" />
      </div>
    </div>,
    document.body,
  );
}
