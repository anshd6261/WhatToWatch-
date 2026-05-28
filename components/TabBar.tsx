"use client";

import { motion } from "motion/react";
import type { MediaType } from "@/lib/types";
import { MEDIA_TYPES, TAB_LABEL } from "@/lib/labels";

export function TabBar({
  active,
  onChange,
}: {
  active: MediaType;
  onChange: (t: MediaType) => void;
}) {
  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5 rounded-full glass p-1.5">
      {MEDIA_TYPES.map((t) => {
        const isActive = t === active;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className="relative rounded-full px-5 py-2 text-sm font-medium transition-colors duration-500"
            data-active={isActive}
          >
            {isActive && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-full bg-white"
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            <span
              className={`relative z-10 ${
                isActive ? "text-black" : "text-white/55 hover:text-white/90"
              }`}
            >
              {TAB_LABEL[t]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
