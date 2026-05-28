import "server-only";
import type { MediaType, SimilarResult, TitleDetail } from "@/lib/types";
import { relatedTmdb, tmdbConfigured } from "@/lib/tmdb";
import { discoverBooks } from "@/lib/books";
import { embed, rerankJSON } from "@/lib/ai";
import { composeText, cosine } from "./vector";

type CacheEntry = { at: number; data: SimilarResult[] };
const cache = new Map<string, CacheEntry>();
const TTL = 1000 * 60 * 60 * 12; // 12h

async function candidatePool(seed: TitleDetail): Promise<TitleDetail[]> {
  if (seed.type === "book") {
    const cats = [...seed.genres, ...seed.keywords].filter(Boolean);
    const list = await discoverBooks(cats.length ? cats : [seed.title]);
    return list
      .filter((b) => b.externalId !== seed.externalId)
      .map((b) => ({ ...b, providers: [], genres: [], keywords: [], people: [] }));
  }
  if (seed.type === "other") return [];
  if (!tmdbConfigured()) return [];
  const list = await relatedTmdb(seed.type, seed.externalId);
  return list.filter((c) => c.externalId !== seed.externalId);
}

type RerankShape = { ranked: { id: string; reason: string }[] };

export async function similarTitles(seed: TitleDetail): Promise<SimilarResult[]> {
  const key = `${seed.type}:${seed.externalId}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  let pool = await candidatePool(seed);
  if (pool.length === 0) {
    cache.set(key, { at: Date.now(), data: [] });
    return [];
  }

  // 1) Semantic k-NN with the large embedding model
  const seedText = composeText(seed);
  const poolTexts = pool.map((c) => composeText(c));
  const vecs = await embed([seedText, ...poolTexts], { large: true });

  if (vecs) {
    const seedVec = vecs[0];
    const scored = pool.map((c, i) => ({ c, sim: cosine(seedVec, vecs[i + 1]) }));
    scored.sort((a, b) => b.sim - a.sim);
    pool = scored.slice(0, 12).map((s) => s.c);
  } else {
    pool = pool.slice(0, 12);
  }

  // 2) Large-model re-rank by true likeness + one-line reasons
  const reasons = new Map<string, string>();
  const numbered = pool
    .map(
      (c, i) =>
        `${i + 1}. [id:${c.externalId}] ${c.title}${c.year ? ` (${c.year})` : ""}${
          c.overview ? ` — ${c.overview.slice(0, 240)}` : ""
        }`,
    )
    .join("\n");

  const rer = await rerankJSON<RerankShape>(
    "You are a discerning film/TV/book curator. Rank candidates by how genuinely SIMILAR they are to the seed in tone, theme, mood and subject — not just shared genre. Return JSON {\"ranked\":[{\"id\":string,\"reason\":string}]} ordered best-first, max 8, each reason one short sentence on WHY it's alike. Use only the provided ids.",
    `SEED: ${seed.title}${seed.year ? ` (${seed.year})` : ""}\n${
      seed.overview ? `About: ${seed.overview.slice(0, 400)}\n` : ""
    }${seed.genres.length ? `Genres: ${seed.genres.join(", ")}\n` : ""}\nCANDIDATES:\n${numbered}`,
  );

  let ordered = pool;
  if (rer?.ranked?.length) {
    const byId = new Map(pool.map((c) => [c.externalId, c]));
    const picked: TitleDetail[] = [];
    for (const r of rer.ranked) {
      const c = byId.get(String(r.id));
      if (c) {
        picked.push(c);
        if (r.reason) reasons.set(c.externalId, r.reason.trim());
      }
    }
    if (picked.length) ordered = picked;
  }

  const data: SimilarResult[] = ordered.slice(0, 8).map((c) => ({
    type: c.type,
    externalId: c.externalId,
    title: c.title,
    year: c.year,
    posterUrl: c.posterUrl,
    reason: reasons.get(c.externalId),
  }));

  cache.set(key, { at: Date.now(), data });
  return data;
}
