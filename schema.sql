-- ════════════════════════════════════════════════════════════════
-- Mingle Booth — Supabase Database Schema
-- ════════════════════════════════════════════════════════════════
-- Run this in:
--   Supabase Dashboard → your project → SQL Editor → New Query
-- Then click "Run".
-- ════════════════════════════════════════════════════════════════

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- TABLE: events
-- One row represents the booth instance's configuration.
-- Settings (branding, camera, layout, password) live here.
-- ──────────────────────────────────────────────────────────────
create table if not exists public.events (
  id                  text        primary key default 'default',
  title               text        not null default 'Mingle Booth',
  subtitle            text        not null default 'Capture Your Memories',
  brand_logo_data_url text,                         -- base64 logo (or Cloudinary URL)
  strip_bg_color      text        not null default '#1a1a28',
  strip_text_color    text        not null default '#ffffff',
  strip_show_title    boolean     not null default true,
  strip_show_date     boolean     not null default true,
  default_layout      text        not null default '3v',
  admin_password      text        not null default 'admin1234',
  camera_device_id    text,
  camera_resolution   text        not null default '1920x1080',
  mirror_camera       boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Seed the default event row (safe to re-run)
insert into public.events (id)
  values ('default')
  on conflict (id) do nothing;

-- Auto-update updated_at timestamp on every change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at();


-- ──────────────────────────────────────────────────────────────
-- TABLE: frames
-- PNG overlay frames uploaded by the admin.
-- Stored as base64 data URLs (or Cloudinary URLs in future).
-- ──────────────────────────────────────────────────────────────
create table if not exists public.frames (
  id          uuid        primary key default gen_random_uuid(),
  event_id    text        not null references public.events(id) on delete cascade,
  name        text        not null,
  data_url    text        not null,   -- base64 PNG or Cloudinary URL
  is_active   boolean     not null default false,
  width       int,                    -- frame native width in px
  height      int,                    -- frame native height in px
  slots       jsonb       not null default '[]', -- array of {slot_index, x, y, w, h}
  created_at  timestamptz not null default now()
);

create index if not exists frames_event_idx on public.frames (event_id, is_active);


-- ──────────────────────────────────────────────────────────────
-- TABLE: photo_sessions
-- One row per complete booth session (after Cloudinary upload).
-- ──────────────────────────────────────────────────────────────
create table if not exists public.photo_sessions (
  id          text        primary key,            -- e.g. "1729345678901" (timestamp)
  event_id    text        not null references public.events(id) on delete cascade,
  layout      text        not null,               -- '2v' | '3v' | '4v' | '2x2'
  photo_count int         not null,               -- number of shots taken
  strip_url   text        not null,               -- Cloudinary JPEG URL
  gif_url     text,                               -- Cloudinary GIF URL (nullable)
  viewer_url  text,                               -- full QR scan URL (nullable)
  strip_w     int         not null default 800,   -- strip canvas width in px
  strip_h     int         not null,               -- strip canvas height in px
  frame_url   text,                               -- frame overlay used (nullable)
  created_at  timestamptz not null default now()
);

create index if not exists sessions_event_idx
  on public.photo_sessions (event_id, created_at desc);


-- ──────────────────────────────────────────────────────────────
-- TABLE: session_photos
-- One row per individual shot inside a session.
-- Tracks which slot each photo occupies and its pixel position.
-- ──────────────────────────────────────────────────────────────
create table if not exists public.session_photos (
  id          uuid        primary key default gen_random_uuid(),
  session_id  text        not null references public.photo_sessions(id) on delete cascade,
  slot_index  int         not null,   -- 0-based position in the strip
  url         text        not null,   -- Cloudinary original photo URL
  slot_x      int         not null default 0,  -- pixel x of slot in strip
  slot_y      int         not null default 0,  -- pixel y of slot in strip
  slot_w      int         not null default 0,  -- pixel width of slot
  slot_h      int         not null default 0,  -- pixel height of slot
  created_at  timestamptz not null default now(),
  unique (session_id, slot_index)
);

create index if not exists photos_session_idx
  on public.session_photos (session_id, slot_index);


-- ════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- Enabled on all tables. Open policy for the booth device.
-- Tighten later by adding user authentication.
-- ════════════════════════════════════════════════════════════════
alter table public.events         enable row level security;
alter table public.frames         enable row level security;
alter table public.photo_sessions enable row level security;
alter table public.session_photos enable row level security;

-- Create policies (wrapped in DO block so re-running is safe)
do $$ begin
  create policy "public_all" on public.events
    for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public_all" on public.frames
    for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public_all" on public.photo_sessions
    for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public_all" on public.session_photos
    for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------
-- MIGRATION: Add slot data to frames table
-- Run after the initial schema if the table already exists.
-- Safe to re-run (uses IF NOT EXISTS).
-- ----------------------------------------------------------------
alter table public.frames
  add column if not exists width  int,
  add column if not exists height int,
  add column if not exists slots  jsonb not null default '[]';

