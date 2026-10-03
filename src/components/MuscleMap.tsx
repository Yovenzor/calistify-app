import { MUSCLES, type MuscleGroup } from "@/lib/muscles";
import { useState, type ReactNode } from "react";

interface Activation {
  id: MuscleGroup;
  score: number;
  ratio: number;
}

/** Renders one interactive muscle path; bound to MuscleMap state via props. */
type MusclePath = (id: MuscleGroup, d: string) => ReactNode;

/* ── palette ──────────────────────────────────────────────────────────── */
const LIME: [number, number, number] = [182, 255, 0];
const GRAY: [number, number, number] = [210, 210, 210];
const REST_FILL = "#dcdcdc";
const STATIC_FILL = "#c9c9c9";
const HAIR_FILL = "#585858";
const GROOVE = "#0d0d0d";;

/** Resting muscle is anatomical gray; trained muscles blend toward lime. */
function mix(a: [number, number, number], b: [number, number, number], t: number) {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** Non-interactive anatomical detail (serratus, adductor, hair, hands...). */
function staticPath(d: string, fill = STATIC_FILL, bump = true): ReactNode {
  if (!bump) return <path d={d} fill={fill} />;
  return (
    <>
      <path
        d={d}
        fill={fill}
        stroke={GROOVE}
        strokeOpacity={0.5}
        strokeWidth={0.9}
        filter="url(#mm-3d)"
      />
      <path d={d} fill="url(#mm-shade)" style={{ pointerEvents: "none" }} />
    </>
  );
}

/** Dark muscle groove / striation line (pointer-transparent). */
function grooveLine(d: string, opacity = 0.62, width = 1.15): ReactNode {
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

/**
 * Detailed front + back anatomical plate. Both views are shown at once; every
 * catalog muscle is an individually selectable path whose color intensity comes
 * from real logged activation (0 = neutral gray, never faked).
 */
export function MuscleMap({ activation }: { activation: Activation[] }) {
  const [selected, setSelected] = useState<MuscleGroup | null>(null);
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
          strokeOpacity={isSel ? 1 : 0.7}
          strokeWidth={isSel ? 2.2 : 1.4}
          className="cursor-pointer transition-all duration-300"
          onClick={() => setSelected(isSel ? null : id)}
          filter={isSel ? undefined : "url(#mm-3d)"}
          style={
            isSel
              ? {
                  filter:
                    "url(#mm-3d) drop-shadow(0 0 6px rgba(182,255,0,0.6))",
                }
              : undefined
          }
        />
        {/* volume overlay: lit top-left, shadowed bottom-right */}
        <path d={d} fill="url(#mm-shade)" style={{ pointerEvents: "none" }} />
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
      <svg
        viewBox="0 0 440 652"
        className="h-auto w-full"
        role="img"
        aria-label="Anatomical muscle map with detailed front and back views"
      >
        <defs>
          {/* dark silhouette base — light muscle bellies pop against it */}
          <linearGradient id="mm-body" x1="0" y1="0" x2="1" y2="0.25">
            <stop offset="0" stopColor="#6d6d6d" />
            <stop offset="0.45" stopColor="#4e4e4e" />
            <stop offset="1" stopColor="#353535" />
          </linearGradient>
          <linearGradient id="mm-head" x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor="#d9d9d9" />
            <stop offset="1" stopColor="#9b9b9b" />
          </linearGradient>
          {/* per-muscle volume: highlight top-left, shadow bottom-right */}
          <linearGradient id="mm-shade" x1="0.05" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="0.35" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="0.62" stopColor="#000000" stopOpacity="0.08" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.38" />
          </linearGradient>
          {/* beveled relief: flat fills read as rendered 3D muscle bellies */}
          <filter id="mm-3d" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.6" result="soft" />
            <feSpecularLighting
              in="soft"
              surfaceScale="3.5"
              specularConstant="0.7"
              specularExponent="22"
              lightingColor="#ffffff"
              result="spec"
            >
              <feDistantLight azimuth="225" elevation="55" />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceAlpha" operator="in" result="clip" />
            <feComposite
              in="SourceGraphic"
              in2="clip"
              operator="arithmetic"
              k1="0"
              k2="1"
              k3="1"
              k4="0"
            />
          </filter>
        </defs>

        {/* ══════════ FRONT FIGURE (center x = 115) ══════════ */}
        <BodyCore />
        <FrontSide mp={mp} />
        <g transform="translate(230,0) scale(-1,1)">
          <FrontSide mp={mp} />
        </g>
        <FrontGrooves />
        <g transform="translate(230,0) scale(-1,1)">
          <FrontGrooves />
        </g>
        <FrontMidline />

        {/* ══════════ BACK FIGURE (center x = 325) ══════════ */}
        <g transform="translate(210,0)">
          <BodyCore />
        </g>
        <BackSide mp={mp} />
        <g transform="translate(650,0) scale(-1,1)">
          <BackSide mp={mp} />
        </g>
        <BackGrooves />
        <g transform="translate(650,0) scale(-1,1)">
          <BackGrooves />
        </g>
        <BackMidline />

        {/* view labels */}
        <text
          x="115"
          y="642"
          textAnchor="middle"
          fill="#6b6b6b"
          fontSize="10"
          fontWeight="600"
          letterSpacing="3"
        >
          FRONT
        </text>
        <text
          x="325"
          y="642"
          textAnchor="middle"
          fill="#6b6b6b"
          fontSize="10"
          fontWeight="600"
          letterSpacing="3"
        >
          BACK
        </text>
      </svg>

      <div className="mt-3 rounded-xl border border-border bg-card px-4 py-3">
        {selectedMuscle ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold">{selectedMuscle.label}</p>
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

/* ── shared symmetric core: torso, neck, head (centered at x = 115) ───── */
function BodyCore() {
  return (
    <>
      {/* torso silhouette: delt caps, ribcage, waist, hips, groin */}
      <path
        d="M99,92 C82,96 66,100 56,110 C48,120 48,138 52,153 C60,177 74,190 76,214 C77,233 70,250 70,272 C72,291 90,303 115,305 C140,303 158,291 160,272 C160,250 153,233 154,214 C156,190 170,177 178,153 C182,138 182,120 174,110 C164,100 148,96 131,92 Z"
        fill="url(#mm-body)"
      />
      {/* neck sits behind the head */}
      <path
        d="M100,58 L130,58 L134,94 C124,101 106,101 96,94 Z"
        fill="url(#mm-body)"
      />
      <ellipse cx="115" cy="43" rx="26" ry="33" fill="url(#mm-head)" />
    </>
  );
}

/* ── FRONT: left-side anatomy (mirrored for the right half) ───────────── */
function FrontSide({ mp }: { mp: MusclePath }) {
  return (
    <>
      {/* limb bases */}
      <path
        d="M78,280 C65,318 62,378 70,422 C75,446 86,458 98,456 C108,454 113,443 112,428 C109,392 108,338 111,300 C105,288 93,276 78,280 Z"
        fill="url(#mm-body)"
      />
      <path
        d="M80,458 C72,492 74,534 81,562 C85,580 92,590 99,588 C105,586 108,576 108,564 L105,468 Z"
        fill="url(#mm-body)"
      />
      <path
        d="M58,100 C45,106 40,126 42,152 L45,240 C47,254 55,264 64,262 C72,260 76,250 76,236 L76,148 C74,120 68,102 58,100 Z"
        fill="url(#mm-body)"
      />
      <path
        d="M47,266 C40,288 38,318 42,342 C45,358 53,368 61,366 C68,364 72,355 72,344 L74,274 C72,266 59,260 47,266 Z"
        fill="url(#mm-body)"
      />
      {staticPath("M45,370 C38,382 40,398 51,402 C62,406 72,400 74,388 L74,370 Z")}
      {staticPath("M78,590 C71,598 69,609 75,614 L108,614 C114,612 114,601 109,592 Z")}

      {/* leg muscles */}
      {mp(
        "quads",
        "M80,292 C69,330 66,386 75,426 C80,448 90,458 100,455 C108,452 112,442 111,428 C108,392 107,338 110,304 C104,293 93,287 80,292 Z",
      )}
      {mp(
        "quads",
        "M98,406 C93,422 95,441 103,449 C109,453 112,446 112,437 L111,412 Z",
      )}
      {staticPath(
        "M110,306 C111,344 110,388 107,424 L102,426 C105,384 106,342 105,304 Z",
      )}
      {staticPath(
        "M84,470 C79,500 81,534 87,558 L96,556 C91,530 89,496 92,470 Z",
      )}

      {/* torso muscles — order: obliques → serratus → abs → chest (pec on top) */}
      {mp(
        "neck",
        "M102,72 C107,78 123,78 128,72 L131,93 C122,98 108,98 99,93 Z",
      )}
      {mp(
        "obliques",
        "M82,170 C76,196 76,230 84,254 C88,266 94,274 100,276 L100,178 Z",
      )}
      {staticPath(
        "M73,154 C79,151 86,153 91,158 L88,165 C83,162 77,161 72,162 Z",
      )}
      {staticPath(
        "M74,168 C80,165 87,167 92,172 L89,179 C84,176 78,175 73,176 Z",
      )}
      {staticPath(
        "M76,182 C82,179 88,181 93,186 L90,193 C85,190 80,189 75,190 Z",
      )}
      {staticPath(
        "M78,196 C84,193 90,195 95,200 L92,207 C87,204 82,203 77,204 Z",
      )}
      {mp(
        "abs",
        "M97,158 L115,157 L115,264 C108,274 100,277 96,270 C93,258 93,192 97,158 Z",
      )}
      {mp(
        "chest",
        "M82,102 L115,98 L115,154 C102,170 85,166 79,151 C75,138 76,112 82,102 Z",
      )}

      {/* arm muscles — arm hangs in front of torso + thigh */}
      {mp(
        "biceps",
        "M52,160 C46,178 45,206 48,230 C50,247 56,257 64,255 C70,253 73,245 73,233 L73,180 C72,166 64,156 52,160 Z",
      )}
      {mp(
        "forearms",
        "M50,268 C44,290 43,316 46,338 C49,353 55,361 61,359 C66,357 69,349 69,339 L71,278 C69,270 60,264 50,268 Z",
      )}
      {mp(
        "front_delts",
        "M62,96 C49,103 42,122 43,145 C44,162 54,174 66,173 C75,172 81,164 81,151 L82,113 C79,100 72,94 62,96 Z",
      )}
    </>
  );
}

/* ── FRONT: striations + grooves, left half (mirrored) ────────────────── */
function FrontGrooves() {
  return (
    <>
      {/* clavicle + neck */}
      {grooveLine("M93,97 C100,92 109,92 114,96", 0.55, 1.2)}
      {grooveLine("M111,91 C113,94 117,94 119,91", 0.6, 1.2)}
      {grooveLine("M104,74 C106,81 109,88 113,94", 0.5)}
      {/* pectoral fibers */}
      {grooveLine("M90,110 L114,104")}
      {grooveLine("M84,122 L113,112")}
      {grooveLine("M83,136 L113,127")}
      {grooveLine("M86,150 L113,142")}
      {/* ab inscriptions */}
      {grooveLine("M97,180 L115,180")}
      {grooveLine("M96,204 L115,204")}
      {grooveLine("M96,228 L115,228")}
      {grooveLine("M97,252 C103,259 110,261 115,260")}
      {/* oblique fibers + inguinal line */}
      {grooveLine("M80,186 C86,196 93,203 98,205")}
      {grooveLine("M81,204 C87,214 94,221 99,223")}
      {grooveLine("M83,232 C88,241 94,248 99,250")}
      {grooveLine("M87,270 C94,277 104,282 112,285", 0.55, 1.2)}
      {/* deltoid heads */}
      {grooveLine("M66,104 C60,126 58,148 63,168")}
      {grooveLine("M75,112 C71,132 70,152 73,166")}
      {grooveLine("M54,114 C49,134 49,154 54,168")}
      {/* biceps heads + elbow crease */}
      {grooveLine("M58,168 C54,196 54,226 58,248")}
      {grooveLine("M66,170 C63,198 63,228 66,250")}
      {grooveLine("M50,258 C56,263 64,264 71,260", 0.55)}
      {/* forearm compartments */}
      {grooveLine("M47,272 C44,298 44,326 47,346")}
      {grooveLine("M56,278 C52,304 52,332 56,352")}
      {grooveLine("M63,284 C60,308 60,334 63,350")}
      {/* fist knuckles */}
      {grooveLine("M45,380 C50,377 57,377 62,380", 0.55)}
      {grooveLine("M46,391 C51,388 58,388 63,391", 0.55)}
      {/* quad separation + VMO + knee + shin */}
      {grooveLine("M89,302 C84,346 84,398 90,436")}
      {grooveLine("M101,308 C99,348 100,396 103,426")}
      {grooveLine("M76,352 C86,358 96,361 106,360", 0.45)}
      {grooveLine("M97,412 C101,428 106,440 111,444", 0.5)}
      {grooveLine("M87,447 C93,442 101,444 105,450", 0.5)}
      {grooveLine("M96,472 C92,502 93,532 98,556", 0.45)}
      {grooveLine("M103,565 C106,569 107,573 107,577", 0.5)}
      {/* toes */}
      {grooveLine("M84,603 L84,613", 0.5)}
      {grooveLine("M93,604 L93,613", 0.5)}
      {grooveLine("M102,605 L102,613", 0.5)}
    </>
  );
}

/* ── FRONT: midline + face (drawn once, on top) ───────────────────────── */
function FrontMidline() {
  return (
    <>
      {/* short hair */}
      {staticPath(
        "M90,41 C92,21 102,11 115,11 C128,11 138,21 140,41 C134,30 126,26 115,26 C104,26 96,31 90,41 Z",
        HAIR_FILL,
      )}
      {grooveLine("M99,24 C107,18 123,18 131,24", 0.35)}
      {/* ears */}
      {grooveLine("M89,44 C85,47 85,53 89,56", 0.6, 1.2)}
      {grooveLine("M141,44 C145,47 145,53 141,56", 0.6, 1.2)}
      {/* face */}
      {grooveLine("M99,43 C103,40 108,40 112,42", 0.7, 1.2)}
      {grooveLine("M131,43 C127,40 122,40 118,42", 0.7, 1.2)}
      {staticPath(
        "M100,49 C103,46 109,46 112,49 C109,52 103,52 100,49 Z",
        "#232323",
        false,
      )}
      {staticPath(
        "M130,49 C127,46 121,46 118,49 C121,52 127,52 130,49 Z",
        "#232323",
        false,
      )}
      {grooveLine("M115,47 L115,57", 0.55, 1.2)}
      {grooveLine("M110,59 C113,61 117,61 120,59", 0.6, 1.2)}
      {grooveLine("M109,66 C112,68 118,68 121,66", 0.65, 1.2)}
      {/* sternum, linea alba, navel, groin */}
      {grooveLine("M115,100 L115,153", 0.55, 1.3)}
      {grooveLine("M115,161 L115,255", 0.5, 1.2)}
      <ellipse cx="115" cy="241" rx="2" ry="2.6" fill={GROOVE} opacity={0.7} />
      {grooveLine("M115,277 L115,301", 0.45)}
    </>
  );
}

/* ── BACK: left-side anatomy (mirrored for the right half) ────────────── */
function BackSide({ mp }: { mp: MusclePath }) {
  return (
    <>
      {/* limb bases */}
      <path
        d="M288,280 C275,318 272,378 280,422 C285,446 296,458 308,456 C318,454 323,443 322,428 C319,392 318,338 321,300 C315,288 303,276 288,280 Z"
        fill="url(#mm-body)"
      />
      <path
        d="M290,458 C282,492 284,534 291,562 C295,580 302,590 309,588 C315,586 318,576 318,564 L315,468 Z"
        fill="url(#mm-body)"
      />
      <path
        d="M268,100 C255,106 250,126 252,152 L255,240 C257,254 265,264 274,262 C282,260 286,250 286,236 L286,148 C284,120 278,102 268,100 Z"
        fill="url(#mm-body)"
      />
      <path
        d="M257,266 C250,288 248,318 252,342 C255,358 263,368 271,366 C278,364 282,355 282,344 L284,274 C282,266 269,260 257,266 Z"
        fill="url(#mm-body)"
      />
      {staticPath(
        "M255,370 C248,382 250,398 261,402 C272,406 282,400 284,388 L284,370 Z",
      )}
      {staticPath(
        "M288,590 C281,598 279,609 285,614 L318,614 C324,612 324,601 319,592 Z",
      )}

      {/* back muscles — lats → erectors → scapula → traps → glutes → hams → calves */}
      {mp(
        "lats",
        "M286,170 C296,159 311,154 320,160 L320,252 C320,268 312,283 301,290 C295,293 288,293 286,287 Z",
      )}
      {mp(
        "lower_back",
        "M317,164 L325,164 L325,315 C319,312 313,303 309,290 Z",
      )}
      {staticPath(
        "M291,157 C301,152 313,158 317,170 C319,178 313,184 303,184 C293,184 287,174 288,163 Z",
      )}
      {mp(
        "traps",
        "M325,68 L294,85 C278,95 265,112 261,133 C274,147 292,155 304,159 L325,165 Z",
      )}
      {mp(
        "glutes",
        "M322,297 C308,291 291,295 281,309 C274,324 275,347 284,358 C294,368 312,369 321,357 L324,340 L324,310 Z",
      )}
      {mp(
        "hamstrings",
        "M284,362 C277,386 274,410 279,428 C283,444 292,456 302,453 C311,450 315,440 314,427 C311,406 313,384 316,363 C310,357 291,356 284,362 Z",
      )}
      {mp(
        "calves",
        "M291,468 C286,494 286,532 292,555 C297,571 305,577 311,571 C316,565 318,552 318,537 L318,474 Z",
      )}
      {staticPath("M300,574 L316,574 L316,594 C310,597 304,596 300,592 Z")}

      {/* arm muscles — arm hangs in front of glutes + hamstrings */}
      {mp(
        "triceps",
        "M260,160 C252,178 250,208 254,234 C256,250 262,261 270,259 C276,257 279,249 279,237 L280,178 C278,164 271,154 260,160 Z",
      )}
      {mp(
        "forearms",
        "M260,268 C254,290 253,316 256,338 C259,353 265,361 271,359 C276,357 279,349 279,339 L281,278 C279,270 270,264 260,268 Z",
      )}
      {mp(
        "rear_delts",
        "M270,98 C257,105 250,124 251,147 C252,164 261,177 273,176 C282,175 287,166 287,153 L287,115 C285,103 280,96 270,98 Z",
      )}
    </>
  );
}

/* ── BACK: striations + grooves, left half (mirrored) ─────────────────── */
function BackGrooves() {
  return (
    <>
      {/* trapezius fibers */}
      {grooveLine("M318,96 C302,104 288,116 278,132")}
      {grooveLine("M314,120 C302,130 292,142 286,154")}
      {grooveLine("M316,144 C309,149 303,153 299,158", 0.45)}
      {/* rear deltoid heads */}
      {grooveLine("M274,108 C266,128 264,150 269,172")}
      {grooveLine("M283,116 C278,136 277,156 280,170")}
      {/* scapula: infraspinatus fibers + medial border */}
      {grooveLine("M294,165 C302,162 310,165 315,171", 0.5)}
      {grooveLine("M293,174 C301,171 309,174 314,179", 0.5)}
      {grooveLine("M303,161 C300,172 301,179 304,184", 0.55)}
      {/* latissimus fan */}
      {grooveLine("M316,172 C310,198 300,234 291,264")}
      {grooveLine("M315,198 C311,224 305,252 298,278")}
      {/* triceps heads */}
      {grooveLine("M266,170 C262,196 262,228 266,252")}
      {grooveLine("M274,176 C271,202 271,230 274,252")}
      {/* forearm extensors + fist knuckles */}
      {grooveLine("M258,280 C254,306 254,332 258,352")}
      {grooveLine("M266,286 C263,310 263,334 266,352")}
      {grooveLine("M255,380 C260,377 267,377 272,380", 0.55)}
      {grooveLine("M256,391 C261,388 268,388 273,391", 0.55)}
      {/* glute fibers */}
      {grooveLine("M282,314 C276,332 277,350 286,360", 0.5)}
      {grooveLine("M306,306 C300,326 300,346 308,360", 0.5)}
      {/* hamstring heads */}
      {grooveLine("M283,376 C279,398 279,418 284,434", 0.45)}
      {grooveLine("M290,370 C285,396 285,420 291,442", 0.45)}
      {grooveLine("M303,372 C300,398 300,422 305,442", 0.45)}
      {/* knee crease, calf heads, ankle, heel */}
      {grooveLine("M288,452 C294,457 304,457 310,452", 0.5, 1.2)}
      {grooveLine("M293,484 C289,508 289,534 294,555", 0.45)}
      {grooveLine("M301,478 C300,504 300,532 301,554", 0.45)}
      {grooveLine("M308,484 C306,508 306,536 309,556", 0.45)}
      {grooveLine("M288,568 C286,573 287,579 290,583", 0.5)}
      {grooveLine("M292,596 C297,606 312,606 317,596", 0.5)}
    </>
  );
}

/* ── BACK: hair, spine and midline detail (drawn once, on top) ────────── */
function BackMidline() {
  return (
    <>
      {/* full head of hair */}
      {staticPath(
        "M301,52 C298,30 306,11 325,11 C344,11 352,30 349,52 C346,64 337,71 325,71 C313,71 304,64 301,52 Z",
        HAIR_FILL,
      )}
      {grooveLine("M308,27 C314,19 336,19 342,27", 0.3)}
      {grooveLine("M303,44 C311,34 339,34 347,44", 0.3)}
      {/* ears + nape */}
      {grooveLine("M299,44 C295,47 295,53 299,56", 0.6, 1.2)}
      {grooveLine("M351,44 C355,47 355,53 351,56", 0.6, 1.2)}
      {grooveLine("M312,75 C317,80 333,80 338,75", 0.5)}
      {/* spinal groove */}
      {grooveLine("M325,74 L325,162", 0.5, 1.3)}
      {grooveLine("M325,176 L325,304", 0.5, 1.3)}
      {/* erector spinais cross-hatching */}
      {grooveLine("M317,200 L333,200", 0.45)}
      {grooveLine("M316,228 L334,228", 0.45)}
      {grooveLine("M315,256 L335,256", 0.45)}
      {grooveLine("M314,284 L336,284", 0.4)}
      {/* dimples of venus */}
      <ellipse cx="316" cy="297" rx="1.8" ry="2.2" fill={GROOVE} opacity={0.6} />
      <ellipse cx="334" cy="297" rx="1.8" ry="2.2" fill={GROOVE} opacity={0.6} />
    </>
  );
}
