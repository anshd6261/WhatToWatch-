import "server-only";
import type {
  LibraryItem,
  MediaType,
  RecResult,
  TitleDetail,
  TitleResult,
} from "@/lib/types";
import {
  relatedTmdb,
  trendingDetailedTmdb,
  tmdbConfigured,
} from "@/lib/tmdb";
import { discoverBooks } from "@/lib/books";
import { embed } from "@/lib/ai";
import {
  buildProfile,
  explain,
  metadataAffinity,
  qualityPrior,
} from "./profile";
import { composeText, cosine, mmr } from "./vector";

const PREF: Record<string, number> = { done: 3, active: 2, backlog: 1 };

function byPreference(a: LibraryItem, b: LibraryItem): number {
  if (b.rating !== a.rating) return b.rating - a.rating;
  if (PREF[b.status] !== PREF[a.status]) return PREF[b.status] - PREF[a.status];
  return b.addedAt - a.addedAt;
}

function isPositive(i: LibraryItem): boolean {
  return i.rating >= 4 || (i.rating === 0 && i.status !== "backlog");
}

function asDetail(r: TitleResult): TitleDetail {
  return { ...r, providers: [], genres: [], keywords: [], people: [] };
}

function dedupe(list: TitleDetail[], exclude: Set<string>): TitleDetail[] {
  const seen = new Set<string>();
  const out: TitleDetail[] = [];
  for (const c of list) {
    if (exclude.has(c.externalId) || seen.has(c.externalId)) continue;
    seen.add(c.externalId);
    out.push(c);
  }
  return out;
}

export async function forYou(
  type: MediaType,
  library: LibraryItem[],
): Promise<{ results: RecResult[]; coldStart: boolean }> {
  const lib = library.filter((i) => i.type === type);
  const inLibrary = new Set(lib.map((i) => i.externalId));
  const seeds = [...lib].sort(byPreference);
  const positive = seeds.filter(isPositive).slice(0, 5);
  const coldStart = positive.length === 0;

  // ---- gather candidates ----
  let pool: TitleDetail[] = [];
  if (type === "book") {
    const cats = Array.from(
      new Set(positive.flatMap((s) => [...s.genres, ...s.keywords]).filter(Boolean)),
    );
    const seedsCats = cats.length ? cats : ["fiction", "bestseller", "literature"];
    pool = (await discoverBooks(seedsCats)).map(asDetail);
  } else if (tmdbConfigured()) {
    const related = await Promise.all(
      positive.map((s) => relatedTmdb(type, s.externalId).catch(() => [])),
    );
    pool = related.flat();
    pool.push(...(await trendingDetailedTmdb(type).catch(() => [])));
  }

  pool = dedupe(pool, inLibrary).slice(0, 60);
  if (pool.length === 0) return { results: [], coldStart };

  // ---- embeddings (optional) ----
  const seedTexts = positive.map((s) => composeText(s));
  const poolTexts = pool.map((c) => composeText(c));
  const vecs = await embed([...seedTexts, ...poolTexts]);

  const seedVec = new Map<string, number[]>();
  const poolVec = new Map<string, number[]>();
  if (vecs) {
    positive.forEach((s, i) => seedVec.set(s.externalId, vecs[i]));
    pool.forEach((c, i) => poolVec.set(c.externalId, vecs[positive.length + i]));
  }

  const profile = buildProfile(lib, seedVec);
  const likedTitles = new Map(positive.map((s) => [s.externalId, s.title]));

  // ---- score ----
  const scored = pool.map((cand) => {
    const cv = poolVec.get(cand.externalId);
    const sim = profile.centroid && cv ? cosine(cv, profile.centroid) : 0;
    const meta = Math.max(0, metadataAffinity(profile, cand));
    const qual = qualityPrior(cand);

    let nearestId: string | undefined;
    if (cv) {
      let best = -Infinity;
      for (const s of positive) {
        const sv = seedVec.get(s.externalId);
        if (!sv) continue;
        const d = cosine(cv, sv);
        if (d > best) {
          best = d;
          nearestId = s.externalId;
        }
      }
    }

    const rel = profile.centroid
      ? 0.55 * sim + 0.3 * meta + 0.15 * qual
      : coldStart
        ? qual
        : 0.7 * meta + 0.3 * qual;

    return {
      cand,
      rel,
      vec: cv,
      because: coldStart
        ? type === "book"
          ? "Popular right now"
          : "Trending this week"
        : explain(profile, cand, likedTitles, nearestId),
    };
  });

  const ranked = mmr(scored, 0.72, 18);

  return {
    results: ranked.map((r) => ({
      type,
      externalId: r.cand.externalId,
      title: r.cand.title,
      year: r.cand.year,
      posterUrl: r.cand.posterUrl,
      because: r.because,
      score: r.rel,
    })),
    coldStart,
  };
}
