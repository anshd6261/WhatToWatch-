import "server-only";
import type { TitleDetail } from "./types";

function youtubeId(url: string): string | undefined {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/,
  );
  return m?.[1];
}

function hostName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

async function withTimeout(url: string, init?: RequestInit, ms = 7000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function ogTag(html: string, prop: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
      "i",
    ),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return decode(m[1]);
  }
  return undefined;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

type NoEmbed = {
  title?: string;
  thumbnail_url?: string;
  author_name?: string;
  provider_name?: string;
  error?: string;
};

/** Resolve any pasted link into a saveable "other" item. */
export async function resolveLink(rawUrl: string): Promise<TitleDetail> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const host = hostName(url);
  const yt = youtubeId(url);

  const base: TitleDetail = {
    type: "other",
    source: "link",
    externalId: url,
    title: host,
    url,
    overview: undefined,
    providers: [],
    genres: [],
    keywords: [],
    people: [],
    trailerKey: yt,
  };

  // 1) oEmbed via noembed — great for YouTube / Vimeo / X / TikTok etc.
  try {
    const res = await withTimeout(
      `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
    );
    if (res.ok) {
      const data = (await res.json()) as NoEmbed;
      if (data && !data.error && (data.title || data.thumbnail_url)) {
        return {
          ...base,
          title: data.title || base.title,
          posterUrl: data.thumbnail_url,
          people: data.author_name ? [{ name: data.author_name }] : [],
          genres: data.provider_name ? [data.provider_name] : [host],
        };
      }
    }
  } catch {
    /* fall through to OG */
  }

  // 2) OpenGraph scrape for articles / generic pages
  try {
    const res = await withTimeout(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; WhatToWatchBot/1.0)" },
    });
    if (res.ok) {
      const html = (await res.text()).slice(0, 200_000);
      const title =
        ogTag(html, "og:title") ||
        ogTag(html, "twitter:title") ||
        html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
      const image = ogTag(html, "og:image") || ogTag(html, "twitter:image");
      const desc =
        ogTag(html, "og:description") || ogTag(html, "description");
      const site = ogTag(html, "og:site_name");
      return {
        ...base,
        title: title ? decode(title) : base.title,
        posterUrl: image,
        overview: desc,
        genres: [site || host],
      };
    }
  } catch {
    /* ignore — return base */
  }

  return base;
}
