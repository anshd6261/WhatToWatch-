"use client";

import { AnimatePresence } from "motion/react";
import type { LibraryItem, MediaType, Status } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/labels";
import { MediaCard } from "./MediaCard";

export function Column({
  type,
  status,
  items,
  onOpen,
}: {
  type: MediaType;
  status: Status;
  items: LibraryItem[];
  onOpen: (item: LibraryItem) => void;
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="mb-5 flex items-baseline justify-between">
        <h3 className="text-sm font-medium tracking-wide text-white/80">
          {STATUS_LABEL[type][status]}
        </h3>
        <span className="text-xs tabular-nums text-white/30">{items.length}</span>
      </header>

      {items.length === 0 ? (
        <p className="rounded-[26px] border border-dashed border-white/10 px-4 py-10 text-center text-xs text-white/25">
          Nothing here yet
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <MediaCard key={item.id} item={item} onOpen={onOpen} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

export function Divider() {
  return <div className="divider-v mx-2 hidden lg:block" aria-hidden />;
}
