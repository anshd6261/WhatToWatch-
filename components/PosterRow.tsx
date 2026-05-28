"use client";

import { Plus, Check } from "lucide-react";
import { Poster } from "./atoms";
import type { RecResult } from "@/lib/types";

export function PosterRow({
  items,
  onSelect,
  onAdd,
  isAdded,
}: {
  items: RecResult[];
  onSelect?: (item: RecResult) => void;
  onAdd?: (item: RecResult) => void;
  isAdded?: (item: RecResult) => boolean;
}) {
  if (!items.length) return null;
  return (
    <div className="row-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
      {items.map((it) => {
        const added = isAdded?.(it);
        return (
          <div key={`${it.type}:${it.externalId}`} className="w-[150px] shrink-0">
            <button
              type="button"
              onClick={() => onSelect?.(it)}
              className="floaty block w-full overflow-hidden rounded-[26px] glass"
            >
              <Poster
                src={it.posterUrl}
                alt={it.title}
                className="aspect-[2/3] w-full"
              />
            </button>
            <div className="mt-2.5 flex items-start justify-between gap-2 px-1">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-white/90">
                  {it.title}
                </p>
                {(it.because || it.reason || it.year) && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/40">
                    {it.because || it.reason || it.year}
                  </p>
                )}
              </div>
              {onAdd && (
                <button
                  type="button"
                  onClick={() => !added && onAdd(it)}
                  className="floaty mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full glass"
                  aria-label={added ? "In your library" : "Add"}
                >
                  {added ? (
                    <Check size={13} className="text-white/70" />
                  ) : (
                    <Plus size={14} className="text-white" />
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
