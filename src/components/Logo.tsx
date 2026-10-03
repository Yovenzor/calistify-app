import { cn } from "@/lib/utils";

/** CALIST (white) + IFY (lime) wordmark with the dark rounded-square symbol. */
export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "sm"
      ? "size-7 rounded-lg"
      : size === "lg"
        ? "size-11 rounded-xl"
        : "size-8 rounded-[10px]";
  const glyph = size === "sm" ? 13 : size === "lg" ? 21 : 16;
  const text = size === "sm" ? "text-[13px]" : size === "lg" ? "text-xl" : "text-[15px]";

  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <div
        className={cn(
          "flex items-center justify-center border border-border bg-[#0c0c0c] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
          box,
        )}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 96.81 96.81" aria-hidden>
          <g fill="#b6ff00">
            <rect x="24.67" y="24.67" width="47.47" height="11.87" rx="1" />
            <rect x="24.67" y="36.54" width="11.87" height="35.61" rx="1" />
            <rect x="40.06" y="39.98" width="23.74" height="11.87" rx="1" />
            <rect x="40.06" y="51.85" width="11.87" height="20.3" rx="1" />
          </g>
        </svg>
      </div>
      <span className={cn("font-bold tracking-tight", text)}>
        CALIST<span className="text-primary">IFY</span>
      </span>
    </div>
  );
}
