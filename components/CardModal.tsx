"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X, Trash2, ExternalLink } from "lucide-react";
import type { LibraryItem, RecResult, Status, TitleDetail } from "@/lib/types";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";
import type { Library } from "@/lib/store";
import { Poster, ProviderIcon, Rating, Spinner } from "./atoms";
import { TrailerPlayer } from "./TrailerPlayer";
import { PosterRow } from "./PosterRow";

export function CardModal({
  seed,
  libItem,
  library,
  onClose,
  onOpenSeed,
}: {
  seed: TitleDetail;
  libItem?: LibraryItem;
  library: Library;
  onClose: () => void;
  onOpenSeed: (type: TitleDetail["type"], externalId: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [similar, setSimilar] = useState<RecResult[] | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Engine B — semantic "Similar titles"
  useEffect(() => {
    let alive = true;
    setSimilar(null);
    if (seed.type === "other") {
      setSimilar([]);
      return;
    }
    fetch("/api/similar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seed }),
    })
      .then((r) => r.json())
      .then((d) => alive && setSimilar(d.results || []))
      .catch(() => alive && setSimilar([]));
    return () => {
      alive = false;
    };
  }, [seed]);

  if (!mounted) return null;

  const labels = STATUS_LABEL[seed.type];
  const people = seed.people || [];
  const credits = people.filter((p) => p.role !== "Cast").slice(0, 2);
  const cast = people.filter((p) => p.role === "Cast").slice(0, 4);

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md sm:p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative my-auto w-full max-w-3xl overflow-hidden rounded-[38px] glass-strong"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.99 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="floaty absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full glass"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="grid gap-6 p-6 sm:grid-cols-[200px_1fr] sm:p-8">
            <div className="mx-auto w-40 sm:mx-0 sm:w-full">
              <Poster
                src={seed.posterUrl}
                alt={seed.title}
                className="aspect-[2/3] w-full rounded-[26px]"
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-2xl font-semibold leading-tight tracking-tight">
                {seed.title}
              </h2>
              <p className="mt-1 text-sm text-white/45">
                {[seed.year, ...seed.genres.slice(0, 3)].filter(Boolean).join(" · ")}
              </p>

              {seed.overview && (
                <p className="mt-4 max-h-32 overflow-y-auto text-sm leading-relaxed text-white/70">
                  {seed.overview}
                </p>
              )}

              {(credits.length > 0 || cast.length > 0) && (
                <p className="mt-3 text-xs text-white/40">
                  {credits.map((p) => `${p.role}: ${p.name}`).join("  ·  ")}
                  {cast.length > 0 && (
                    <>
                      {credits.length ? "  ·  " : ""}
                      {cast.map((p) => p.name).join(", ")}
                    </>
                  )}
                </p>
              )}

              {seed.providers.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-[11px] uppercase tracking-widest text-white/35">
                    Where to watch
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {seed.providers.map((p) => (
                      <ProviderIcon
                        key={p.name}
                        name={p.name}
                        logo={p.slug || undefined}
                        url={p.url}
                      />
                    ))}
                  </div>
                </div>
              )}

              {seed.url && (
                <a
                  href={seed.url}
                  target="_blank"
                  rel="noreferrer"
                  className="pill floaty mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <ExternalLink size={14} /> Open link
                </a>
              )}
            </div>
          </div>

          {/* Trailer */}
          {seed.trailerKey && (
            <div className="px-6 pb-2 sm:px-8">
              <TrailerPlayer
                ytKey={seed.trailerKey}
                poster={seed.backdropUrl || seed.posterUrl}
                title={seed.title}
              />
            </div>
          )}

          {/* Status + rating */}
          <div className="flex flex-wrap items-center gap-3 px-6 py-5 sm:px-8">
            <div className="flex gap-2">
              {STATUS_ORDER.map((s: Status) => {
                const active = libItem?.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    data-active={active}
                    onClick={() =>
                      libItem ? library.move(libItem.id, s) : library.add(seed, s)
                    }
                    className="pill px-4 py-2 text-sm"
                  >
                    {labels[s]}
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-4">
              {libItem && (
                <Rating
                  value={libItem.rating}
                  onChange={(v) => library.rate(libItem.id, v)}
                />
              )}
              {libItem && (
                <button
                  type="button"
                  onClick={() => {
                    library.remove(libItem.id);
                    onClose();
                  }}
                  className="floaty grid h-9 w-9 place-items-center rounded-full glass text-white/60 hover:text-white"
                  aria-label="Remove from library"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {libItem && (
            <div className="px-6 pb-5 sm:px-8">
              <textarea
                defaultValue={libItem.note || ""}
                onBlur={(e) => library.setNote(libItem.id, e.target.value)}
                placeholder="One line you'll remember it by…"
                rows={2}
                className="w-full resize-none rounded-[20px] glass px-4 py-3 text-sm text-white/80 outline-none placeholder:text-white/25 focus:border-white/25"
              />
            </div>
          )}

          {/* Engine B — Similar titles */}
          {seed.type !== "other" && (
            <div className="border-t border-white/[0.06] px-6 py-6 sm:px-8">
              <p className="mb-3 text-[11px] uppercase tracking-widest text-white/35">
                Similar titles
              </p>
              {similar === null ? (
                <Spinner label="Finding genuinely-alike titles…" />
              ) : similar.length === 0 ? (
                <p className="text-sm text-white/35">
                  No close matches found.
                </p>
              ) : (
                <PosterRow
                  items={similar}
                  onSelect={(it) => onOpenSeed(it.type, it.externalId)}
                  onAdd={(it) => onOpenSeed(it.type, it.externalId)}
                  isAdded={(it) => library.has(it.type, it.externalId)}
                />
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
