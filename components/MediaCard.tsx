"use client";

import { motion } from "motion/react";
import type { LibraryItem } from "@/lib/types";
import { Poster } from "./atoms";
import { Star } from "lucide-react";

export function MediaCard({
  item,
  onOpen,
}: {
  item: LibraryItem;
  onOpen: (item: LibraryItem) => void;
}) {
  return (
    <motion.button
      type="button"
      layout
      onClick={() => onOpen(item)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="floaty block w-full overflow-hidden rounded-[26px] glass text-left"
    >
      <Poster src={item.posterUrl} alt={item.title} className="aspect-[2/3] w-full" />
      <div className="flex items-start justify-between gap-2 px-3.5 py-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-white/90">
            {item.title}
          </p>
          {item.year ? (
            <p className="text-[11px] text-white/40">{item.year}</p>
          ) : null}
        </div>
        {item.rating > 0 && (
          <span className="mt-0.5 flex shrink-0 items-center gap-1 text-[11px] text-white/70">
            <Star size={11} fill="currentColor" /> {item.rating}
          </span>
        )}
      </div>
    </motion.button>
  );
}
