-- ONE-ORDER × CLOUD BUILD TECH — core schema
-- Conventions: uuid pk, created_at/updated_at triggers, soft delete (deleted_at), enums for status.


-- ---------- enums ----------
create type admin_role      as enum ('owner','manager','support','viewer');
create type client_status   as enum ('lead','onboarding','active','paused','churned');
create type business_kind   as enum ('cafe','restaurant','hotel','bakery','bar','other');
create type content_status  as enum ('draft','pending','published','archived');
create type billing_cycle   as enum ('monthly','yearly');
create type discount_kind   as enum ('percent','flat');
create type invoice_status  as enum ('draft','sent','paid','overdue','void');
create type payment_mode    as enum ('upi','bank','cash','cheque','card');
create type lead_status     as enum ('new','contacted','demo_booked','proposal','won','lost');
create type ticket_status   as enum ('open','in_progress','waiting','resolved','closed');
create type ticket_priority as enum ('low','normal','high','urgent');
create type backup_status   as enum ('ok','overdue','failed','unknown');
create type release_channel as enum ('stable','beta');
create type release_status  as enum ('draft','released','withdrawn');

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- admin users & roles ----------
create table public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role admin_role not null default 'viewer',
  active boolean not null default true,
  must_change_password boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Security-definer role checks (RLS policies call these; they bypass RLS on admin_users).
create or replace function public.admin_role() returns admin_role
language sql stable security definer set search_path = public as $$
  select role from public.admin_users where id = auth.uid() and active
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where id = auth.uid() and active)
$$;

create or replace function public.has_role(roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users
    where id = auth.uid() and active and role::text = any(roles)
  )
$$;

-- ---------- audit log (insert only) ----------
create table public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  user_email text,
  action text not null,             -- login, login_failed, logout, vault_reveal, create, update, delete, publish ...
  entity text,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_user_idx on public.audit_log (user_id);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

create or replace function public.audit_immutable() returns trigger
language plpgsql as $$
begin raise exception 'audit_log is insert-only'; end $$;
create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute function public.audit_immutable();

-- Login-attempt tracking for brute-force protection (written by server only).
create table public.login_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  ip text,
  success boolean not null default false,
  created_at timestamptz not null default now()
);
create index login_attempts_email_idx on public.login_attempts (email, created_at desc);
create index login_attempts_ip_idx on public.login_attempts (ip, created_at desc);

-- ---------- notifications & reminders ----------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  kind text not null,               -- free_period_ending, invoice_due, backup_overdue, ssl_expiry, stale_repo, credential_rotation, lead_followup
  title text not null,
  body text,
  entity text,
  entity_id uuid,
  due_at timestamptz not null,
  done boolean not null default false,
  dedupe_key text unique,
  assigned_to uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reminders_due_idx on public.reminders (done, due_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.admin_users(id) on delete cascade, -- null = everyone
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read_at);

create trigger t_admin_users_upd before update on public.admin_users for each row execute function public.set_updated_at();
create trigger t_reminders_upd before update on public.reminders for each row execute function public.set_updated_at();
