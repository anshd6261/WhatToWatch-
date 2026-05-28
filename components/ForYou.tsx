"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { LibraryItem, MediaType, RecResult } from "@/lib/types";
import { PosterRow } from "./PosterRow";
import { Spinner } from "./atoms";

export function ForYou({
  type,
  items,
  onOpenSeed,
  onAdd,
  isAdded,
}: {
  type: MediaType;
  items: LibraryItem[];
  onOpenSeed: (type: MediaType, externalId: string) => void;
  onAdd: (type: MediaType, externalId: string) => void;
  isAdded: (type: MediaType, externalId: string) => boolean;
}) {
  const [recs, setRecs] = useState<RecResult[] | null>(null);
  const [coldStart, setColdStart] = useState(false);

  const mine = useMemo(() => items.filter((i) => i.type === type), [items, type]);
  const signature = useMemo(
    () => mine.map((i) => `${i.externalId}:${i.status}:${i.rating}`).join("|"),
    [mine],
  );

  useEffect(() => {
    let alive = true;
    setRecs(null);
    const t = setTimeout(() => {
      fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, library: mine }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          setRecs(d.results || []);
          setColdStart(Boolean(d.coldStart));
        })
        .catch(() => alive && setRecs([]));
    }, 600);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, signature]);

  if (recs !== null && recs.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={15} className="text-white/55" />
        <h2 className="text-sm font-medium tracking-wide text-white/80">
          {coldStart ? "To get you started" : "For you"}
        </h2>
      </div>
      {recs === null ? (
        <Spinner label="Reading your taste…" />
      ) : (
        <PosterRow
          items={recs}
          onSelect={(it) => onOpenSeed(it.type, it.externalId)}
          onAdd={(it) => onAdd(it.type, it.externalId)}
          isAdded={(it) => isAdded(it.type, it.externalId)}
        />
      )}
    </section>
  );
}
