import type { ChartPoint } from "@/lib/stats";
import { formatNumber } from "@/lib/format";
import { useId, useMemo, useState } from "react";

/**
 * Lightweight SVG area chart with a gradient fill — real data only.
 * When there are no points the parent renders an empty state instead.
 */
export function ProgressChart({
  points,
  unit,
}: {
  points: ChartPoint[];
  unit: string;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 360;
  const H = 150;
  const PAD = 6;

  const { path, area, coords, max } = useMemo(() => {
    if (points.length === 0) {
      return { path: "", area: "", coords: [], max: 0 };
    }
    if (points.length === 1) {
      /* one logged day would collapse to a zero-width path — draw a level line */
      const p = points[0];
      const y = p.value > 0 ? PAD + (H - PAD * 2) * 0.3 : H - PAD;
      const d = `M${PAD},${y} L${W - PAD},${y}`;
      const flat = `${d} L${W - PAD},${H} L${PAD},${H} Z`;
      return {
        path: d,
        area: flat,
        coords: [
          { x: PAD, y, p },
          { x: W - PAD, y, p },
        ],
        max: p.value,
      };
    }
    const values = points.map((p) => p.value);
    const rawMax = Math.max(...values);
    const rawMin = Math.min(...values);
    const span = rawMax - rawMin || 1;
    const max = rawMax + span * 0.12;
    const min = Math.max(0, rawMin - span * 0.25);

    const coords = points.map((p, i) => {
      const x =
        points.length === 1
          ? W / 2
          : PAD + (i / (points.length - 1)) * (W - PAD * 2);
      const y =
        H - PAD - ((p.value - min) / (max - min || 1)) * (H - PAD * 2);
      return { x, y, p };
    });

    const d = coords
      .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(" ");
    const area = `${d} L${coords[coords.length - 1].x.toFixed(1)},${H} L${coords[0].x.toFixed(1)},${H} Z`;

    return { path: d, area, coords, max: rawMax };
  }, [points]);

  if (points.length === 0) return null;

  const active = hover !== null ? coords[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[150px] w-full touch-none"
        role="img"
        aria-label={`Chart, max ${formatNumber(max)} ${unit}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          let nearest = 0;
          let best = Infinity;
          coords.forEach((c, i) => {
            const d = Math.abs(c.x - x);
            if (d < best) {
              best = d;
              nearest = i;
            }
          });
          setHover(nearest);
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b6ff00" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#b6ff00" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* subtle horizontal grid */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            x2={W}
            y1={PAD + f * (H - PAD * 2)}
            y2={PAD + f * (H - PAD * 2)}
            stroke="#222"
            strokeWidth={1}
            strokeDasharray="3 5"
          />
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={path}
          fill="none"
          stroke="#b6ff00"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.length === 1 && (
          <circle cx={W / 2} cy={coords[0].y} r={3.5} fill="#b6ff00" />
        )}

        {active && (
          <>
            <line
              x1={active.x}
              x2={active.x}
              y1={0}
              y2={H}
              stroke="#b6ff00"
              strokeOpacity={0.35}
              strokeWidth={1}
            />
            <circle
              cx={active.x}
              cy={active.y}
              r={4}
              fill="#050505"
              stroke="#b6ff00"
              strokeWidth={2}
            />
          </>
        )}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute -top-1 rounded-lg border border-border bg-[#0c0c0c] px-2 py-1 text-[11px] font-semibold shadow-xl"
          style={{
            left: `${(active.x / W) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <span className="num">{formatNumber(active.p.value)}</span>
          <span className="ml-1 text-muted-foreground">{unit}</span>
          <div className="mt-0.5 text-[9px] font-normal text-muted-foreground">
            {new Date(active.p.ts).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      )}

      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground/70">
        <span>
          {new Date(points[0].ts).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span className="num">
          max {formatNumber(max)} {unit}
        </span>
        <span>
          {new Date(points[points.length - 1].ts).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}
