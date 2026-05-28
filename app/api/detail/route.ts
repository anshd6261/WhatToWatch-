import type { MediaType } from "@/lib/types";
import { detailTmdb } from "@/lib/tmdb";
import { detailBook } from "@/lib/books";
import { resolveLink } from "@/lib/oembed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "movie") as MediaType;
  const id = searchParams.get("id") || "";

  try {
    if (!id) return Response.json({ error: "missing id" }, { status: 400 });
    if (type === "other") {
      return Response.json({ detail: await resolveLink(id) });
    }
    if (type === "book") {
      return Response.json({ detail: await detailBook(id) });
    }
    // strip the bulky related lists from the detail payload
    const { recommendations, similar, ...detail } = await detailTmdb(type, id);
    void recommendations;
    void similar;
    return Response.json({ detail });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message || "detail failed" },
      { status: 200 },
    );
  }
}
