-- Production reliability: durable proposal artifacts and searchable slide text.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'case_study_slides_case_study_slide_index_key'
  ) then
    alter table public.case_study_slides
      add constraint case_study_slides_case_study_slide_index_key unique (case_study_id, slide_index);
  end if;
end $$;

alter table public.proposals
  add column if not exists pdf_path text,
  add column if not exists pdf_status text not null default 'not_requested',
  add column if not exists pdf_error_message text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'proposals_pdf_status_check'
  ) then
    alter table public.proposals
      add constraint proposals_pdf_status_check check (pdf_status in ('not_requested', 'completed', 'error'));
  end if;
end $$;

create or replace function public.search_case_studies(search_text text)
returns table (case_study_id uuid)
language sql stable security invoker set search_path = public
as $$
  select c.id
  from public.case_studies c
  where nullif(trim(search_text), '') is not null
    and (
      c.title ilike '%' || search_text || '%'
      or c.client ilike '%' || search_text || '%'
      or c.industry ilike '%' || search_text || '%'
      or c.summary ilike '%' || search_text || '%'
      or array_to_string(c.tags, ' ') ilike '%' || search_text || '%'
      or exists (
        select 1
        from public.case_study_slides s
        where s.case_study_id = c.id
          and (
            s.title ilike '%' || search_text || '%'
            or s.content ilike '%' || search_text || '%'
            or array_to_string(s.tags, ' ') ilike '%' || search_text || '%'
          )
      )
    )
  order by c.uploaded_at desc;
$$;
