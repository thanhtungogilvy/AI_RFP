alter table rfp_documents add column if not exists content text not null default '';
alter table rfp_documents add column if not exists analysis jsonb;
alter table rfp_documents add column if not exists embedding extensions.vector(1024);
