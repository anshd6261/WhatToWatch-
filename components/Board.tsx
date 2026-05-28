"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import type { MediaType, Status, TitleDetail } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/labels";
import { useLibrary } from "@/lib/store";
import { useBackend } from "@/lib/backend-context";
import { TabBar } from "./TabBar";
import { SearchAdd } from "./SearchAdd";
import { ForYou } from "./ForYou";
import { Column, Divider } from "./Column";
import { CardModal } from "./CardModal";
import { FxToggle } from "./FxToggle";
import { Spinner } from "./atoms";

async function fetchDetail(
  type: MediaType,
  externalId: string,
): Promise<TitleDetail | null> {
  try {
    const r = await fetch(
      `/api/detail?type=${type}&id=${encodeURIComponent(externalId)}`,
    );
    const d = await r.json();
    return (d.detail as TitleDetail) || null;
  } catch {
    return null;
  }
}

const pageVariants: Variants = {
  initial: { opacity: 0, y: -16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: 16,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Board() {
  const library = useLibrary();
  const { mode, email, signOut } = useBackend();
  const [tab, setTab] = useState<MediaType>("movie");
  const [seed, setSeed] = useState<TitleDetail | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);

  const openByRef = useCallback(async (type: MediaType, externalId: string) => {
    setSeedLoading(true);
    const detail = await fetchDetail(type, externalId);
    setSeedLoading(false);
    if (detail) setSeed(detail);
  }, []);

  const addByRef = useCallback(
    async (type: MediaType, externalId: string, status: Status = "backlog") => {
      if (library.has(type, externalId)) return;
      const detail = await fetchDetail(type, externalId);
      if (detail) library.add(detail, status);
    },
    [library],
  );

  const libItem = useMemo(() => {
    if (!seed) return undefined;
    return library.items.find(
      (i) => i.type === seed.type && i.externalId === seed.externalId,
    );
  }, [seed, library.items]);

  const tabItems = useMemo(
    () => library.items.filter((i) => i.type === tab),
    [library.items, tab],
  );

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
      {/* Header */}
      <header className="mb-10 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">WhatToWatch</h1>
          <p className="text-xs text-white/35">your screen, in order</p>
        </div>
        <div className="flex items-center gap-3">
          {mode === "cloud" && signOut && (
            <button
              type="button"
              onClick={signOut}
              title={email ? `Signed in as ${email} — sign out` : "Sign out"}
              className="pill floaty px-4 py-2 text-xs text-white/60 hover:text-white"
            >
              Sign out
            </button>
          )}
          <FxToggle />
        </div>
      </header>

      <div className="mb-8 flex flex-col items-center gap-6">
        <TabBar active={tab} onChange={setTab} />
        <SearchAdd type={tab} onPick={openByRef} onQuickAdd={addByRef} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {library.ready && (
            <ForYou
              type={tab}
              items={library.items}
              onOpenSeed={openByRef}
              onAdd={addByRef}
              isAdded={library.has}
            />
          )}

          <div className="flex flex-col gap-8 lg:flex-row lg:gap-2">
            {STATUS_ORDER.map((status, idx) => (
              <div key={status} className="flex min-w-0 flex-1 lg:contents">
                {idx > 0 && <Divider />}
                <Column
                  type={tab}
                  status={status}
                  items={tabItems.filter((i) => i.status === status)}
                  onOpen={(item) => setSeed(item)}
                />
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {seedLoading && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 backdrop-blur-sm">
          <Spinner label="Loading…" />
        </div>
      )}

      {seed && (
        <CardModal
          seed={seed}
          libItem={libItem}
          library={library}
          onClose={() => setSeed(null)}
          onOpenSeed={openByRef}
        />
      )}
    </div>
  );
}
