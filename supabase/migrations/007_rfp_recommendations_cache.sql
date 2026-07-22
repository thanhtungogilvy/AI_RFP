alter table rfp_documents
  add column if not exists recommendations jsonb,
  add column if not exists recommendations_generated_at timestamptz;
