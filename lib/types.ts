export type MediaType = "movie" | "series" | "book" | "other";

/** Canonical status keys; labels differ per media type (see labels.ts). */
export type Status = "backlog" | "active" | "done";

export type Source = "tmdb" | "google_books" | "link";

export type Provider = {
  name: string;
  slug: string; // simple-icons slug, or "" if unknown
  url?: string; // deep link to open the platform
};

export type Person = {
  name: string;
  role?: string; // "Director", "Creator", "Cast", "Author"
};

/** A normalized search result before it enters the library. */
export type TitleResult = {
  type: MediaType;
  source: Source;
  externalId: string;
  title: string;
  year?: number;
  posterUrl?: string;
  overview?: string;
  url?: string; // for "other" links
};

/** Full detail used to render a card and feed the recommenders. */
export type TitleDetail = TitleResult & {
  backdropUrl?: string;
  trailerKey?: string; // youtube id
  providers: Provider[];
  genres: string[];
  keywords: string[];
  people: Person[];
  language?: string;
  runtime?: number; // minutes (movie) / episode count (series) / pages (book)
  voteAverage?: number;
};

/** An item saved in the user's library. */
export type LibraryItem = TitleDetail & {
  id: string; // local id
  status: Status;
  rating: number; // 0–5 (0 = unrated)
  note?: string;
  addedAt: number;
  finishedAt?: number;
};

export type SimilarResult = {
  type: MediaType;
  externalId: string;
  title: string;
  year?: number;
  posterUrl?: string;
  reason?: string; // "why it's similar" (Engine B)
};

export type RecResult = SimilarResult & {
  because?: string; // "Because you watched X" (Engine A)
  score?: number;
};
