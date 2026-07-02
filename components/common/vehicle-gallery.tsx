"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, Images } from "lucide-react";

type Props = {
  images: string[];
  vehicleName: string;
};

export default function VehicleGallery({ images, vehicleName }: Props) {
  const [active, setActive]     = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  const validImages = images.filter((_, i) => !imgErrors[i]);

  const prev = useCallback(() => {
    setActive((a) => (a - 1 + validImages.length) % validImages.length);
  }, [validImages.length]);

  const next = useCallback(() => {
    setActive((a) => (a + 1) % validImages.length);
  }, [validImages.length]);

  // Keyboard nav inside lightbox
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape")     setLightbox(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, prev, next]);

  if (images.length === 0 || validImages.length === 0) return null;

  // Clamp active to valid range
  const safeActive = Math.min(active, validImages.length - 1);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Images className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900">Vehicle Photos</h2>
          </div>
          <span className="text-xs font-medium text-slate-400">
            {validImages.length} photo{validImages.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="p-3 space-y-3">
          {/* Main image */}
          <div
            className="group relative overflow-hidden rounded-xl bg-slate-100 cursor-zoom-in"
            onClick={() => setLightbox(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={safeActive}
              src={validImages[safeActive]}
              alt={`${vehicleName} photo ${safeActive + 1}`}
              className="h-64 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              onError={() => setImgErrors((e) => ({ ...e, [safeActive]: true }))}
            />

            {/* Overlay gradient + zoom hint */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-between px-4 pb-3">
              <span className="text-xs font-semibold text-white/90">
                {safeActive + 1} / {validImages.length}
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-white/90">
                <ZoomIn className="h-3.5 w-3.5" /> View full
              </span>
            </div>

            {/* Prev / Next arrows on main image */}
            {validImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); prev(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-md opacity-0 group-hover:opacity-100 hover:bg-white transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); next(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-md opacity-0 group-hover:opacity-100 hover:bg-white transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          {validImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {validImages.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={[
                    "shrink-0 overflow-hidden rounded-lg transition-all duration-200",
                    i === safeActive
                      ? "ring-2 ring-indigo-500 ring-offset-2 opacity-100"
                      : "ring-1 ring-slate-200 opacity-60 hover:opacity-90",
                  ].join(" ")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Thumbnail ${i + 1}`}
                    className="h-14 w-20 object-cover"
                    onError={() => setImgErrors((e) => ({ ...e, [i]: true }))}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
        >
          {/* Close */}
          <button
            type="button"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
            onClick={() => setLightbox(false)}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1 text-xs font-semibold text-white">
            {safeActive + 1} / {validImages.length}
          </div>

          {/* Image */}
          <div
            className="relative max-h-[85vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={safeActive}
              src={validImages[safeActive]}
              alt={`${vehicleName} photo ${safeActive + 1}`}
              className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            />
          </div>

          {/* Nav buttons */}
          {validImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Thumbnail row in lightbox */}
          {validImages.length > 1 && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[80vw] pb-1"
              onClick={(e) => e.stopPropagation()}
            >
              {validImages.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={[
                    "shrink-0 overflow-hidden rounded-lg transition-all",
                    i === safeActive
                      ? "ring-2 ring-white opacity-100"
                      : "opacity-50 hover:opacity-80",
                  ].join(" ")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-12 w-16 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
