import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    // WTW_AI_BASE_URL lets you point at any OpenAI-compatible provider
    // (e.g. Google Gemini's free tier, Groq, OpenRouter) instead of OpenAI.
    client = new OpenAI({
      baseURL: process.env.WTW_AI_BASE_URL || undefined,
    });
  }
  return client;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const SMALL = process.env.WTW_EMBED_SMALL || "text-embedding-3-small";
const LARGE = process.env.WTW_EMBED_LARGE || "text-embedding-3-large";
const RERANK = process.env.WTW_RERANK_MODEL || "gpt-4o-mini";

// Free tiers (e.g. Gemini) cap how much you can embed per request, so we send
// inputs in chunks and stitch the results back together in order.
const EMBED_BATCH = Number(process.env.WTW_EMBED_BATCH || 16);

/** Returns one embedding per input string, or null if AI is not configured. */
export async function embed(
  texts: string[],
  opts: { large?: boolean } = {},
): Promise<number[][] | null> {
  const c = getClient();
  if (!c || texts.length === 0) return null;
  const model = opts.large ? LARGE : SMALL;
  try {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH) {
      const slice = texts.slice(i, i + EMBED_BATCH).map((t) => t.slice(0, 6000));
      const res = await c.embeddings.create({ model, input: slice });
      for (const d of res.data) out.push(d.embedding as number[]);
    }
    return out.length === texts.length ? out : null;
  } catch {
    return null;
  }
}

/** Ask the large model to re-rank + explain similarity. Returns parsed JSON or null. */
export async function rerankJSON<T>(
  system: string,
  user: string,
): Promise<T | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const res = await c.chat.completions.create({
      model: RERANK,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const content = res.choices[0]?.message?.content;
    return content ? (JSON.parse(content) as T) : null;
  } catch {
    return null;
  }
}
