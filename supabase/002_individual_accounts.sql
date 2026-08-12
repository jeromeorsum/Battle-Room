-- Battle Room — individual accounts migration
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run
-- This is additive only — it does NOT remove admin_code_hash/manager_code_hash,
-- so nothing breaks for agencies that haven't converted yet. The shared
-- code stays available as an emergency fallback even after conversion.

-- One row per individual person who can log in to an agency's admin panel.
-- Multiple people per agency is supported (owner, bookkeeper, staff, etc.),
-- each with their own credentials and their own 2FA.
create table if not exists agency_users (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id) on delete cascade not null,
  email text not null,
  password_hash text not null,
  role text not null default 'manager', -- 'admin' | 'manager'
  totp_secret text,
  totp_enabled boolean default false,
  created_at timestamptz default now(),
  last_login_at timestamptz,
  unique(agency_id, email)
);

-- Single-use tokens for two flows that both need "prove you own this
-- email, then let you set a password": inviting a new team member, and
-- resetting a forgotten password. Kept in one table since the shape and
-- lifecycle (create, email a link, consume once, expire) is identical.
create table if not exists auth_tokens (
  token text primary key,
  agency_user_id uuid references agency_users(id) on delete cascade,
  agency_id uuid references agencies(id) on delete cascade not null,
  email text not null, -- for invites, agency_user_id doesn't exist yet
  role text, -- for invites: what role the account will get once accepted
  type text not null, -- 'invite' | 'reset'
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_agency_users_agency on agency_users(agency_id);
create index if not exists idx_auth_tokens_email on auth_tokens(email);

alter table agency_users enable row level security;
alter table auth_tokens enable row level security;
