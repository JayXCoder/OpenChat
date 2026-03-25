"use client";

import { useEffect, useId, useRef } from "react";

import { X } from "lucide-react";

export interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/85 p-4 motion-safe:transition-opacity motion-safe:duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="relative max-h-[min(92vh,1200px)] max-w-[min(96vw,1400px)] border-2 border-lime bg-paper p-2 shadow-none motion-safe:transition-transform motion-safe:duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <p id={titleId} className="sr-only">
          Expanded image: {alt}
        </p>
        <button
          ref={closeRef}
          type="button"
          className="absolute right-1 top-1 z-10 flex h-11 min-w-11 cursor-pointer items-center justify-center border-2 border-ink bg-lime text-ink transition-colors duration-200 hover:bg-ink hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          aria-label="Close image preview"
          onClick={onClose}
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element -- data URLs from user uploads */}
        <img src={src} alt={alt} className="max-h-[min(88vh,1160px)] max-w-full object-contain" />
      </div>
    </div>
  );
}
