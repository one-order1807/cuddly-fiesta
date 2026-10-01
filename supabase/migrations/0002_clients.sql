-- Clients, onboarding, plans, subscriptions, devices, repos, backups, apps, vault, billing, leads, support

-- ---------- plans (also the website pricing CMS) ----------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  badge text,                        -- "Most Popular"
  best_for text,
  price_monthly numeric(10,2) not null default 0,
  price_yearly numeric(10,2) not null default 0,
  original_price numeric(10,2),      -- strike-through
  price_label text,
  free_setup_text text,
  icon_url text,
  features jsonb not null default '[]'::jsonb,   -- [{group, text, included}]
  limits jsonb not null default '{}'::jsonb,     -- {outlets, users, printers, tables}
  cta_text text default 'Get started',
  highlight boolean not null default false,
  active boolean not null default true,
  status content_status not null default 'draft',
  publish_at timestamptz,
  sort_order int not null default 0,
  updated_by uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- clients ----------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  owner_name text,
  phone text,
  whatsapp text,
  email text,
  business_type business_kind not null default 'cafe',
  city text,
  address text,
  gst_number text,
  logo_url text,
  status client_status not null default 'lead',
  tags text[] not null default '{}',
  notes text,
  assigned_to uuid references public.admin_users(id),
  assigned_by uuid references public.admin_users(id),
  assigned_at timestamptz,
  source text,
  onboarding_stage text not null default 'Lead',
  go_live_date date,
  lead_id uuid,
  search tsvector generated always as (
    to_tsvector('simple',
      coalesce(business_name,'') || ' ' || coalesce(owner_name,'') || ' ' ||
      coalesce(phone,'') || ' ' || coalesce(email,'') || ' ' || coalesce(city,''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index clients_search_idx on public.clients using gin (search);
create index clients_status_idx on public.clients (status) where deleted_at is null;
create index clients_city_idx on public.clients (city);
create unique index clients_phone_uniq on public.clients (phone) where phone is not null and deleted_at is null;

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pipeline stage definitions (configurable)
create table public.onboarding_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

create table public.onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  owner_id uuid references public.admin_users(id),
  due_date date,
  done boolean not null default false,
  done_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index onboarding_tasks_client_idx on public.onboarding_tasks (client_id);

-- ---------- subscription: plan, discount, free period ----------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  plan_id uuid references public.plans(id),
  cycle billing_cycle not null default 'monthly',
  list_price numeric(10,2) not null default 0,
  discount_type discount_kind not null default 'percent',
  discount_amount numeric(10,2) not null default 0,
  discount_reason text,
  free_period_months int not null default 6,
  free_period_start date,
  free_period_end date,
  total_amount numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  amount_due numeric(12,2) generated always as (greatest(total_amount - amount_paid, 0)) stored,
  next_billing_date date,
  renewal_reminder boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_free_end_idx on public.subscriptions (free_period_end);

-- ---------- devices ----------
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  device_type text not null,       -- Android phone, Tablet, Desktop/PC, Kitchen display, Thermal printer 2", 3", Barcode scanner, Cash drawer, Other
  brand_model text,
  serial text,
  quantity int not null default 1 check (quantity > 0),
  purchased_from text,
  provided_by text default 'client' check (provided_by in ('client','us')),
  install_date date,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index devices_client_idx on public.devices (client_id);

-- ---------- repos / deployments ----------
create table public.repos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  github_url text not null,
  repo_name text,
  default_branch text default 'main',
  visibility text,
  last_commit_sha text,
  last_commit_message text,
  last_commit_at timestamptz,
  ci_status text,
  app_type text,                   -- expo, web, backend
  tech_stack text,
  issue_tracker_url text,
  readme_url text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index repos_client_idx on public.repos (client_id);

create table public.deployments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  repo_id uuid references public.repos(id) on delete set null,
  environment text not null default 'prod',
  deploy_url text,
  hosting_provider text,
  backend_type text,               -- Supabase / Firebase / Custom
  project_ref text,
  region text,
  db_host text,                    -- shown masked in the UI
  storage_bucket text,
  domain text,
  ssl_expires_on date,
  server_provider text,
  monitoring_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deployments_client_idx on public.deployments (client_id);

-- ---------- backups ----------
create table public.backups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  frequency text not null default 'daily',
  last_backup_at timestamptz,
  next_backup_at timestamptz,
  location text,
  retention_days int not null default 30,
  size_mb numeric(12,2),
  status backup_status not null default 'unknown',
  restore_tested_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.backup_logs (
  id uuid primary key default gen_random_uuid(),
  backup_id uuid not null references public.backups(id) on delete cascade,
  ok boolean not null default true,
  size_mb numeric(12,2),
  note text,
  source text not null default 'manual',   -- manual | webhook
  created_at timestamptz not null default now()
);

-- ---------- apps & versions ----------
create table public.apps (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_versions (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  version text not null,           -- semver
  build_number int,
  platform text not null default 'android',
  channel release_channel not null default 'stable',
  release_date date,
  release_notes text,
  download_url text,
  store_url text,
  min_supported_version text,
  force_update boolean not null default false,
  status release_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (app_id, platform, channel, version)
);

create table public.client_apps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  app_id uuid not null references public.apps(id) on delete cascade,
  platform text not null default 'android',
  installed_version text,
  last_updated_at timestamptz,
  update_method text default 'apk',  -- play_store | apk | ota
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, app_id, platform)
);

-- ---------- credentials vault (ciphertext only; backend/service role access only) ----------
create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  label text not null,
  username text,
  url text,
  notes text,
  secret_ciphertext bytea not null,
  secret_nonce bytea not null,
  rotation_days int not null default 90,
  last_changed_at timestamptz not null default now(),
  created_by uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index credentials_client_idx on public.credentials (client_id);

-- ---------- billing ----------
create sequence public.invoice_number_seq start 1001;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  number text not null unique default ('INV-' || nextval('public.invoice_number_seq')),
  issue_date date not null default current_date,
  due_date date,
  items jsonb not null default '[]'::jsonb,       -- [{desc, qty, rate}]
  gst_enabled boolean not null default false,
  gst_percent numeric(5,2) not null default 18,
  discount numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status invoice_status not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index invoices_client_idx on public.invoices (client_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  paid_on date not null default current_date,
  mode payment_mode not null default 'upi',
  reference text,
  amount numeric(12,2) not null check (amount > 0),
  created_by uuid references public.admin_users(id),
  created_at timestamptz not null default now()
);
create index payments_client_idx on public.payments (client_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  kind text,
  storage_path text not null,       -- in private-clients bucket
  size_bytes bigint,
  mime text,
  uploaded_by uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  kind text not null default 'note',    -- note, call, status_change, payment, version_update, vault_reveal ...
  body text,
  meta jsonb not null default '{}'::jsonb,
  created_by uuid references public.admin_users(id),
  created_at timestamptz not null default now()
);
create index activities_client_idx on public.activities (client_id, created_at desc);

-- ---------- leads & support ----------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_name text,
  phone text not null,
  email text,
  city text,
  business_type business_kind,
  message text,
  plan_interest text,
  status lead_status not null default 'new',
  source text,
  utm jsonb not null default '{}'::jsonb,
  coupon_code text,
  assigned_to uuid references public.admin_users(id),
  follow_up_at timestamptz,
  notes text,
  converted_client_id uuid references public.clients(id),
  search tsvector generated always as (
    to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(business_name,'') || ' ' || coalesce(phone,'') || ' ' || coalesce(email,'') || ' ' || coalesce(city,''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index leads_search_idx on public.leads using gin (search);
create index leads_status_idx on public.leads (status) where deleted_at is null;
create index leads_phone_idx on public.leads (phone);

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  name text,
  phone text,
  email text,
  subject text not null,
  message text,
  status ticket_status not null default 'open',
  priority ticket_priority not null default 'normal',
  assigned_to uuid references public.admin_users(id),
  replies jsonb not null default '[]'::jsonb,   -- [{by, at, body}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array['plans','clients','client_contacts','onboarding_tasks','subscriptions','devices','repos',
    'deployments','backups','apps','app_versions','client_apps','credentials','invoices','leads','support_requests']
  loop
    execute format('create trigger t_%1$s_upd before update on public.%1$I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
