-- Super Admin 2FA — singleton table (only ever one row) since the platform
-- owner isn't a row in any existing table, just an env var code.
create table if not exists super_admin_2fa (
  id text primary key default 'singleton',
  totp_secret text,
  totp_enabled boolean default false,
  updated_at timestamptz default now()
);

insert into super_admin_2fa (id) values ('singleton') on conflict (id) do nothing;

alter table super_admin_2fa enable row level security;
