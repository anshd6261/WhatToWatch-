"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useFx } from "./FxLayer";

/* eslint-disable @next/next/no-img-element */

export function Poster({
  src,
  alt,
  className = "",
  lens = true,
}: {
  src?: string;
  alt: string;
  className?: string;
  lens?: boolean;
}) {
  const fx = useFx();
  const useLens = lens && fx.lens;
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div
        className={`grid place-items-center bg-white/[0.03] ${className}`}
        aria-label={alt}
      >
        <span className="px-4 text-center text-[11px] uppercase tracking-widest text-white/25">
          {alt}
        </span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className={`object-cover ${useLens ? "lens" : ""} ${className}`}
    />
  );
}

/** Monochrome white silhouette of a streaming-service logo in a circle. */
export function ProviderIcon({
  name,
  logo,
  url,
}: {
  name: string;
  logo?: string;
  url?: string;
}) {
  const inner = (
    <span
      title={name}
      className="floaty grid h-11 w-11 place-items-center overflow-hidden rounded-full glass"
    >
      {logo ? (
        <img
          src={logo}
          alt={name}
          className="h-6 w-6 object-contain"
          style={{ filter: "grayscale(1) brightness(0) invert(1)" }}
        />
      ) : (
        <span className="text-[11px] font-medium text-white/80">
          {name.slice(0, 2)}
        </span>
      )}
    </span>
  );
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" aria-label={`Open on ${name}`}>
      {inner}
    </a>
  ) : (
    inner
  );
}

export function Rating({
  value,
  onChange,
  size = 16,
  readOnly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n === value ? 0 : n)}
          className="floaty disabled:cursor-default"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star
            size={size}
            className={n <= value ? "text-white" : "text-white/25"}
            fill={n <= value ? "currentColor" : "none"}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-white/45">
      <span className="h-4 w-4 animate-spin rounded-full border border-white/20 border-t-white/80" />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}
