-- WhatToWatch — cloud sync schema
-- Run this in your Supabase project (SQL editor) to enable cross-device sync.

-- pgvector for the (optional, forward-looking) embeddings cache
create extension if not exists vector;

-- ----------------------------------------------------------------- items
create table if not exists public.items (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  type        text not null,            -- movie | series | book | other
  external_id text not null,            -- tmdb id / google books id / url
  status      text not null,            -- backlog | active | done
  rating      int  not null default 0,
  added_at    bigint not null,
  item        jsonb not null,           -- full LibraryItem snapshot
  created_at  timestamptz default now()
);

alter table public.items enable row level security;

create policy "items are private to their owner"
  on public.items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists items_user_added_idx
  on public.items (user_id, added_at desc);

create unique index if not exists items_user_extid_idx
  on public.items (user_id, type, external_id);

-- ------------------------------------------------- embeddings cache (optional)
-- Persists overview embeddings so recommendations stay fast/cheap across
-- requests. The app works without this table (it caches in memory); add it
-- when you want durable vector search. text-embedding-3-small = 1536 dims
-- (use vector(3072) if you switch to text-embedding-3-large).
create table if not exists public.embeddings (
  external_id text not null,
  media_type  text not null,
  model       text not null,
  embedding   vector(1536),
  updated_at  timestamptz default now(),
  primary key (external_id, media_type, model)
);
