import type { MediaType } from "@/lib/types";
import { searchTmdb } from "@/lib/tmdb";
import { searchBooks } from "@/lib/books";
import { resolveLink } from "@/lib/oembed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "movie") as MediaType;
  const q = (searchParams.get("q") || "").trim();

  try {
    if (!q) return Response.json({ results: [] });
    let results;
    if (type === "other") results = [await resolveLink(q)];
    else if (type === "book") results = await searchBooks(q);
    else results = await searchTmdb(type, q);
    return Response.json({ results });
  } catch (e) {
    return Response.json(
      { results: [], error: (e as Error).message || "search failed" },
      { status: 200 },
    );
  }
}
