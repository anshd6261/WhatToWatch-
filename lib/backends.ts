"use client";

import type { LibraryItem } from "./types";
import { getSupabase } from "./supabase";

export type Backend = {
  load: () => Promise<LibraryItem[]>;
  upsert: (item: LibraryItem) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const LOCAL_KEY = "wtw:library:v1";

function readLocal(): LibraryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as LibraryItem[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: LibraryItem[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function localBackend(): Backend {
  return {
    async load() {
      return readLocal();
    },
    async upsert(item) {
      const items = readLocal();
      const idx = items.findIndex((i) => i.id === item.id);
      if (idx >= 0) items[idx] = item;
      else items.unshift(item);
      writeLocal(items);
    },
    async remove(id) {
      writeLocal(readLocal().filter((i) => i.id !== id));
    },
  };
}

/** Maps a LibraryItem to a Supabase row (full item kept in `item` jsonb). */
function toRow(userId: string, item: LibraryItem) {
  return {
    id: item.id,
    user_id: userId,
    type: item.type,
    external_id: item.externalId,
    status: item.status,
    rating: item.rating,
    added_at: item.addedAt,
    item,
  };
}

export function supabaseBackend(userId: string): Backend {
  const sb = getSupabase();
  return {
    async load() {
      if (!sb) return readLocal();
      const { data, error } = await sb
        .from("items")
        .select("item")
        .order("added_at", { ascending: false });
      if (error || !data) return [];
      return data.map((r) => r.item as LibraryItem);
    },
    async upsert(item) {
      if (!sb) return;
      await sb.from("items").upsert(toRow(userId, item));
    },
    async remove(id) {
      if (!sb) return;
      await sb.from("items").delete().eq("id", id);
    },
  };
}

/** One-time migration of any local items into the cloud on first sign-in. */
export async function migrateLocalToCloud(backend: Backend): Promise<number> {
  const local = readLocal();
  if (!local.length) return 0;
  const cloud = await backend.load();
  const have = new Set(cloud.map((i) => `${i.type}:${i.externalId}`));
  let moved = 0;
  for (const item of local) {
    if (!have.has(`${item.type}:${item.externalId}`)) {
      await backend.upsert(item);
      moved++;
    }
  }
  if (moved > 0) writeLocal([]); // clear local once safely in the cloud
  return moved;
}
