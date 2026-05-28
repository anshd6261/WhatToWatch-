"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Aperture } from "lucide-react";
import { useFx } from "./FxLayer";

function Switch({
  label,
  on,
  onToggle,
  hint,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-6 rounded-2xl px-3 py-2.5 text-left transition-colors duration-300 hover:bg-white/[0.05]"
    >
      <span>
        <span className="block text-sm text-white/85">{label}</span>
        {hint && <span className="block text-[11px] text-white/35">{hint}</span>}
      </span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300 ${
          on ? "bg-white" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full transition-all duration-300 ${
            on ? "left-[18px] bg-black" : "left-0.5 bg-white/70"
          }`}
        />
      </span>
    </button>
  );
}

export function FxToggle() {
  const fx = useFx();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="floaty grid h-10 w-10 place-items-center rounded-full glass text-white/70 hover:text-white"
        aria-label="Visual effects"
      >
        <Aperture size={17} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-50 mt-3 w-64 rounded-[26px] glass-strong p-2"
          >
            <p className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-widest text-white/35">
              Lens & grain
            </p>
            <Switch
              label="Lens on art"
              hint="Subtle fisheye on posters"
              on={fx.lens}
              onToggle={() => fx.set({ lens: !fx.lens })}
            />
            <Switch
              label="Chromatic aberration"
              hint="Faint edge color split"
              on={fx.aberration}
              onToggle={() => fx.set({ aberration: !fx.aberration })}
            />
            <Switch
              label="Global fisheye"
              hint="Experimental — whole page"
              on={fx.fisheye}
              onToggle={() => fx.set({ fisheye: !fx.fisheye })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
