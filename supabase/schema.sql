-- Optional SiteProof persistence schema for Supabase/Postgres.
create table if not exists siteproof_clients (
  id text primary key,
  name text not null,
  website text,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists siteproof_projects (
  id text primary key,
  client_id text,
  name text not null,
  website text not null,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists siteproof_audits (
  id text primary key,
  site text not null,
  project_id text,
  client_id text,
  audited_at timestamptz not null,
  score integer,
  mode text,
  summary jsonb,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists siteproof_audits_site_idx on siteproof_audits(site);
create index if not exists siteproof_audits_project_idx on siteproof_audits(project_id);
create index if not exists siteproof_audits_audited_at_idx on siteproof_audits(audited_at desc);
