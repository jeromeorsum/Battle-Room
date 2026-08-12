-- Email verification for agency contact emails.
alter table agencies add column if not exists contact_email_verified boolean default false;

-- Grandfather in existing agencies — they've already been successfully
-- using their contact email (billing codes, etc. have worked), so don't
-- suddenly flag everyone as unverified. Only new signups going forward
-- start unverified and get the confirmation email.
update agencies set contact_email_verified = true where contact_email_verified is not true;
