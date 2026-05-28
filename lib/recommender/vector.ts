import type { TitleDetail } from "@/lib/types";

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function centroid(vectors: number[][], weights?: number[]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const out = new Array(dim).fill(0);
  let wsum = 0;
  vectors.forEach((v, i) => {
    const w = weights?.[i] ?? 1;
    wsum += w;
    for (let d = 0; d < dim; d++) out[d] += v[d] * w;
  });
  if (wsum === 0) return out;
  return out.map((x) => x / wsum);
}

/** Composed text used to embed a title for semantic similarity. */
export function composeText(t: {
  title: string;
  year?: number;
  overview?: string;
  genres?: string[];
  keywords?: string[];
  people?: { name: string; role?: string }[];
}): string {
  const people = (t.people || [])
    .map((p) => (p.role ? `${p.role}: ${p.name}` : p.name))
    .slice(0, 8)
    .join(", ");
  return [
    `Title: ${t.title}${t.year ? ` (${t.year})` : ""}`,
    t.genres?.length ? `Genres: ${t.genres.join(", ")}` : "",
    t.keywords?.length ? `Themes: ${t.keywords.slice(0, 18).join(", ")}` : "",
    people ? `People: ${people}` : "",
    t.overview ? `Synopsis: ${t.overview}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Jaccard-style overlap of two string sets, normalized 0–1. */
export function overlap(a: string[] = [], b: string[] = []): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b.map((s) => s.toLowerCase()));
  let hit = 0;
  for (const x of a) if (setB.has(x.toLowerCase())) hit++;
  return hit / Math.sqrt(a.length * b.length);
}

/** Decade label for an item year, e.g. 1994 → "1990s". */
export function decade(year?: number): string | undefined {
  if (!year) return undefined;
  return `${Math.floor(year / 10) * 10}s`;
}

/** Maximal Marginal Relevance reorder for diversity.
 *  items must carry a `vec` (embedding) and `rel` (relevance score). */
export function mmr<T extends { vec?: number[]; rel: number }>(
  items: T[],
  lambda = 0.72,
  k = 20,
): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < k && pool.length) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const cand = pool[i];
      let maxSim = 0;
      if (cand.vec) {
        for (const p of picked) {
          if (p.vec) maxSim = Math.max(maxSim, cosine(cand.vec, p.vec));
        }
      }
      const score = lambda * cand.rel - (1 - lambda) * maxSim;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    picked.push(pool.splice(bestIdx, 1)[0]);
  }
  return picked;
}

export type Candidate = TitleDetail & { vec?: number[] };
