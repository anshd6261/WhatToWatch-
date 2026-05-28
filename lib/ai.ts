import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI();
  return client;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const SMALL = process.env.WTW_EMBED_SMALL || "text-embedding-3-small";
const LARGE = process.env.WTW_EMBED_LARGE || "text-embedding-3-large";
const RERANK = process.env.WTW_RERANK_MODEL || "gpt-4o-mini";

/** Returns one embedding per input string, or null if AI is not configured. */
export async function embed(
  texts: string[],
  opts: { large?: boolean } = {},
): Promise<number[][] | null> {
  const c = getClient();
  if (!c || texts.length === 0) return null;
  try {
    const res = await c.embeddings.create({
      model: opts.large ? LARGE : SMALL,
      input: texts.map((t) => t.slice(0, 6000)),
    });
    return res.data.map((d) => d.embedding as number[]);
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
