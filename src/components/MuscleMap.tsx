import { MUSCLES, type MuscleGroup } from "@/lib/muscles";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Activation {
  id: MuscleGroup;
  score: number;
  ratio: number;
}

/**
 * Interactive front/back human body map. Every muscle is individually
 * selectable; activation comes from real logged sets and starts at zero.
 */
export function MuscleMap({ activation }: { activation: Activation[] }) {
  const [view, setView] = useState<"front" | "back">("front");
  const [selected, setSelected] = useState<MuscleGroup | null>(null);

  const byId = new Map(activation.map((a) => [a.id, a]));
  const fillFor = (id: MuscleGroup) => {
    const a = byId.get(id);
    if (!a || a.score <= 0) return "#141414";
    // lime intensity driven by real activation
    const alpha = 0.2 + a.ratio * 0.8;
    return `rgba(182, 255, 0, ${alpha.toFixed(2)})`;
  };
  const strokeFor = (id: MuscleGroup) =>
    (byId.get(id)?.score ?? 0) > 0 ? "rgba(182,255,0,0.55)" : "#242424";

  const selectedMuscle = selected ? MUSCLES.find((m) => m.id === selected) : null;
  const selectedData = selected ? byId.get(selected) : undefined;

  const path = (id: MuscleGroup, d: string, key?: string) => (
    <path
      key={key ?? id}
      d={d}
      fill={fillFor(id)}
      stroke={strokeFor(id)}
      strokeWidth={1.2}
      className="cursor-pointer transition-all duration-300 hover:opacity-80"
      onClick={() => setSelected(selected === id ? null : id)}
      data-active={selected === id ? "true" : undefined}
      style={
        selected === id
          ? { stroke: "#b6ff00", strokeWidth: 2, filter: "drop-shadow(0 0 6px rgba(182,255,0,0.5))" }
          : undefined
      }
    />
  );

  return (
    <div>
      <div className="mb-3 flex justify-center">
        <div className="flex rounded-xl border border-border bg-secondary p-1">
          {(["front", "back"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v);
                setSelected(null);
              }}
              className={cn(
                "rounded-lg px-5 py-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase transition-all",
                view === v
                  ? "bg-primary text-primary-foreground shadow-[0_4px_14px_-6px_rgba(182,255,0,0.6)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <svg
          viewBox="0 0 200 380"
          className="h-[330px] w-auto"
          role="img"
          aria-label={`${view} muscle map`}
        >
          {view === "front" ? (
            <g>
              {/* head + neck */}
              <ellipse cx="100" cy="30" rx="20" ry="24" fill="#141414" stroke="#242424" strokeWidth="1.2" />
              <rect x="90" y="50" width="20" height="16" fill="#141414" stroke="#242424" strokeWidth="1.2" rx="4" />
              {path("chest", "M70 70 Q100 62 130 70 L128 96 Q100 106 72 96 Z")}
              {/* front delts */}
              {path("front_delts", "M52 72 Q64 62 74 70 L72 92 Q58 94 50 86 Z", "fd-l")}
              {path("front_delts", "M148 72 Q136 62 126 70 L128 92 Q142 94 150 86 Z", "fd-r")}
              {/* biceps / arms */}
              {path("biceps", "M44 92 Q56 88 62 96 L60 130 Q48 134 42 124 Z", "bi-l")}
              {path("biceps", "M156 92 Q144 88 138 96 L140 130 Q152 134 158 124 Z", "bi-r")}
              {path("forearms", "M40 134 Q52 130 58 138 L54 178 Q44 180 38 170 Z", "fa-l")}
              {path("forearms", "M160 134 Q148 130 142 138 L146 178 Q156 180 162 170 Z", "fa-r")}
              {/* abs + obliques */}
              {path("abs", "M84 100 L116 100 L114 168 L86 168 Z")}
              {path("obliques", "M72 102 L84 102 L86 160 L74 152 Z", "ob-l")}
              {path("obliques", "M128 102 L116 102 L114 160 L126 152 Z", "ob-r")}
              {/* quads */}
              {path("quads", "M78 196 L98 196 L96 276 L76 270 Z", "q-l")}
              {path("quads", "M122 196 L102 196 L104 276 L124 270 Z", "q-r")}
              {/* lower legs (neutral) */}
              <path d="M78 276 L96 280 L94 344 L80 344 Z" fill="#141414" stroke="#242424" strokeWidth="1.2" />
              <path d="M122 276 L104 280 L106 344 L120 344 Z" fill="#141414" stroke="#242424" strokeWidth="1.2" />
              {/* torso base */}
              <path d="M70 70 Q100 62 130 70 L134 168 Q136 194 122 196 L78 196 Q64 194 66 168 Z" fill="none" stroke="#242424" strokeWidth="1.2" />
            </g>
          ) : (
            <g>
              {/* head + neck */}
              <ellipse cx="100" cy="30" rx="20" ry="24" fill="#141414" stroke="#242424" strokeWidth="1.2" />
              <rect x="90" y="50" width="20" height="16" fill="#141414" stroke="#242424" strokeWidth="1.2" rx="4" />
              {/* traps */}
              {path("traps", "M72 66 L100 58 L128 66 L124 96 Q100 104 76 96 Z")}
              {/* rear delts */}
              {path("rear_delts", "M54 72 Q64 62 74 70 L72 90 Q58 92 50 84 Z", "rd-l")}
              {path("rear_delts", "M146 72 Q136 62 126 70 L128 90 Q142 92 150 84 Z", "rd-r")}
              {/* lats */}
              {path("lats", "M74 98 L96 104 L94 158 L72 146 Z", "la-l")}
              {path("lats", "M126 98 L104 104 L106 158 L128 146 Z", "la-r")}
              {/* triceps */}
              {path("triceps", "M44 92 Q56 88 62 96 L60 130 Q48 134 42 124 Z", "tri-l")}
              {path("triceps", "M156 92 Q144 88 138 96 L140 130 Q152 134 158 124 Z", "tri-r")}
              {path("forearms", "M40 134 Q52 130 58 138 L54 178 Q44 180 38 170 Z", "fa-l")}
              {path("forearms", "M160 134 Q148 130 142 138 L146 178 Q156 180 162 170 Z", "fa-r")}
              {/* lower back */}
              {path("lower_back", "M86 150 L114 150 L112 186 L88 186 Z")}
              {/* glutes */}
              {path("glutes", "M78 190 Q100 182 100 196 Q100 216 82 216 Q70 214 70 200 Z", "gl-l")}
              {path("glutes", "M122 190 Q100 182 100 196 Q100 216 118 216 Q130 214 130 200 Z", "gl-r")}
              {/* hamstrings */}
              {path("hamstrings", "M76 220 L98 220 L96 282 L74 276 Z", "hs-l")}
              {path("hamstrings", "M124 220 L102 220 L104 282 L126 276 Z", "hs-r")}
              {/* calves */}
              {path("calves", "M78 286 L96 290 L93 344 L79 342 Z", "c-l")}
              {path("calves", "M122 286 L104 290 L107 344 L121 342 Z", "c-r")}
              {/* torso outline */}
              <path d="M72 66 L100 58 L128 66 L134 168 Q136 194 122 196 L78 196 Q64 194 66 168 Z" fill="none" stroke="#242424" strokeWidth="1.2" />
            </g>
          )}
        </svg>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card px-4 py-3">
        {selectedMuscle ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold">{selectedMuscle.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {selectedMuscle.view} ·{" "}
                {selectedData && selectedData.score > 0
                  ? "trained from your workouts"
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
            Tap a muscle to inspect its activation
          </p>
        )}
      </div>
    </div>
  );
}
