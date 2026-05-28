import type { LibraryItem, MediaType } from "@/lib/types";
import { forYou } from "@/lib/recommender/foryou";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      type: MediaType;
      library: LibraryItem[];
    };
    const data = await forYou(body.type, body.library || []);
    return Response.json(data);
  } catch (e) {
    return Response.json(
      { results: [], coldStart: true, error: (e as Error).message },
      { status: 200 },
    );
  }
}
