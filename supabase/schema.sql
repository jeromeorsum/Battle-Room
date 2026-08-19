-- Battle Room database schema — multi-tenant version
-- Regenerated from the live production database to reflect the current
-- state after all migrations (individual accounts, super-admin 2FA, email
-- verification, referrals, etc.). Run this once on a fresh Supabase
-- project: Dashboard -> SQL Editor -> New query -> paste -> Run.

create extension if not exists "pgcrypto";

-- One row per agency (tenant). agency_code is what creators and team
-- members enter to reach this agency. admin_code_hash / manager_code_hash
-- gate the shared-code admin panel; individual team logins live in
-- agency_users.
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
  created_at timestamptz default now(),
  contact_email text,
  contact_phone text,
  manager_code_hash text,
  trial_ends_at timestamptz,
  trial_reminder_7_sent boolean default false,
  trial_reminder_1_sent boolean default false,
  accent_color text,
  referral_code text,
  referred_by_code text,
  signup_ip text,
  stripe_current_period_end timestamptz,
  stripe_cancel_at_period_end boolean default false,
  contact_email_verified boolean default false,
  referral_reward_claimed_at timestamptz
);

-- Individual (email + password) team member logins for an agency. role is
-- 'admin' or 'manager'. Each email is unique per agency.
create table if not exists agency_users (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  email text not null,
  password_hash text not null,
  role text not null default 'manager',
  totp_secret text,
  totp_enabled boolean default false,
  created_at timestamptz default now(),
  last_login_at timestamptz,
  unique (email, agency_id)
);

-- Creators (talent) belonging to an agency. pin_hash gates their app login.
create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  name text not null,
  handle text,
  email text,
  diamonds integer default 0,
  league text,
  tz text default 'ET',
  tags text[] default '{}',
  pin_hash text not null,
  created_at timestamptz default now(),
  avatar_url text,
  gender text,
  last_active_at timestamptz default now(),
  age_attested boolean default false,
  age_attested_at timestamptz,
  date_of_birth date,
  age_self_confirmed boolean default false
);

-- Scheduled PK battles between two creators in the same agency.
create table if not exists battles (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  creator_a uuid references creators(id) on delete cascade,
  creator_b uuid references creators(id) on delete cascade,
  datetime_utc timestamptz not null,
  zone_code text default 'ET',
  notes text,
  accepted_a boolean default false,
  accepted_b boolean default false,
  declined boolean default false,
  created_by uuid references creators(id) on delete set null,
  created_at timestamptz default now()
);

-- Creator-authored posts (agency feed).
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  creator_id uuid not null references creators(id) on delete cascade,
  message text not null,
  created_at timestamptz default now(),
  reported boolean default false
);

-- Web-push subscriptions for creator notifications.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid unique references creators(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

-- Append-only audit trail of notable agency actions.
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id) on delete cascade,
  actor_label text not null,
  action text not null,
  target text,
  created_at timestamptz default now()
);

-- Rate-limit / lockout state, keyed by an arbitrary identifier string.
create table if not exists auth_attempts (
  identifier text primary key,
  attempts integer default 0,
  locked_until timestamptz,
  updated_at timestamptz default now()
);

-- One-time tokens for team invites / email flows.
create table if not exists auth_tokens (
  token text primary key,
  agency_user_id uuid references agency_users(id) on delete cascade,
  agency_id uuid not null references agencies(id) on delete cascade,
  email text not null,
  role text,
  type text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

-- Step-up verification codes for billing actions.
create table if not exists billing_verifications (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);

-- Admin-code / password reset tokens.
create table if not exists password_resets (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);

-- Single-row store for the super-admin's TOTP 2FA config.
create table if not exists super_admin_2fa (
  id text primary key default 'singleton',
  totp_secret text,
  totp_enabled boolean default false,
  updated_at timestamptz default now()
);

-- Passive anti-abuse: one free trial per normalized email and per phone.
create table if not exists trial_signups (
  normalized_email text primary key,
  created_at timestamptz default now()
);

create table if not exists trial_signups_phone (
  normalized_phone text primary key,
  created_at timestamptz default now()
);

-- Tracks recently removed creators (by normalized handle) per agency.
create table if not exists removed_creators (
  agency_id uuid not null references agencies(id) on delete cascade,
  normalized_handle text not null,
  removed_at timestamptz default now(),
  primary key (agency_id, normalized_handle)
);

-- User-submitted feedback.
create table if not exists feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id) on delete set null,
  submitted_by text,
  message text not null,
  created_at timestamptz default now()
);

-- Public roadmap items with vote counts.
create table if not exists roadmap_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  votes integer default 0,
  created_at timestamptz default now()
);

-- Server-side error log sink (mirrors Sentry for quick DB queries).
create table if not exists error_logs (
  id uuid primary key default gen_random_uuid(),
  route text,
  message text,
  stack text,
  created_at timestamptz default now()
);
