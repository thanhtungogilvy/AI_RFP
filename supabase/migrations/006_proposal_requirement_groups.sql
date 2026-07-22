alter table proposals
  add column if not exists selected_requirement_group_ids text[] not null default '{}';
