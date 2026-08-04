-- Battle Room database schema — multi-tenant version
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

create extension if not exists "pgcrypto";

-- One row per agency (tenant). agency_code is what creators enter to join
-- their agency's roster. admin_code_hash gates that agency's admin panel.
create table if not exists agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  agency_code text unique not null,
  admin_code_hash text not null,
  plan_tier text default 'starter',
  billing_period text default 'monthly',
  status text default 'trialing', -- trialing | active | past_due | canceled
  max_creators integer default 100,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);

create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id) on delete cascade not null,
  name text not null,
  handle text,
  email text,
  diamonds integer default 0,
  league text,
  tz text default 'ET',
  tags text[] default '{}',
  pin_hash text not null,
  created_at timestamptz default now()
);

create table if not exists battles (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id) on delete cascade not null,
  creator_a uuid references creators(id) on delete cascade,
  creator_b uuid references creators(id) on delete cascade,
  datetime_utc timestamptz not null,
  zone_code text default 'ET',
  notes text,
  accepted_a boolean default false,
  accepted_b boolean default false,
  declined boolean default false,
  created_by uuid references creators(id),
  created_at timestamptz default now()
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(creator_id, endpoint)
);

-- Tracks failed login attempts per identifier (a creator id, an agency code,
-- or 'superadmin') so brute-forcing a PIN/code gets locked out instead of
-- being guessable forever.
create table if not exists auth_attempts (
  identifier text primary key,
  attempts integer default 0,
  locked_until timestamptz,
  updated_at timestamptz default now()
);

create index if not exists idx_creators_agency on creators(agency_id);
create index if not exists idx_battles_agency on battles(agency_id);

-- All access goes through API routes using the service-role key (server-side
-- only), which bypasses RLS. This blocks the public anon key from touching
-- these tables directly — every read/write is scoped to an agency_id in
-- application code, which is what actually keeps agencies isolated from
-- each other.
alter table agencies enable row level security;
alter table creators enable row level security;
alter table battles enable row level security;
alter table push_subscriptions enable row level security;
alter table auth_attempts enable row level security;
