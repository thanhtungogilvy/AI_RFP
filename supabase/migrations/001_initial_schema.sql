-- AI RFP Generator — initial schema
-- Run this in your Supabase SQL editor or via the Supabase CLI

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";
-- Uncomment when implementing vector search:
-- create extension if not exists "vector";

-- ── Case Studies ─────────────────────────────────────────────────────────────
create table if not exists case_studies (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  client      text        not null,
  industry    text        not null default '',
  summary     text        not null default '',
  tags        text[]      not null default '{}',
  file_name   text        not null,
  file_path   text,                         -- Supabase Storage object path
  status      text        not null default 'processing'
                          check (status in ('processing', 'indexed', 'error')),
  uploaded_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create table if not exists case_study_slides (
  id              uuid    primary key default gen_random_uuid(),
  case_study_id   uuid    not null references case_studies(id) on delete cascade,
  slide_index     integer not null,
  title           text    not null default '',
  content         text    not null default '',
  image_url       text,
  tags            text[]  not null default '{}',
  -- embedding     vector(1536),             -- enable after pgvector extension
  created_at      timestamptz not null default now()
);

create index if not exists idx_slides_case_study_id on case_study_slides(case_study_id);

-- ── RFP Documents ─────────────────────────────────────────────────────────────
create table if not exists rfp_documents (
  id          uuid    primary key default gen_random_uuid(),
  title       text    not null,
  client      text    not null,
  industry    text    not null default '',
  deadline    date,
  file_name   text    not null,
  file_path   text,                         -- Supabase Storage object path
  status      text    not null default 'uploaded'
                      check (status in ('uploaded', 'analyzing', 'analyzed', 'error')),
  uploaded_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- ── Proposals ─────────────────────────────────────────────────────────────────
create table if not exists proposals (
  id                      text    primary key,
  rfp_id                  uuid    references rfp_documents(id),
  title                   text    not null,
  status                  text    not null default 'pending'
                                  check (status in ('pending', 'generating', 'completed', 'error')),
  selected_case_study_ids text[]  not null default '{}',
  pptx_url                text,
  pptx_path               text,             -- local or Supabase Storage path
  pdf_url                 text,
  error_message           text,
  created_at              timestamptz not null default now(),
  completed_at            timestamptz
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Server-side access uses the service role key which bypasses RLS.
-- Enable RLS tables anyway so data is safe if anon key is ever used by mistake.
alter table case_studies        enable row level security;
alter table case_study_slides   enable row level security;
alter table rfp_documents       enable row level security;
alter table proposals           enable row level security;

-- Deny all access to anon/authenticated roles (service role bypasses this)
-- Uncomment and add policies below when user auth is implemented.

-- ── Storage Buckets ───────────────────────────────────────────────────────────
-- Create these buckets manually in the Supabase dashboard or via CLI:
--   supabase storage create case-studies  --public=false
--   supabase storage create rfps          --public=false
--   supabase storage create proposals     --public=false
