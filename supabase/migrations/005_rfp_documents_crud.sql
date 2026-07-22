alter table rfp_documents
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

create or replace function set_rfp_document_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rfp_documents_set_updated_at on rfp_documents;
create trigger rfp_documents_set_updated_at
before update on rfp_documents
for each row execute function set_rfp_document_updated_at();

create index if not exists idx_rfp_documents_active_uploaded_at
  on rfp_documents (uploaded_at desc)
  where deleted_at is null;