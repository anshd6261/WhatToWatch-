import "server-only";
import type { TitleDetail, TitleResult } from "./types";

const BASE = "https://www.googleapis.com/books/v1/volumes";

function withKey(url: string): string {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  return key ? `${url}${url.includes("?") ? "&" : "?"}key=${key}` : url;
}

type Volume = {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    language?: string;
    averageRating?: number;
    infoLink?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

function cover(v: Volume): string | undefined {
  const link =
    v.volumeInfo?.imageLinks?.thumbnail ||
    v.volumeInfo?.imageLinks?.smallThumbnail;
  return link ? link.replace("http://", "https://").replace("&edge=curl", "") : undefined;
}

function year(v: Volume): number | undefined {
  const y = parseInt((v.volumeInfo?.publishedDate || "").slice(0, 4), 10);
  return Number.isFinite(y) ? y : undefined;
}

function toResult(v: Volume): TitleResult {
  return {
    type: "book",
    source: "google_books",
    externalId: v.id,
    title: v.volumeInfo?.title || "Untitled",
    year: year(v),
    posterUrl: cover(v),
    overview: v.volumeInfo?.description,
    url: v.volumeInfo?.infoLink,
  };
}

export async function searchBooks(query: string): Promise<TitleResult[]> {
  if (!query.trim()) return [];
  const url = withKey(
    `${BASE}?q=${encodeURIComponent(query)}&maxResults=16&printType=books`,
  );
  const res = await fetch(url, { next: { revalidate: 60 * 60 } });
  if (!res.ok) throw new Error(`Google Books search → ${res.status}`);
  const data = (await res.json()) as { items?: Volume[] };
  return (data.items || []).filter((v) => v.volumeInfo?.title).map(toResult);
}

export async function detailBook(id: string): Promise<TitleDetail> {
  const res = await fetch(withKey(`${BASE}/${id}`), {
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) throw new Error(`Google Books detail → ${res.status}`);
  const v = (await res.json()) as Volume;
  const info = v.volumeInfo || {};
  return {
    ...toResult(v),
    providers: [],
    genres: info.categories || [],
    keywords: info.categories || [],
    people: (info.authors || []).map((name) => ({ name, role: "Author" })),
    language: info.language,
    runtime: info.pageCount,
    voteAverage: info.averageRating ? info.averageRating * 2 : undefined,
  };
}

/** Candidate books for recommendations: search by category/author seeds. */
export async function discoverBooks(seeds: string[]): Promise<TitleResult[]> {
  const out: TitleResult[] = [];
  for (const seed of seeds.slice(0, 4)) {
    try {
      const url = withKey(
        `${BASE}?q=${encodeURIComponent(`subject:${seed}`)}&maxResults=10&printType=books&orderBy=relevance`,
      );
      const res = await fetch(url, { next: { revalidate: 60 * 60 } });
      if (!res.ok) continue;
      const data = (await res.json()) as { items?: Volume[] };
      for (const v of data.items || []) {
        if (v.volumeInfo?.title) out.push(toResult(v));
      }
    } catch {
      /* ignore seed */
    }
  }
  return out;
}
