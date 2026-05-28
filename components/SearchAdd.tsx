"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, Plus, Link2 } from "lucide-react";
import type { MediaType, TitleResult } from "@/lib/types";
import { ADD_VERB } from "@/lib/labels";
import { Poster, Spinner } from "./atoms";

export function SearchAdd({
  type,
  onPick,
  onQuickAdd,
}: {
  type: MediaType;
  onPick: (type: MediaType, externalId: string) => void;
  onQuickAdd: (type: MediaType, externalId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TitleResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const isLink = type === "other";

  useEffect(() => {
    setQ("");
    setResults([]);
    setOpen(false);
  }, [type]);

  useEffect(() => {
    if (!q.trim() || (isLink && !/\./.test(q))) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?type=${type}&q=${encodeURIComponent(q)}`, {
        signal: ctrl.signal,
      })
        .then((r) => r.json())
        .then((d) => {
          setResults(d.results || []);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, isLink ? 150 : 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, type, isLink]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (r: TitleResult) => {
    onPick(r.type, r.externalId);
    setQ("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative mx-auto w-full max-w-xl">
      <div className="floaty flex items-center gap-3 rounded-full glass px-5 py-3.5">
        {isLink ? (
          <Link2 size={18} className="shrink-0 text-white/45" />
        ) : (
          <Search size={18} className="shrink-0 text-white/45" />
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={ADD_VERB[type] + "…"}
          inputMode={isLink ? "url" : "search"}
          className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/30"
        />
        {loading && <Spinner />}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-full z-50 mt-3 max-h-[60vh] overflow-y-auto rounded-[26px] glass-strong p-2"
          >
            {results.map((r) => (
              <div
                key={`${r.source}:${r.externalId}`}
                className="flex items-center gap-3 rounded-[20px] p-2 transition-colors duration-300 hover:bg-white/[0.05]"
              >
                <button
                  type="button"
                  onClick={() => pick(r)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Poster
                    src={r.posterUrl}
                    alt={r.title}
                    lens={false}
                    className="h-16 w-11 shrink-0 rounded-xl"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white/90">
                      {r.title}
                    </span>
                    <span className="block truncate text-xs text-white/40">
                      {[r.year, r.overview].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onQuickAdd(r.type, r.externalId);
                    setQ("");
                    setResults([]);
                    setOpen(false);
                  }}
                  className="floaty grid h-9 w-9 shrink-0 place-items-center rounded-full glass"
                  aria-label="Add to list"
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
