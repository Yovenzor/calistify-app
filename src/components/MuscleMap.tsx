import { MUSCLES, type MuscleGroup } from "@/lib/muscles";
import { useState, type ReactNode } from "react";

interface Activation {
  id: MuscleGroup;
  score: number;
  ratio: number;
}

/** Renders one interactive muscle path; bound to MuscleMap state via props. */
type MusclePath = (id: MuscleGroup, d: string) => ReactNode;

/* ── palette: near-white muscle bellies on pure black, like the render ── */
const LIME: [number, number, number] = [182, 255, 0];
const GRAY: [number, number, number] = [214, 214, 214];
const REST_FILL = "#e9e9e9";
const STATIC_FILL = "#d8d8d8";
const HAIR_FILL = "#4a4a4a";
const GROOVE = "#3d3d3d";

/** Resting muscle is bright anatomical gray; trained muscles blend to lime. */
function mix(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
) {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** Soft airbrushed volume: radial highlight + directional shade over a fill. */
function volume(d: string): ReactNode {
  return (
    <>
      <path d={d} fill="url(#mm-glow)" style={{ pointerEvents: "none" }} />
      <path d={d} fill="url(#mm-shade)" style={{ pointerEvents: "none" }} />
    </>
  );
}

/** Non-interactive anatomical detail (serratus, adductor, hair, hands...). */
function staticPath(d: string, fill = STATIC_FILL, shaded = true): ReactNode {
  return (
    <>
      <path
        d={d}
        fill={fill}
        stroke={GROOVE}
        strokeOpacity={0.4}
        strokeWidth={0.8}
      />
      {shaded && volume(d)}
    </>
  );
}

/** Dark muscle groove / striation line (pointer-transparent). */
function grooveLine(d: string, opacity = 0.5, width = 1): ReactNode {
  return (
    <path
      d={d}
      fill="none"
      stroke={GROOVE}
      strokeOpacity={opacity}
      strokeWidth={width}
      strokeLinecap="round"
      style={{ pointerEvents: "none" }}
    />
  );
}

/** Blurred occlusion shadow — armpits, under-chin, gluteal fold. */
function shadow(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  opacity: number,
): ReactNode {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill="#000000"
      opacity={opacity}
      filter="url(#mm-soft)"
      style={{ pointerEvents: "none" }}
    />
  );
}

/* ── the exact reference render lives in public/ (drop the file in) ────── */
const PLATE_FILES = [
  "muscle-anatomy.png",
  "muscle-anatomy.jpg",
  "muscle-anatomy.jpeg",
  "muscle-anatomy.webp",
];

interface ZoneBlob {
  /** all values are % of the plate: cx/rx of width, cy/ry of height */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot?: number;
}

/**
 * Interactive muscle zones traced over the reference plate: front figure on
 * the left, back figure on the right. Multiple blobs per muscle let one id
 * cover both views (forearms) or both limbs.
 */
const ZONES: Record<MuscleGroup, ZoneBlob[]> = {
  /* front figure */
  neck: [{ cx: 28, cy: 15.5, rx: 4, ry: 2.6 }],
  chest: [
    { cx: 24.2, cy: 26, rx: 5, ry: 4.6 },
    { cx: 31.8, cy: 26, rx: 5, ry: 4.6 },
  ],
  front_delts: [
    { cx: 20, cy: 23, rx: 4, ry: 4.6 },
    { cx: 36, cy: 23, rx: 4, ry: 4.6 },
  ],
  biceps: [
    { cx: 18.3, cy: 33, rx: 2.9, ry: 6.4, rot: -4 },
    { cx: 37.7, cy: 33, rx: 2.9, ry: 6.4, rot: 4 },
  ],
  forearms: [
    { cx: 17.2, cy: 45.5, rx: 2.6, ry: 6, rot: -3 },
    { cx: 38.8, cy: 45.5, rx: 2.6, ry: 6, rot: 3 },
    { cx: 61.2, cy: 45.5, rx: 2.6, ry: 6, rot: 3 },
    { cx: 82.8, cy: 45.5, rx: 2.6, ry: 6, rot: -3 },
  ],
  abs: [{ cx: 28, cy: 38, rx: 3.4, ry: 7.4 }],
  obliques: [
    { cx: 23.4, cy: 40, rx: 2.2, ry: 6 },
    { cx: 32.6, cy: 40, rx: 2.2, ry: 6 },
  ],
  quads: [
    { cx: 21.5, cy: 60.5, rx: 4, ry: 8.6 },
    { cx: 34.5, cy: 60.5, rx: 4, ry: 8.6 },
  ],
  /* back figure */
  traps: [{ cx: 72.5, cy: 19.5, rx: 7.4, ry: 5 }],
  rear_delts: [
    { cx: 64, cy: 23, rx: 4, ry: 4.6 },
    { cx: 81, cy: 23, rx: 4, ry: 4.6 },
  ],
  lats: [
    { cx: 66.8, cy: 32, rx: 3.6, ry: 7.4 },
    { cx: 78.2, cy: 32, rx: 3.6, ry: 7.4 },
  ],
  triceps: [
    { cx: 62.3, cy: 33, rx: 2.9, ry: 6.4, rot: 4 },
    { cx: 81.7, cy: 33, rx: 2.9, ry: 6.4, rot: -4 },
  ],
  lower_back: [{ cx: 72.5, cy: 44.5, rx: 3.4, ry: 4.6 }],
  glutes: [
    { cx: 68, cy: 52.5, rx: 3.7, ry: 4.5 },
    { cx: 77, cy: 52.5, rx: 3.7, ry: 4.5 },
  ],
  hamstrings: [
    { cx: 65.5, cy: 62.5, rx: 3.9, ry: 6.6 },
    { cx: 79.5, cy: 62.5, rx: 3.9, ry: 6.6 },
  ],
  calves: [
    { cx: 65.5, cy: 79, rx: 3.3, ry: 7 },
    { cx: 79.5, cy: 79, rx: 3.3, ry: 7 },
  ],
};

/*
 * Muscle map plate. Renders the exact reference render from public/ with
 * interactive zones layered on top; if the file is not there yet, the drawn
 * SVG study below is used so the card never renders empty. Every catalog
 * muscle stays individually selectable and activation color comes only from
 * real logged sets.
 */
export function MuscleMap({ activation }: { activation: Activation[] }) {
  const [selected, setSelected] = useState<MuscleGroup | null>(null);
  /* plate loading: walk the candidate filenames until one resolves */
  const [plateIdx, setPlateIdx] = useState(0);
  const [plateDims, setPlateDims] = useState<{ w: number; h: number } | null>(
    null,
  );
  const plateFailed = plateIdx >= PLATE_FILES.length;
  const plateSrc = `/${PLATE_FILES[plateIdx] ?? ""}`;
  const byId = new Map(activation.map((a) => [a.id, a]));

  const fillFor = (id: MuscleGroup) => {
    const a = byId.get(id);
    if (!a || a.score <= 0) return REST_FILL;
    const t = 0.55 + 0.45 * Math.min(1, a.ratio);
    return mix(GRAY, LIME, t);
  };

  const mp: MusclePath = (id, d) => {
    const isSel = selected === id;
    return (
      <>
        <path
          d={d}
          fill={fillFor(id)}
          stroke={isSel ? "#b6ff00" : GROOVE}
          strokeOpacity={isSel ? 1 : 0.6}
          strokeWidth={isSel ? 2.2 : 1.2}
          className="cursor-pointer transition-all duration-300"
          onClick={() => setSelected(isSel ? null : id)}
          style={
            isSel
              ? { filter: "drop-shadow(0 0 6px rgba(182,255,0,0.65))" }
              : undefined
          }
        />
        {volume(d)}
      </>
    );
  };

  const selectedMuscle = selected
    ? MUSCLES.find((m) => m.id === selected)
    : null;
  const selectedData = selected ? byId.get(selected) : undefined;
  const trainedCount = activation.filter((a) => a.score > 0).length;

  return (
    <div>
      {plateFailed ? (
        <svg
          viewBox="0 0 440 614"
          className="h-auto w-full"
          role="img"
          aria-label="Front and back muscular anatomy, rendered study"
        >
          <defs>
            {/* limb + torso base: lit from the upper left */}
            <linearGradient id="mm-body" x1="0" y1="0" x2="1" y2="0.3">
              <stop offset="0" stopColor="#d2d2d2" />
              <stop offset="0.45" stopColor="#a8a8a8" />
              <stop offset="1" stopColor="#7f7f7f" />
            </linearGradient>
            <linearGradient id="mm-head" x1="0.2" y1="0" x2="0.8" y2="1">
              <stop offset="0" stopColor="#e6e6e6" />
              <stop offset="1" stopColor="#a4a4a4" />
            </linearGradient>
            {/* directional shade: gentle highlight top-left, shadow bottom-right */}
            <linearGradient id="mm-shade" x1="0.1" y1="0" x2="0.9" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="0.38" stopColor="#ffffff" stopOpacity="0.03" />
              <stop offset="0.66" stopColor="#000000" stopOpacity="0.05" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.24" />
            </linearGradient>
            {/* soft round highlight over every belly — airbrushed volume */}
            <radialGradient id="mm-glow" cx="0.36" cy="0.26" r="0.72">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.32" />
              <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <filter id="mm-soft" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.2" />
            </filter>
          </defs>

          {/* pure black stage like the reference plate */}
          <rect x="0" y="0" width="440" height="614" fill="#000000" />

          {/* ══════════ FRONT FIGURE (center x = 107) ══════════ */}
          <BodyCore />
          <FrontSide mp={mp} />
          <g transform="translate(214,0) scale(-1,1)">
            <FrontSide mp={mp} />
          </g>
          <FrontGrooves />
          <g transform="translate(214,0) scale(-1,1)">
            <FrontGrooves />
          </g>
          <FrontDetail />

          {/* ══════════ BACK FIGURE (center x = 329) ══════════ */}
          <g transform="translate(222,0)">
            <BodyCore />
          </g>
          <BackSide mp={mp} />
          <g transform="translate(658,0) scale(-1,1)">
            <BackSide mp={mp} />
          </g>
          <BackGrooves />
          <g transform="translate(658,0) scale(-1,1)">
            <BackGrooves />
          </g>
          <BackDetail />
        </svg>
      ) : (
        <div className="relative">
          <img
            src={plateSrc}
            alt="Anatomical muscle study — front and back views"
            className="block w-full select-none bg-black"
            style={{ minHeight: 220 }}
            draggable={false}
            onLoad={(e) =>
              setPlateDims({
                w: e.currentTarget.naturalWidth,
                h: e.currentTarget.naturalHeight,
              })
            }
            onError={() => {
              setPlateDims(null);
              setPlateIdx((i) => i + 1);
            }}
          />
          {plateDims && (
            <svg
              viewBox={`0 0 ${plateDims.w} ${plateDims.h}`}
              className="absolute inset-0 h-full w-full"
              role="img"
              aria-label="Muscle activation zones"
            >
              {MUSCLES.map((m) => {
                const a = byId.get(m.id);
                const ratio = a?.ratio ?? 0;
                const trained = a !== undefined && a.score > 0;
                const isSel = selected === m.id;
                return (
                  <g key={m.id}>
                    {ZONES[m.id].map((z, i) => {
                      const cx = (z.cx / 100) * plateDims.w;
                      const cy = (z.cy / 100) * plateDims.h;
                      const rx = (z.rx / 100) * plateDims.w;
                      const ry = (z.ry / 100) * plateDims.h;
                      return (
                        <ellipse
                          key={i}
                          cx={cx}
                          cy={cy}
                          rx={rx}
                          ry={ry}
                          transform={
                            z.rot ? `rotate(${z.rot} ${cx} ${cy})` : undefined
                          }
                          fill={trained ? "#b6ff00" : "none"}
                          fillOpacity={
                            trained ? 0.3 + 0.5 * Math.min(1, ratio) : 0
                          }
                          stroke={
                            isSel ? "#b6ff00" : trained ? "#b6ff00" : "#ffffff"
                          }
                          strokeOpacity={isSel ? 1 : trained ? 0.7 : 0.18}
                          strokeWidth={
                            isSel ? plateDims.w / 170 : plateDims.w / 480
                          }
                          strokeLinejoin="round"
                          pointerEvents="all"
                          className="cursor-pointer transition-all duration-300"
                          style={
                            isSel
                              ? {
                                  filter:
                                    "drop-shadow(0 0 6px rgba(182,255,0,0.65))",
                                }
                              : undefined
                          }
                          onClick={() => setSelected(isSel ? null : m.id)}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      )}

      <div className="mt-3 rounded-xl border border-border bg-card px-4 py-3">
        {selectedMuscle ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold">
                {selectedMuscle.label}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {selectedData && selectedData.score > 0
                  ? "trained from your logged sets"
                  : "not trained yet"}
              </p>
            </div>
            <span className="num text-[15px] font-bold text-primary">
              {selectedData && selectedData.score > 0
                ? `${Math.round(selectedData.ratio * 100)}%`
                : "0%"}
            </span>
          </div>
        ) : (
          <p className="text-center text-[11px] text-muted-foreground">
            {trainedCount > 0
              ? `Tap any muscle — ${trainedCount} active from your workouts`
              : "Tap a muscle to inspect its activation"}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── shared symmetric core: V-taper torso, neck, head (centered x = 107) ─ */
function BodyCore() {
  return (
    <>
      {/* torso: broad shoulders → narrow waist → hips → groin */}
      <path
        d="M91,104 C78,107 64,112 55,121 C47,129 44,140 46,154 C49,174 56,192 62,210 C65,224 66,240 65,254 C63,266 60,278 59,288 C60,296 74,301 107,301 C140,301 154,296 155,288 C154,278 151,266 149,254 C148,240 149,224 152,210 C158,192 165,174 168,154 C170,140 167,129 159,121 C150,112 136,107 123,104 Z"
        fill="url(#mm-body)"
      />
      {/* neck behind the head */}
      <path
        d="M90,66 L124,66 L128,106 C118,113 96,113 86,106 Z"
        fill="url(#mm-body)"
      />
      <ellipse cx="107" cy="47" rx="25" ry="28" fill="url(#mm-head)" />
    </>
  );
}

/* ── FRONT: left-side anatomy (mirrored for the right half) ───────────── */
function FrontSide({ mp }: { mp: MusclePath }) {
  return (
    <>
      {/* limb bases — arms hang beside the body, legs apart */}
      <path
        d="M52,112 C34,114 18,128 13,152 C8,178 11,214 15,240 C18,251 26,257 36,255 C47,253 53,246 53,234 L56,180 C57,150 58,128 52,112 Z"
        fill="url(#mm-body)"
      />
      <path
        d="M16,252 C12,266 13,282 17,293 C24,301 40,302 47,295 C52,289 53,278 52,266 L53,254 Z"
        fill="url(#mm-body)"
      />
      {staticPath(
        "M17,292 C10,300 9,314 14,324 C19,332 32,334 39,327 C45,320 45,306 40,297 C34,291 24,289 17,292 Z",
      )}
      <path
        d="M58,292 C57,320 60,356 64,388 C67,408 74,418 86,417 C99,416 105,406 104,390 C102,360 101,326 101,296 C96,288 74,286 58,292 Z"
        fill="url(#mm-body)"
      />
      <path
        d="M65,414 C59,450 61,488 67,518 C70,536 73,548 76,553 L88,553 C87,538 87,522 89,506 C93,474 98,442 103,416 Z"
        fill="url(#mm-body)"
      />
      {staticPath(
        "M74,552 C64,562 56,578 54,592 C56,598 70,600 84,598 C92,596 94,588 92,576 C90,564 84,554 74,552 Z",
      )}

      {/* leg muscles */}
      {mp(
        "quads",
        "M60,298 C58,330 61,366 66,392 C70,410 78,419 88,416 C97,413 102,404 101,389 C99,360 99,326 100,300 C95,292 74,291 60,298 Z",
      )}
      {mp(
        "quads",
        "M86,378 C82,392 84,408 91,414 C97,418 101,412 101,402 L100,382 Z",
      )}
      {staticPath(
        "M100,302 C102,330 101,360 98,384 L93,386 C95,358 96,330 95,300 Z",
      )}
      {staticPath(
        "M68,430 C64,462 65,498 70,524 L78,522 C74,496 73,464 76,432 Z",
      )}

      {/* torso muscles — obliques → serratus → abs → chest */}
      {mp(
        "neck",
        "M94,78 C99,86 115,86 120,78 L127,106 C117,112 97,112 87,106 Z",
      )}
      {mp(
        "obliques",
        "M66,196 C62,216 62,240 68,256 C72,266 79,271 85,271 L85,204 Z",
      )}
      {staticPath(
        "M60,164 C65,161 71,163 75,168 L72,175 C68,172 63,171 59,172 Z",
      )}
      {staticPath(
        "M61,178 C66,175 72,177 77,182 L74,189 C70,186 65,185 60,186 Z",
      )}
      {staticPath(
        "M63,192 C68,189 74,191 79,196 L76,203 C72,200 67,199 62,200 Z",
      )}
      {staticPath(
        "M65,206 C70,203 76,205 81,210 L78,217 C74,214 69,213 64,214 Z",
      )}
      {mp(
        "abs",
        "M84,182 L107,180 L107,262 C100,270 90,272 85,265 C82,252 82,200 84,182 Z",
      )}
      {mp(
        "chest",
        "M62,120 L107,114 L107,176 C94,186 74,180 66,166 C61,152 60,132 62,120 Z",
      )}

      {/* arm muscles — delt over biceps, arm chain beside the torso */}
      {mp(
        "biceps",
        "M20,176 C15,196 14,222 17,240 C20,250 28,254 36,252 C44,250 49,243 49,232 L50,198 C49,182 40,172 20,176 Z",
      )}
      {mp(
        "forearms",
        "M18,256 C14,268 14,282 17,291 C21,298 30,300 38,297 C44,294 47,287 47,277 L49,260 C44,254 26,252 18,256 Z",
      )}
      {mp(
        "front_delts",
        "M52,110 C32,113 16,128 12,152 C9,172 17,186 32,187 C45,188 55,178 56,162 L57,132 C55,116 60,108 52,110 Z",
      )}
    </>
  );
}

/* ── FRONT: striations + grooves, left half (mirrored) ────────────────── */
function FrontGrooves() {
  return (
    <>
      {/* clavicle + neck */}
      {grooveLine("M78,110 C87,105 97,105 105,110", 0.55, 1.2)}
      {grooveLine("M103,104 C105,107 109,107 111,104", 0.6, 1.2)}
      {grooveLine("M94,80 C96,90 100,100 104,107", 0.5)}
      {/* pectoral fibers */}
      {grooveLine("M66,132 L105,124")}
      {grooveLine("M64,146 L105,138")}
      {grooveLine("M66,160 L105,152")}
      {grooveLine("M70,172 L105,166")}
      {/* ab inscriptions */}
      {grooveLine("M84,200 L107,200")}
      {grooveLine("M83,218 L107,218")}
      {grooveLine("M83,236 L107,236")}
      {grooveLine("M84,254 C90,261 99,264 107,263")}
      {/* oblique fibers + inguinal line */}
      {grooveLine("M67,206 C72,213 78,219 84,221")}
      {grooveLine("M68,224 C73,232 79,238 84,240")}
      {grooveLine("M69,242 C74,250 80,256 85,258")}
      {grooveLine("M74,266 C81,272 92,276 103,278", 0.55, 1.2)}
      {/* deltoid heads */}
      {grooveLine("M26,132 C21,152 20,172 25,186")}
      {grooveLine("M36,124 C31,146 30,170 34,184")}
      {grooveLine("M46,120 C43,142 43,166 46,180")}
      {/* biceps heads + elbow crease */}
      {grooveLine("M26,184 C22,206 22,230 26,246")}
      {grooveLine("M36,182 C33,206 33,230 36,248")}
      {grooveLine("M20,250 C27,255 38,256 46,252", 0.55)}
      {/* forearm compartments */}
      {grooveLine("M22,260 C19,272 19,284 22,293")}
      {grooveLine("M30,258 C27,270 27,284 30,294")}
      {grooveLine("M38,258 C41,270 41,284 39,293")}
      {/* fist knuckles */}
      {grooveLine("M15,302 C20,299 27,299 32,302", 0.55)}
      {grooveLine("M15,314 C20,311 27,311 32,314", 0.55)}
      {/* quad separation, VMO, knee, shin */}
      {grooveLine("M78,308 C73,344 73,384 79,410")}
      {grooveLine("M66,314 C62,344 63,378 68,402")}
      {grooveLine("M94,312 C92,344 93,378 96,404")}
      {grooveLine("M64,358 C72,363 82,366 92,365", 0.45)}
      {grooveLine("M88,384 C91,396 95,406 101,410", 0.5)}
      {grooveLine("M74,412 C80,408 88,409 93,414", 0.5)}
      {grooveLine("M76,436 C72,466 73,498 78,520", 0.45)}
      {grooveLine("M84,548 C87,552 88,556 88,560", 0.5)}
      {/* toes */}
      {grooveLine("M66,578 L64,594", 0.5)}
      {grooveLine("M75,582 L74,596", 0.5)}
      {grooveLine("M84,584 L84,596", 0.5)}
    </>
  );
}

/* ── FRONT: hair, face, midline + occlusion shadows (drawn once) ──────── */
function FrontDetail() {
  return (
    <>
      {/* short cropped hair */}
      {staticPath(
        "M83,42 C84,24 93,19 107,19 C121,19 130,24 131,42 C126,32 119,29 107,29 C95,29 88,32 83,42 Z",
        HAIR_FILL,
        false,
      )}
      {/* ears */}
      {grooveLine("M82,44 C79,47 79,53 82,56", 0.6, 1.2)}
      {grooveLine("M132,44 C135,47 135,53 132,56", 0.6, 1.2)}
      {/* face */}
      {grooveLine("M91,42 C95,39 101,39 105,41", 0.7, 1.2)}
      {grooveLine("M123,42 C119,39 113,39 109,41", 0.7, 1.2)}
      <path
        d="M92,48 C95,45 101,45 104,48 C101,51 95,51 92,48 Z"
        fill="#232323"
      />
      <path
        d="M122,48 C119,45 113,45 110,48 C113,51 119,51 122,48 Z"
        fill="#232323"
      />
      {grooveLine("M107,47 L107,56", 0.55, 1.2)}
      {grooveLine("M103,58 C105,60 109,60 111,58", 0.6, 1.2)}
      {grooveLine("M102,65 C105,67 109,67 112,65", 0.65, 1.2)}
      {/* sternum, linea alba, navel, groin */}
      {grooveLine("M107,118 L107,174", 0.5, 1.2)}
      {grooveLine("M107,186 L107,256", 0.45, 1.1)}
      <ellipse cx="107" cy="236" rx="2" ry="2.6" fill={GROOVE} opacity={0.7} />
      {grooveLine("M107,272 L107,296", 0.4)}
      {/* occlusion shadows */}
      {shadow(107, 82, 20, 6, 0.4)}
      {shadow(57, 160, 6, 9, 0.35)}
      {shadow(157, 160, 6, 9, 0.35)}
      {shadow(107, 294, 26, 8, 0.35)}
    </>
  );
}

/* ── BACK: left-side anatomy (mirrored for the right half) ────────────── */
function BackSide({ mp }: { mp: MusclePath }) {
  return (
    <>
      {/* limb bases (front chain translated +222) */}
      <path
        d="M274,112 C256,114 240,128 235,152 C230,178 233,214 237,240 C240,251 248,257 258,255 C269,253 275,246 275,234 L278,180 C279,150 280,128 274,112 Z"
        fill="url(#mm-body)"
      />
      <path
        d="M238,252 C234,266 235,282 239,293 C246,301 262,302 269,295 C274,289 275,278 274,266 L275,254 Z"
        fill="url(#mm-body)"
      />
      {staticPath(
        "M239,292 C232,300 231,314 236,324 C241,332 254,334 261,327 C267,320 267,306 262,297 C256,291 246,289 239,292 Z",
      )}
      <path
        d="M280,292 C279,320 282,356 286,388 C289,408 296,418 308,417 C321,416 327,406 326,390 C324,360 323,326 323,296 C318,288 296,286 280,292 Z"
        fill="url(#mm-body)"
      />
      <path
        d="M287,414 C281,450 283,488 289,518 C292,536 295,548 298,553 L310,553 C309,538 309,522 311,506 C315,474 320,442 325,416 Z"
        fill="url(#mm-body)"
      />
      {staticPath(
        "M296,552 C286,562 278,578 276,592 C278,598 292,600 306,598 C314,596 316,588 314,576 C312,564 306,554 296,552 Z",
      )}

      {/* back muscles — lats → erectors → scapula → traps → glutes → hams → calves */}
      {mp(
        "lats",
        "M279,156 C281,176 283,196 287,214 C290,232 290,250 288,264 L318,268 L318,150 C306,144 290,147 279,156 Z",
      )}
      {mp(
        "lower_back",
        "M321,166 L329,166 L329,296 C325,294 322,288 321,276 Z",
      )}
      {staticPath(
        "M283,152 C294,146 308,150 315,162 C318,172 313,184 302,186 C291,188 284,178 283,166 Z",
      )}
      {mp(
        "traps",
        "M329,74 L277,110 C262,124 254,142 256,158 C264,178 292,194 329,197 Z",
      )}
      {mp(
        "glutes",
        "M327,290 C314,284 296,288 286,302 C278,316 279,338 289,348 C300,358 318,358 327,347 L329,330 L329,296 Z",
      )}
      {mp(
        "hamstrings",
        "M288,354 C286,372 286,392 290,406 C295,415 305,419 313,415 C319,412 322,404 321,393 C319,376 320,362 323,353 C315,348 295,348 288,354 Z",
      )}
      {mp(
        "calves",
        "M290,428 C285,456 285,494 291,520 C296,540 304,548 311,542 C317,536 319,522 319,506 L319,432 Z",
      )}
      {staticPath("M302,548 L316,548 L316,568 C311,571 305,570 302,566 Z")}

      {/* arm muscles */}
      {mp(
        "triceps",
        "M242,176 C237,196 236,222 239,240 C242,250 250,254 258,252 C266,250 271,243 271,232 L272,198 C271,182 262,172 242,176 Z",
      )}
      {mp(
        "forearms",
        "M240,256 C236,268 236,282 239,291 C243,298 252,300 260,297 C266,294 269,287 269,277 L271,260 C266,254 248,252 240,256 Z",
      )}
      {mp(
        "rear_delts",
        "M274,110 C254,113 238,128 234,152 C231,172 239,186 254,187 C267,188 277,178 278,162 L279,132 C277,116 282,108 274,110 Z",
      )}
    </>
  );
}

/* ── BACK: striations + grooves, left half (mirrored) ─────────────────── */
function BackGrooves() {
  return (
    <>
      {/* trapezius fibers */}
      {grooveLine("M323,92 C308,100 294,112 284,128")}
      {grooveLine("M321,116 C306,126 294,140 288,156")}
      {grooveLine("M322,146 C313,154 305,162 300,172", 0.45)}
      {/* rear deltoid heads */}
      {grooveLine("M246,120 C240,142 239,164 244,182")}
      {grooveLine("M256,116 C251,140 250,164 254,180")}
      {/* scapula: infraspinatus fibers + medial border */}
      {grooveLine("M290,158 C298,155 307,158 313,165", 0.5)}
      {grooveLine("M289,170 C297,167 306,170 312,177", 0.5)}
      {grooveLine("M298,152 C295,166 296,178 300,186", 0.55)}
      {/* latissimus fan */}
      {grooveLine("M316,164 C310,190 300,222 291,250")}
      {grooveLine("M318,192 C313,216 305,240 297,262")}
      {/* triceps heads */}
      {grooveLine("M248,184 C244,206 244,230 248,248")}
      {grooveLine("M257,188 C254,210 254,232 257,250")}
      {/* forearm extensors + fist knuckles */}
      {grooveLine("M244,262 C241,274 241,286 244,295")}
      {grooveLine("M252,260 C249,272 249,286 252,295")}
      {grooveLine("M237,302 C242,299 249,299 254,302", 0.55)}
      {grooveLine("M237,314 C242,311 249,311 254,314", 0.55)}
      {/* glute fibers */}
      {grooveLine("M292,306 C287,322 288,338 296,348", 0.5)}
      {grooveLine("M314,300 C309,318 309,336 316,348", 0.5)}
      {/* hamstring heads */}
      {grooveLine("M292,362 C288,378 288,396 292,410", 0.45)}
      {grooveLine("M300,360 C297,378 297,398 301,412", 0.45)}
      {grooveLine("M310,360 C313,378 313,396 311,410", 0.45)}
      {/* knee crease, calf heads, ankle, heel */}
      {grooveLine("M290,414 C296,418 306,418 312,414", 0.5, 1.2)}
      {grooveLine("M294,442 C290,470 290,498 295,520", 0.45)}
      {grooveLine("M303,436 C302,466 302,496 304,522", 0.45)}
      {grooveLine("M312,442 C315,468 315,496 312,518", 0.45)}
      {grooveLine("M288,546 C286,552 287,558 290,562", 0.5)}
      {grooveLine("M293,572 C298,582 312,582 317,572", 0.5)}
    </>
  );
}

/* ── BACK: hair, spine and occlusion shadows (drawn once) ─────────────── */
function BackDetail() {
  return (
    <>
      {/* full head of hair */}
      {staticPath(
        "M305,52 C302,30 311,19 329,19 C347,19 356,30 353,52 C350,64 341,71 329,71 C317,71 308,64 305,52 Z",
        HAIR_FILL,
        false,
      )}
      {grooveLine("M312,30 C318,23 340,23 346,30", 0.3)}
      {grooveLine("M308,46 C315,37 343,37 350,46", 0.3)}
      {/* ears + nape */}
      {grooveLine("M305,46 C302,49 302,55 305,58", 0.6, 1.2)}
      {grooveLine("M353,46 C356,49 356,55 353,58", 0.6, 1.2)}
      {grooveLine("M316,76 C321,81 337,81 342,76", 0.5)}
      {/* spinal groove */}
      {grooveLine("M329,80 L329,196", 0.5, 1.3)}
      {grooveLine("M329,204 L329,292", 0.5, 1.3)}
      {/* erector spinais ticks */}
      {grooveLine("M321,212 L337,212", 0.45)}
      {grooveLine("M320,234 L338,234", 0.45)}
      {grooveLine("M320,256 L338,256", 0.45)}
      {grooveLine("M321,278 L337,278", 0.4)}
      {/* dimples of venus */}
      <ellipse
        cx="321"
        cy="288"
        rx="1.8"
        ry="2.2"
        fill={GROOVE}
        opacity={0.6}
      />
      <ellipse
        cx="337"
        cy="288"
        rx="1.8"
        ry="2.2"
        fill={GROOVE}
        opacity={0.6}
      />
      {/* occlusion shadows */}
      {shadow(329, 84, 20, 6, 0.38)}
      {shadow(279, 160, 6, 9, 0.35)}
      {shadow(379, 160, 6, 9, 0.35)}
      {shadow(329, 352, 30, 7, 0.4)}
      {shadow(329, 386, 7, 28, 0.25)}
    </>
  );
}
