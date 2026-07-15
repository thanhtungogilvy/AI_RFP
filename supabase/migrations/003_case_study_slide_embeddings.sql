create extension if not exists vector with schema extensions;

alter table public.case_study_slides
  add column if not exists embedding extensions.vector(1024);

create index if not exists idx_case_study_slides_embedding_hnsw
  on public.case_study_slides
  using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null;

create or replace function public.match_case_study_slides(
  query_embedding extensions.vector(1024),
  match_threshold double precision default 0.45,
  match_count integer default 20
)
returns table (
  slide_id uuid,
  case_study_id uuid,
  case_study_title text,
  case_study_client text,
  case_study_industry text,
  slide_index integer,
  slide_title text,
  slide_content text,
  similarity double precision
)
language sql stable security invoker set search_path = public, extensions
as $$
  select s.id, c.id, c.title, c.client, c.industry, s.slide_index, s.title, s.content,
    1 - (s.embedding <=> query_embedding) as similarity
  from public.case_study_slides s
  join public.case_studies c on c.id = s.case_study_id
  where s.embedding is not null
    and 1 - (s.embedding <=> query_embedding) >= match_threshold
  order by s.embedding <=> query_embedding
  limit greatest(0, least(match_count, 100));
$$;
