import { tmdbConfigured } from "@/lib/tmdb";
import { aiConfigured } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    tmdb: tmdbConfigured(),
    ai: aiConfigured(),
  });
}
