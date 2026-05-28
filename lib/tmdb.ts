import "server-only";
import type {
  MediaType,
  Person,
  Provider,
  TitleDetail,
  TitleResult,
} from "./types";

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const REGION = process.env.TMDB_WATCH_REGION || "US";

export function tmdbConfigured(): boolean {
  return Boolean(process.env.TMDB_API_KEY || process.env.TMDB_ACCESS_TOKEN);
}

function authedUrl(path: string, params: Record<string, string> = {}): {
  url: string;
  headers: HeadersInit;
} {
  const sp = new URLSearchParams({ language: "en-US", ...params });
  const headers: HeadersInit = {};
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (process.env.TMDB_API_KEY) {
    sp.set("api_key", process.env.TMDB_API_KEY);
  }
  return { url: `${BASE}${path}?${sp.toString()}`, headers };
}

async function tmdb<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const { url, headers } = authedUrl(path, params);
  const res = await fetch(url, { headers, next: { revalidate: 60 * 60 } });
  if (!res.ok) {
    throw new Error(`TMDB ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const tvOrMovie = (t: MediaType) => (t === "series" ? "tv" : "movie");

function poster(path?: string | null, size = "w500") {
  return path ? `${IMG}/${size}${path}` : undefined;
}

function yearOf(s?: string | null): number | undefined {
  if (!s) return undefined;
  const y = parseInt(s.slice(0, 4), 10);
  return Number.isFinite(y) ? y : undefined;
}

// ---------------------------------------------------------------- search
type RawSearch = {
  results: Array<{
    id: number;
    title?: string;
    name?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path?: string | null;
    overview?: string;
    popularity?: number;
    genre_ids?: number[];
    vote_average?: number;
  }>;
};

// --- cached genre id → name maps, so candidates carry genres cheaply ---
const genreCache: Partial<Record<MediaType, Record<number, string>>> = {};

async function genreMap(type: MediaType): Promise<Record<number, string>> {
  if (genreCache[type]) return genreCache[type]!;
  try {
    const data = await tmdb<{ genres: { id: number; name: string }[] }>(
      `/genre/${tvOrMovie(type)}/list`,
    );
    const map: Record<number, string> = {};
    for (const g of data.genres) map[g.id] = g.name;
    genreCache[type] = map;
    return map;
  } catch {
    return {};
  }
}

/** A light TitleDetail for candidates: genres + rating filled, no extra calls. */
async function toDetailLite(
  type: MediaType,
  results: RawSearch["results"],
): Promise<TitleDetail[]> {
  const gmap = await genreMap(type);
  return results
    .filter((r) => r.poster_path)
    .map((r) => ({
      type,
      source: "tmdb" as const,
      externalId: String(r.id),
      title: r.title || r.name || "Untitled",
      year: yearOf(r.release_date || r.first_air_date),
      posterUrl: poster(r.poster_path),
      overview: r.overview,
      providers: [],
      genres: (r.genre_ids || []).map((id) => gmap[id]).filter(Boolean),
      keywords: [],
      people: [],
      voteAverage: r.vote_average,
    }));
}

/** Recommendations + similar for a seed, enriched with genres/ratings. */
export async function relatedTmdb(
  type: MediaType,
  id: string,
): Promise<TitleDetail[]> {
  const kind = tvOrMovie(type);
  const [rec, sim] = await Promise.all([
    tmdb<RawSearch>(`/${kind}/${id}/recommendations`).catch(() => ({ results: [] })),
    tmdb<RawSearch>(`/${kind}/${id}/similar`).catch(() => ({ results: [] })),
  ]);
  return toDetailLite(type, [...rec.results, ...sim.results].slice(0, 40));
}

export async function trendingDetailedTmdb(
  type: MediaType,
): Promise<TitleDetail[]> {
  const data = await tmdb<RawSearch>(`/trending/${tvOrMovie(type)}/week`).catch(
    () => ({ results: [] }),
  );
  return toDetailLite(type, data.results.slice(0, 24));
}

export async function searchTmdb(
  type: MediaType,
  query: string,
): Promise<TitleResult[]> {
  if (!query.trim()) return [];
  const data = await tmdb<RawSearch>(`/search/${tvOrMovie(type)}`, {
    query,
    include_adult: "false",
  });
  return data.results
    .filter((r) => r.poster_path || r.overview)
    .slice(0, 16)
    .map((r) => ({
      type,
      source: "tmdb" as const,
      externalId: String(r.id),
      title: r.title || r.name || "Untitled",
      year: yearOf(r.release_date || r.first_air_date),
      posterUrl: poster(r.poster_path),
      overview: r.overview,
    }));
}

// ---------------------------------------------------------------- details
type RawDetail = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  original_language?: string;
  runtime?: number;
  episode_run_time?: number[];
  number_of_episodes?: number;
  vote_average?: number;
  genres?: { name: string }[];
  created_by?: { name: string }[];
  videos?: { results: { key: string; site: string; type: string; official?: boolean }[] };
  "watch/providers"?: {
    results?: Record<
      string,
      {
        link?: string;
        flatrate?: { provider_name: string; logo_path: string }[];
        free?: { provider_name: string; logo_path: string }[];
        ads?: { provider_name: string; logo_path: string }[];
      }
    >;
  };
  credits?: {
    crew?: { name: string; job: string }[];
    cast?: { name: string }[];
  };
  keywords?: { keywords?: { name: string }[]; results?: { name: string }[] };
  recommendations?: RawSearch;
  similar?: RawSearch;
};

function pickTrailer(videos?: RawDetail["videos"]): string | undefined {
  const vids = videos?.results || [];
  const yt = vids.filter((v) => v.site === "YouTube");
  const trailer =
    yt.find((v) => v.type === "Trailer" && v.official) ||
    yt.find((v) => v.type === "Trailer") ||
    yt.find((v) => v.type === "Teaser") ||
    yt[0];
  return trailer?.key;
}

function pickProviders(detail: RawDetail): Provider[] {
  const region = detail["watch/providers"]?.results?.[REGION];
  if (!region) return [];
  const link = region.link;
  const seen = new Set<string>();
  const out: Provider[] = [];
  for (const list of [region.flatrate, region.free, region.ads]) {
    for (const p of list || []) {
      if (seen.has(p.provider_name)) continue;
      seen.add(p.provider_name);
      out.push({
        name: p.provider_name,
        slug: poster(p.logo_path, "original") || "",
        url: link,
      });
    }
  }
  return out.slice(0, 8);
}

function pickPeople(detail: RawDetail, type: MediaType): Person[] {
  const people: Person[] = [];
  if (type === "series") {
    for (const c of detail.created_by || [])
      people.push({ name: c.name, role: "Creator" });
  } else {
    for (const c of detail.credits?.crew || []) {
      if (c.job === "Director") people.push({ name: c.name, role: "Director" });
    }
  }
  for (const c of (detail.credits?.cast || []).slice(0, 6))
    people.push({ name: c.name, role: "Cast" });
  return people;
}

export async function detailTmdb(
  type: MediaType,
  id: string,
): Promise<TitleDetail & { recommendations: TitleResult[]; similar: TitleResult[] }> {
  const detail = await tmdb<RawDetail>(`/${tvOrMovie(type)}/${id}`, {
    append_to_response: "videos,watch/providers,credits,keywords,recommendations,similar",
  });

  const keywords = (
    detail.keywords?.keywords ||
    detail.keywords?.results ||
    []
  ).map((k) => k.name);

  const toResults = (raw?: RawSearch): TitleResult[] =>
    (raw?.results || [])
      .filter((r) => r.poster_path)
      .slice(0, 20)
      .map((r) => ({
        type,
        source: "tmdb" as const,
        externalId: String(r.id),
        title: r.title || r.name || "Untitled",
        year: yearOf(r.release_date || r.first_air_date),
        posterUrl: poster(r.poster_path),
        overview: r.overview,
      }));

  return {
    type,
    source: "tmdb",
    externalId: String(detail.id),
    title: detail.title || detail.name || "Untitled",
    year: yearOf(detail.release_date || detail.first_air_date),
    posterUrl: poster(detail.poster_path),
    backdropUrl: poster(detail.backdrop_path, "w780"),
    overview: detail.overview,
    trailerKey: pickTrailer(detail.videos),
    providers: pickProviders(detail),
    genres: (detail.genres || []).map((g) => g.name),
    keywords,
    people: pickPeople(detail, type),
    language: detail.original_language,
    runtime: detail.runtime || detail.episode_run_time?.[0] || detail.number_of_episodes,
    voteAverage: detail.vote_average,
    recommendations: toResults(detail.recommendations),
    similar: toResults(detail.similar),
  };
}

// ---------------------------------------------------------------- trending (cold start)
export async function trendingTmdb(type: MediaType): Promise<TitleResult[]> {
  const data = await tmdb<RawSearch>(`/trending/${tvOrMovie(type)}/week`);
  return data.results
    .filter((r) => r.poster_path)
    .slice(0, 20)
    .map((r) => ({
      type,
      source: "tmdb" as const,
      externalId: String(r.id),
      title: r.title || r.name || "Untitled",
      year: yearOf(r.release_date || r.first_air_date),
      posterUrl: poster(r.poster_path),
      overview: r.overview,
    }));
}
