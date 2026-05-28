import type { TitleDetail } from "@/lib/types";
import { similarTitles } from "@/lib/recommender/similar";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { seed } = (await req.json()) as { seed: TitleDetail };
    if (!seed?.externalId) return Response.json({ results: [] });
    const results = await similarTitles(seed);
    return Response.json({ results });
  } catch (e) {
    return Response.json(
      { results: [], error: (e as Error).message },
      { status: 200 },
    );
  }
}
