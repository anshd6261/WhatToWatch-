# WhatToWatch

A calm, black-and-white library for the **movies, series, books and links** you watch,
read and save. Add a title by name and it pulls the poster, synopsis, trailer and
"where to watch" automatically. Color lives only in the cover art and a playing trailer —
everything else is monochrome glass.

> Aesthetic: pure black + white · glassmorphism · 38px radii · pill buttons · floating
> hover · slow fade transitions · subtle lens (fisheye) + chromatic aberration · Inter.

## Features

- **Four tabs** — Movies · Series · Books · Others, each a three-column board
  (To Watch / Watching / Watched, with book + "Others" variants) split by faded dividers.
- **Add by name** → auto-fetched poster, synopsis, cast/director, genres.
- **Card view** with an inline rounded **YouTube trailer**, monochrome **streaming-service
  circles** (click to open), status controls, star rating and a one-line note.
- **Others** = paste any link (YouTube, reels, articles) → title + thumbnail captured.
- **Two recommenders:**
  - **For You** (Engine A) — personalized to *your* taste profile (genres, keywords,
    people, eras, weighted by your ratings + recency, diversified with MMR).
  - **Similar titles** (Engine B) — a large model finds genuinely-alike titles by
    theme/tone/vibe (semantic embeddings + LLM re-rank with a one-line "why").
- **Cloud sync** (optional) via Supabase magic-link, or zero-setup browser storage.

## Quick start

```bash
npm install
cp .env.example .env.local   # add keys to unlock features (all optional)
npm run dev                  # http://localhost:3000
```

The app runs with **no keys** (browser-stored library). Add keys to enable:

| Feature | Env | Notes |
| --- | --- | --- |
| Movies/series search, posters, trailers, providers, recs | `TMDB_API_KEY` | free, [get one](https://www.themoviedb.org/settings/api) |
| Books | `GOOGLE_BOOKS_API_KEY` | optional (works unauthenticated) |
| Smart recommendations | `OPENAI_API_KEY` | embeddings (Engine A) + similarity re-rank (Engine B) |
| Cross-device sync | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | run `supabase/migrations/0001_init.sql` |

## How recommendations work

- **Engine A — For You** (`lib/recommender/foryou.ts`, `profile.ts`): builds a weighted
  taste vector from your library, gathers candidates from TMDB related lists + trending
  (or Google Books subjects), scores them by `embedding similarity + metadata affinity +
  quality`, then applies **MMR** for diversity and explains each pick.
- **Engine B — Similar titles** (`lib/recommender/similar.ts`): embeds the open title with
  a large model, runs cosine k-NN over a candidate pool, then an LLM re-rank orders by true
  likeness and writes the reason. Results are cached.

Both degrade gracefully: no `OPENAI_API_KEY` → TMDB's related lists; no `TMDB_API_KEY` →
search is disabled with the rest of the UI intact.

## Cloud sync

Create a free Supabase project, run `supabase/migrations/0001_init.sql`, and set the two
`NEXT_PUBLIC_SUPABASE_*` vars. The app then shows a magic-link sign-in and syncs your
library across devices (row-level security keeps it private). On first sign-in, any items
already in your browser are migrated up automatically.

## Deploy (Vercel)

Push to GitHub, import in Vercel, add the same env vars in Project → Settings →
Environment Variables, and deploy. No extra configuration required.

## Stack

Next.js (App Router) · TypeScript · Tailwind v4 · Motion · Supabase (+pgvector) ·
TMDB · Google Books · OpenAI.
