"use client";

import { useCallback, useEffect, useState } from "react";
import type { LibraryItem, Status, TitleDetail } from "./types";
import { useBackend } from "./backend-context";

function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type Library = {
  items: LibraryItem[];
  ready: boolean;
  has: (type: string, externalId: string) => boolean;
  add: (detail: TitleDetail, status?: Status) => void;
  remove: (id: string) => void;
  move: (id: string, status: Status) => void;
  rate: (id: string, rating: number) => void;
  setNote: (id: string, note: string) => void;
};

export function useLibrary(): Library {
  const { backend } = useBackend();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setReady(false);
    backend.load().then((loaded) => {
      if (alive) {
        setItems(loaded);
        setReady(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [backend]);

  const has = useCallback(
    (type: string, externalId: string) =>
      items.some((i) => i.type === type && i.externalId === externalId),
    [items],
  );

  const add = useCallback(
    (detail: TitleDetail, status: Status = "backlog") => {
      setItems((prev) => {
        if (
          prev.some(
            (i) => i.type === detail.type && i.externalId === detail.externalId,
          )
        ) {
          return prev;
        }
        const item: LibraryItem = {
          ...detail,
          id: uid(),
          status,
          rating: 0,
          addedAt: Date.now(),
        };
        backend.upsert(item).catch(() => {});
        return [item, ...prev];
      });
    },
    [backend],
  );

  const mutate = useCallback(
    (id: string, fn: (i: LibraryItem) => LibraryItem) => {
      setItems((prev) => {
        const next = prev.map((i) => (i.id === id ? fn(i) : i));
        const changed = next.find((i) => i.id === id);
        if (changed) backend.upsert(changed).catch(() => {});
        return next;
      });
    },
    [backend],
  );

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      backend.remove(id).catch(() => {});
    },
    [backend],
  );

  const move = useCallback(
    (id: string, status: Status) =>
      mutate(id, (i) => ({
        ...i,
        status,
        finishedAt: status === "done" ? Date.now() : i.finishedAt,
      })),
    [mutate],
  );

  const rate = useCallback(
    (id: string, rating: number) => mutate(id, (i) => ({ ...i, rating })),
    [mutate],
  );

  const setNote = useCallback(
    (id: string, note: string) => mutate(id, (i) => ({ ...i, note })),
    [mutate],
  );

  return { items, ready, has, add, remove, move, rate, setNote };
}
