import { Button } from "@/components/ui/button";
import { EXERCISE_MEDIA, type Exercise } from "@/lib/exercises";
import { CirclePlay, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

/**
 * Play icon shown next to an exercise name in the pickers. Clicking it opens
 * a modal with the exercise animation (or photo) so you can see what the
 * movement looks like before adding it. Renders nothing when no media exists.
 */
export function ExercisePreview({ exercise }: { exercise: Exercise }) {
  const src = EXERCISE_MEDIA[exercise.id];
  const [open, setOpen] = useState(false);

  if (!src) return null;

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        aria-label={`Preview ${exercise.name}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }
        }}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary"
      >
        <CirclePlay className="size-3.5" />
      </span>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-6"
            onClick={() => setOpen(false)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div
              className="rise-in relative w-full max-w-[340px] rounded-2xl border border-border bg-[#0c0c0c] p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
                    Preview
                  </p>
                  <h3 className="mt-1 truncate text-[16px] font-bold">
                    {exercise.name}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {exercise.primary.join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close preview"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <img
                src={src}
                alt={`Preview of ${exercise.name}`}
                width={180}
                height={180}
                className="mx-auto mt-4 block size-[180px] rounded-xl bg-secondary object-contain"
              />

              {src.endsWith(".gif") && (
                <p className="mt-3 text-center text-[9px] leading-4 text-muted-foreground/70">
                  Animation © Gym visual — gymvisual.com
                </p>
              )}

              <Button
                onClick={() => setOpen(false)}
                className="mt-3 h-10 w-full rounded-xl text-[14px] font-semibold"
              >
                Close
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
