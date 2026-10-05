import { Button } from "@/components/ui/button";
import { Loader2, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Crop frame size in px (the avatar is rendered as a circle). */
const FRAME = 272;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const EXPORT_SIZE = 512;

type Offset = { x: number; y: number };

/** Scale at which the image just covers the frame (zoom = 1). */
function coverScale(img: HTMLImageElement) {
  return Math.max(FRAME / img.naturalWidth, FRAME / img.naturalHeight);
}

function clampOffset(img: HTMLImageElement, off: Offset, zoom: number): Offset {
  const eff = coverScale(img) * zoom;
  const maxX = Math.max(0, (img.naturalWidth * eff - FRAME) / 2);
  const maxY = Math.max(0, (img.naturalHeight * eff - FRAME) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, off.x)),
    y: Math.min(maxY, Math.max(-maxY, off.y)),
  };
}

/**
 * Profile photo editor: drag to reposition, pinch / scroll / slider to zoom,
 * then export the visible circle as a 512×512 JPEG. The uploaded picture is
 * exactly what the user framed — no surprise cropping after upload.
 */
export function PhotoEditor({
  file,
  onCancel,
  onDone,
}: {
  file: Blob;
  onCancel: () => void;
  onDone: (cropped: Blob) => void | Promise<void>;
}) {
  const [loaded, setLoaded] = useState<{
    file: Blob;
    url: string;
    image: HTMLImageElement;
  } | null>(null);
  const [errorFile, setErrorFile] = useState<Blob | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  // Derived from which file is currently loaded — selecting a new file
  // automatically hides stale image/error state.
  const img = loaded && loaded.file === file ? loaded.image : null;
  const imageUrl = loaded && loaded.file === file ? loaded.url : null;
  const loadError = errorFile === file;

  const frameRef = useRef<HTMLDivElement>(null);
  /** Active pointers inside the frame (1 = pan, 2 = pinch). */
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistRef = useRef<number | null>(null);
  /** Synchronous mirrors so rapid pointermove events never use stale values. */
  const zoomRef = useRef(MIN_ZOOM);
  const offsetRef = useRef<Offset>({ x: 0, y: 0 });

  // Load the picked file once. The object URL lives only while this file is
  // active; all state updates happen in async load callbacks.
  useEffect(() => {
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      zoomRef.current = MIN_ZOOM;
      offsetRef.current = { x: 0, y: 0 };
      setZoom(MIN_ZOOM);
      setOffset({ x: 0, y: 0 });
      setLoaded({ file, url, image });
    };
    image.onerror = () => {
      if (cancelled) return;
      URL.revokeObjectURL(url);
      setErrorFile(file);
    };
    image.src = url;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  /** Zoom while keeping the focal point (screen coords, frame center = 0,0) fixed. */
  const applyZoom = (nextRaw: number, focal: Offset) => {
    if (!img) return;
    const z = zoomRef.current;
    const off = offsetRef.current;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextRaw));
    const ratio = next / z;
    const nextOffset = clampOffset(
      img,
      {
        x: focal.x - (focal.x - off.x) * ratio,
        y: focal.y - (focal.y - off.y) * ratio,
      },
      next,
    );
    zoomRef.current = next;
    offsetRef.current = nextOffset;
    setZoom(next);
    setOffset(nextOffset);
  };

  // Wheel zoom (desktop) — non-passive so the page doesn't scroll.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const focal = {
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      };
      applyZoom(zoom * Math.exp(-e.deltaY * 0.002), focal);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const pointerDistance = () => {
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) return null;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  const pointerMidpoint = (): Offset => {
    const el = frameRef.current;
    const pts = [...pointersRef.current.values()];
    if (!el || pts.length < 2) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: (pts[0].x + pts[1].x) / 2 - rect.left - rect.width / 2,
      y: (pts[0].y + pts[1].y) / 2 - rect.top - rect.height / 2,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!img) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pinchDistRef.current = pointerDistance();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!img) return;
    const prev = pointersRef.current.get(e.pointerId);
    if (!prev) return;
    const current = { x: e.clientX, y: e.clientY };
    pointersRef.current.set(e.pointerId, current);

    if (pointersRef.current.size >= 2) {
      // Pinch: scale by the change in finger distance around their midpoint.
      const dist = pointerDistance();
      if (dist && pinchDistRef.current) {
        applyZoom(
          zoomRef.current * (dist / pinchDistRef.current),
          pointerMidpoint(),
        );
      }
      pinchDistRef.current = dist;
    } else {
      // Pan with a single finger.
      const nextOffset = clampOffset(
        img,
        {
          x: offsetRef.current.x + (current.x - prev.x),
          y: offsetRef.current.y + (current.y - prev.y),
        },
        zoomRef.current,
      );
      offsetRef.current = nextOffset;
      setOffset(nextOffset);
    }
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchDistRef.current = null;
    if (
      pointersRef.current.size === 0 &&
      e.currentTarget.hasPointerCapture?.(e.pointerId)
    ) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  /** Render the framed circle to a 512px JPEG and hand it back. */
  const apply = async () => {
    if (!img) return;
    setBusy(true);
    try {
      const eff = coverScale(img) * zoom;
      const size = FRAME / eff;
      let sx = img.naturalWidth / 2 + (offset.x - FRAME / 2) / eff;
      let sy = img.naturalHeight / 2 + (offset.y - FRAME / 2) / eff;
      sx = Math.max(0, Math.min(img.naturalWidth - size, sx));
      sy = Math.max(0, Math.min(img.naturalHeight - size, sy));

      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#0c0c0c";
      ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
      ctx.drawImage(img, sx, sy, size, size, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("Could not export image");
      await onDone(blob);
    } catch (error) {
      console.error("Photo crop failed:", error);
      setErrorFile(file);
      setBusy(false);
    }
  };

  const eff = img ? coverScale(img) * zoom : 1;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
      />
      <div className="rise-in relative w-full max-w-[360px] rounded-2xl border border-border bg-[#0c0c0c] p-5">
        <h3 className="text-[16px] font-bold">Adjust your photo</h3>
        <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
          Drag to reposition — pinch, scroll or slide to zoom.
        </p>

        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className="relative mx-auto mt-4 overflow-hidden rounded-full border border-border bg-secondary"
          style={{
            width: FRAME,
            height: FRAME,
            touchAction: "none",
            cursor: img ? "grab" : "default",
          }}
        >
          {!img && !loadError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!img && loadError && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[12px] text-muted-foreground">
              Couldn&apos;t read this image. Try another one.
            </div>
          )}
          {img && (
            <img
              src={imageUrl ?? ""}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: img.naturalWidth * eff,
                height: img.naturalHeight * eff,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!img}
            onChange={(e) =>
              applyZoom(parseFloat(e.target.value), { x: 0, y: 0 })
            }
            className="w-full accent-[#B6FF00]"
            aria-label="Zoom"
          />
        </div>

        <div className="mt-4 flex gap-2.5">
          <Button
            variant="secondary"
            className="h-10 flex-1 rounded-xl border border-border"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            className="h-10 flex-1 rounded-xl"
            onClick={() => void apply()}
            disabled={busy || !img}
          >
            {busy ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Use photo"
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
