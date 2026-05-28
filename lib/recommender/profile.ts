import type { LibraryItem, TitleDetail } from "@/lib/types";
import { decade, overlap } from "./vector";

type Weighted = Record<string, number>;

export type TasteProfile = {
  genres: Weighted;
  keywords: Weighted;
  people: Weighted;
  languages: Weighted;
  decades: Weighted;
  centroid?: number[]; // mean embedding of liked items
  likedIds: string[];
  sampleSize: number;
};

function bump(map: Weighted, key: string | undefined, w: number) {
  if (!key) return;
  map[key] = (map[key] || 0) + w;
}

/** Signed weight for an item: liked items pull positive, disliked negative. */
export function itemWeight(item: LibraryItem, newest: number, oldest: number): number {
  const span = Math.max(1, newest - oldest);
  const recency = 0.7 + 0.3 * ((item.addedAt - oldest) / span);
  let base: number;
  if (item.rating >= 4) base = item.rating === 5 ? 1.6 : 1.2;
  else if (item.rating > 0 && item.rating <= 2) base = -0.85;
  else base = item.status === "done" ? 0.9 : item.status === "active" ? 0.6 : 0.3;
  return base * recency;
}

export function buildProfile(
  items: LibraryItem[],
  embeddings?: Map<string, number[]>,
): TasteProfile {
  const profile: TasteProfile = {
    genres: {},
    keywords: {},
    people: {},
    languages: {},
    decades: {},
    likedIds: [],
    sampleSize: items.length,
  };
  if (items.length === 0) return profile;

  const newest = Math.max(...items.map((i) => i.addedAt));
  const oldest = Math.min(...items.map((i) => i.addedAt));

  const likedVecs: number[][] = [];
  const likedWeights: number[] = [];

  for (const item of items) {
    const w = itemWeight(item, newest, oldest);
    for (const g of item.genres || []) bump(profile.genres, g, w);
    for (const k of (item.keywords || []).slice(0, 12)) bump(profile.keywords, k, w);
    for (const p of item.people || []) bump(profile.people, p.name, w);
    bump(profile.languages, item.language, w);
    bump(profile.decades, decade(item.year), w);

    if (w > 0) {
      profile.likedIds.push(item.externalId);
      const vec = embeddings?.get(item.externalId);
      if (vec) {
        likedVecs.push(vec);
        likedWeights.push(w);
      }
    }
  }

  if (likedVecs.length) {
    const dim = likedVecs[0].length;
    const c = new Array(dim).fill(0);
    let wsum = 0;
    likedVecs.forEach((v, i) => {
      wsum += likedWeights[i];
      for (let d = 0; d < dim; d++) c[d] += v[d] * likedWeights[i];
    });
    profile.centroid = wsum ? c.map((x) => x / wsum) : c;
  }
  return profile;
}

function avgProfileScore(map: Weighted, keys: string[] = []): number {
  if (!keys.length) return 0;
  const max = Math.max(1, ...Object.values(map).map(Math.abs));
  let sum = 0;
  for (const k of keys) sum += (map[k] || 0) / max;
  return sum / keys.length;
}

/** Metadata affinity of a candidate to the taste profile, roughly -1..1. */
export function metadataAffinity(
  profile: TasteProfile,
  cand: TitleDetail,
): number {
  const g = avgProfileScore(profile.genres, cand.genres);
  const k = avgProfileScore(profile.keywords, cand.keywords);
  const ppl = avgProfileScore(
    profile.people,
    (cand.people || []).map((p) => p.name),
  );
  const lang = avgProfileScore(
    profile.languages,
    cand.language ? [cand.language] : [],
  );
  const dec = avgProfileScore(
    profile.decades,
    decade(cand.year) ? [decade(cand.year)!] : [],
  );
  return 0.4 * g + 0.25 * k + 0.2 * ppl + 0.08 * lang + 0.07 * dec;
}

export function qualityPrior(cand: TitleDetail): number {
  return cand.voteAverage ? Math.min(1, cand.voteAverage / 10) : 0.5;
}

/** Best human-readable reason a candidate matches the profile. */
export function explain(
  profile: TasteProfile,
  cand: TitleDetail,
  likedTitles: Map<string, string>,
  nearestLikedId?: string,
): string {
  if (nearestLikedId && likedTitles.has(nearestLikedId)) {
    return `Because you liked ${likedTitles.get(nearestLikedId)}`;
  }
  const topGenre = (cand.genres || [])
    .filter((g) => profile.genres[g] > 0)
    .sort((a, b) => (profile.genres[b] || 0) - (profile.genres[a] || 0))[0];
  if (topGenre) return `More ${topGenre.toLowerCase()} you might like`;
  const topKw = (cand.keywords || []).find((k) => profile.keywords[k] > 0);
  if (topKw) return `Matches your taste for ${topKw}`;
  return "Picked for you";
}
