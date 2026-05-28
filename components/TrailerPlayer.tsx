"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { useFx } from "./FxLayer";

/* eslint-disable @next/next/no-img-element */

export function TrailerPlayer({
  ytKey,
  poster,
  title,
}: {
  ytKey?: string;
  poster?: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);
  const { lens } = useFx();

  if (!ytKey) return null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[26px] glass">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${ytKey}?autoplay=1&rel=0&modestbranding=1`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          title={`${title} — trailer`}
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 h-full w-full"
          aria-label={`Play ${title} trailer`}
        >
          {poster ? (
            <img
              src={poster}
              alt=""
              className={`h-full w-full object-cover opacity-55 transition-opacity duration-500 group-hover:opacity-70 ${
                lens ? "lens" : ""
              }`}
            />
          ) : (
            <div className="absolute inset-0 bg-white/[0.03]" />
          )}
          <span className="absolute inset-0 grid place-items-center">
            <span className="floaty grid h-16 w-16 place-items-center rounded-full glass-strong">
              <Play size={24} className="ml-0.5 text-white" fill="currentColor" />
            </span>
          </span>
          <span className="absolute bottom-4 left-5 text-sm tracking-wide text-white/80">
            Play trailer
          </span>
        </button>
      )}
    </div>
  );
}
