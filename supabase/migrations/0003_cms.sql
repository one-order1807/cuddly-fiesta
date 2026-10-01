-- Website CMS: everything one-order.co.in renders is stored here.
-- Every content type: draft/published, scheduled publish, sort_order, updated_by, version history.

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.admin_users(id),
  updated_at timestamptz not null default now()
);

create table public.site_sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,        -- hero, story, features, pricing, gallery, reviews, faq, cta ...
  enabled boolean not null default true,
  eyebrow text,                     -- label above heading
  heading text,
  subheading text,
  body text,
  cta_text text,
  cta_link text,
  image_url text,
  extra jsonb not null default '{}'::jsonb,   -- story beat captions etc.
  status content_status not null default 'published',
  publish_at timestamptz,
  sort_order int not null default 0,
  updated_by uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.features (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  bullets text[] not null default '{}',
  icon text,
  image_url text,
  plan_slugs text[] not null default '{}',
  status content_status not null default 'draft',
  publish_at timestamptz,
  sort_order int not null default 0,
  updated_by uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.business_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  benefits text[] not null default '{}',
  hero_image_url text,
  flow_steps text[] not null default '{}',
  status content_status not null default 'draft',
  publish_at timestamptz,
  sort_order int not null default 0,
  updated_by uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  label text,
  caption text,
  alt_text text,
  category text not null default 'Ordering',
  image_url text not null,
  thumb_url text,
  device_frame text not null default 'tablet' check (device_frame in ('phone','tablet','desktop')),
  status content_status not null default 'draft',
  publish_at timestamptz,
  sort_order int not null default 0,
  updated_by uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  head_label text,                  -- "Owner, Cafe Name"
  business text,
  city text,
  rating int not null default 5 check (rating between 1 and 5),
  short_text text,
  full_text text,
  customer_photo_url text,
  business_thumb_url text,
  reviewed_on date default current_date,
  source text,
  client_id uuid references public.clients(id) on delete set null,
  featured boolean not null default false,
  status content_status not null default 'draft',
  publish_at timestamptz,
  sort_order int not null default 0,
  updated_by uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  status content_status not null default 'draft',
  publish_at timestamptz,
  sort_order int not null default 0,
  updated_by uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  popup_headline text,
  perks text[] not null default '{}',
  badge text,
  button_text text default 'Claim offer',
  link_target text default '#contact',
  starts_at timestamptz,
  ends_at timestamptz,
  countdown boolean not null default false,
  show_every_days int not null default 3,
  audience text not null default 'all' check (audience in ('all','new')),
  bar_text text,
  bar_color text default '#2563EB',
  exit_intent_text text,
  enabled boolean not null default true,
  status content_status not null default 'draft',
  sort_order int not null default 0,
  updated_by uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind discount_kind not null default 'percent',
  value numeric(10,2) not null,
  usage_limit int,
  used_count int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.legal_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,        -- privacy, terms, refund, cookies, security, sla, offer-terms
  title text not null,
  body_md text not null default '',
  status content_status not null default 'draft',
  publish_at timestamptz,
  updated_by uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seo_pages (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,        -- '/', '/privacy' ...
  title text,
  description text,
  og_image_url text,
  in_sitemap boolean not null default true,
  structured_data jsonb not null default '{}'::jsonb,
  updated_by uuid references public.admin_users(id),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'public-site',
  path text not null,
  url text not null,
  name text not null,
  alt_text text,
  tags text[] not null default '{}',
  mime text,
  size_bytes bigint,
  width int,
  height int,
  variants jsonb not null default '{}'::jsonb,   -- {webp, thumb_square, thumb_169, sizes:[...]}
  uploaded_by uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (bucket, path)
);

-- Version history (restore from here)
create table public.content_versions (
  id bigint generated always as identity primary key,
  entity text not null,
  entity_id text not null,
  snapshot jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index content_versions_entity_idx on public.content_versions (entity, entity_id, created_at desc);

create or replace function public.snapshot_content() returns trigger
language plpgsql security definer set search_path = public as $$
declare j jsonb := to_jsonb(old);
begin
  insert into public.content_versions (entity, entity_id, snapshot, created_by)
  values (tg_table_name, coalesce(j->>'id', j->>'key', j->>'path'), j, auth.uid());
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['site_settings','site_sections','features','business_types','gallery_items',
    'testimonials','faqs','offers','legal_pages','seo_pages','plans']
  loop
    execute format('create trigger t_%1$s_ver before update on public.%1$I for each row execute function public.snapshot_content()', t);
  end loop;
  foreach t in array array['site_sections','features','business_types','gallery_items','testimonials','faqs',
    'offers','coupons','legal_pages','media_assets']
  loop
    execute format('create trigger t_%1$s_upd before update on public.%1$I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- public read-only views (what the website may see) ----------
-- Views run as owner, so anon needs no table access. They only expose published, live, non-deleted rows.
create view public.v_public_plans with (security_invoker = false) as
  select id, slug, name, badge, best_for, price_monthly, price_yearly, original_price, price_label,
         free_setup_text, icon_url, features, limits, cta_text, highlight, sort_order
  from public.plans
  where active and deleted_at is null and status = 'published' and (publish_at is null or publish_at <= now());

create view public.v_public_features with (security_invoker = false) as
  select id, title, summary, bullets, icon, image_url, plan_slugs, sort_order
  from public.features
  where deleted_at is null and status = 'published' and (publish_at is null or publish_at <= now());

create view public.v_public_business_types with (security_invoker = false) as
  select id, slug, name, tagline, benefits, hero_image_url, flow_steps, sort_order
  from public.business_types
  where deleted_at is null and status = 'published' and (publish_at is null or publish_at <= now());

create view public.v_public_gallery with (security_invoker = false) as
  select id, title, label, caption, alt_text, category, image_url, thumb_url, device_frame, sort_order
  from public.gallery_items
  where deleted_at is null and status = 'published' and (publish_at is null or publish_at <= now());

create view public.v_public_testimonials with (security_invoker = false) as
  select id, customer_name, head_label, business, city, rating, short_text, full_text,
         customer_photo_url, business_thumb_url, reviewed_on, featured, sort_order
  from public.testimonials
  where deleted_at is null and status = 'published' and (publish_at is null or publish_at <= now());

create view public.v_public_faqs with (security_invoker = false) as
  select id, question, answer, category, sort_order
  from public.faqs
  where deleted_at is null and status = 'published' and (publish_at is null or publish_at <= now());

create view public.v_public_offers with (security_invoker = false) as
  select id, title, popup_headline, perks, badge, button_text, link_target, starts_at, ends_at, countdown,
         show_every_days, audience, bar_text, bar_color, exit_intent_text, sort_order
  from public.offers
  where enabled and deleted_at is null and status = 'published'
    and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now());

create view public.v_public_sections with (security_invoker = false) as
  select slug, enabled, eyebrow, heading, subheading, body, cta_text, cta_link, image_url, extra, sort_order
  from public.site_sections
  where deleted_at is null and status = 'published' and (publish_at is null or publish_at <= now());

create view public.v_public_legal with (security_invoker = false) as
  select slug, title, body_md, updated_at
  from public.legal_pages
  where status = 'published' and (publish_at is null or publish_at <= now());

create view public.v_public_settings with (security_invoker = false) as
  select key, value from public.site_settings;

create view public.v_public_seo with (security_invoker = false) as
  select path, title, description, og_image_url, in_sitemap, structured_data from public.seo_pages;

grant select on public.v_public_plans, public.v_public_features, public.v_public_business_types,
  public.v_public_gallery, public.v_public_testimonials, public.v_public_faqs, public.v_public_offers,
  public.v_public_sections, public.v_public_legal, public.v_public_settings, public.v_public_seo
  to anon, authenticated;

-- Latest-version lookup for the apps (also exposed via FastAPI GET /public/latest-version)
create view public.v_public_latest_versions with (security_invoker = false) as
  select distinct on (a.slug, v.platform, v.channel)
         a.slug as app, v.platform, v.channel, v.version, v.build_number, v.release_notes,
         v.download_url, v.store_url, v.min_supported_version, v.force_update, v.release_date
  from public.app_versions v join public.apps a on a.id = v.app_id
  where v.status = 'released'
  order by a.slug, v.platform, v.channel, v.release_date desc nulls last, v.created_at desc;
grant select on public.v_public_latest_versions to anon, authenticated;
