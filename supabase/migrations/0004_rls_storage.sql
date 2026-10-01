-- Row Level Security: deny by default. Every table gets RLS; policies grant only what is listed here.
-- Roles: owner (all) · manager (all except users/billing settings) · support (clients read, tickets, no vault) · viewer (read only)

do $$
declare t text;
begin
  -- Tables every active admin can read.
  foreach t in array array[
    'clients','client_contacts','onboarding_stages','onboarding_tasks','plans','subscriptions','devices','repos',
    'deployments','backups','backup_logs','apps','app_versions','client_apps','invoices','payments','documents',
    'activities','leads','support_requests','reminders','notifications','site_settings','site_sections','features',
    'business_types','gallery_items','testimonials','faqs','offers','coupons','legal_pages','seo_pages',
    'content_versions','media_assets'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admins read" on public.%I for select to authenticated using (public.is_admin())', t);
  end loop;

  -- Owner + manager can write business/CMS data.
  foreach t in array array[
    'clients','client_contacts','onboarding_stages','onboarding_tasks','plans','subscriptions','devices','repos',
    'deployments','backups','backup_logs','apps','app_versions','client_apps','documents','leads','reminders',
    'notifications','site_settings','site_sections','features','business_types','gallery_items','testimonials',
    'faqs','offers','coupons','legal_pages','seo_pages','media_assets'
  ] loop
    execute format($f$create policy "managers write" on public.%I for all to authenticated
      using (public.has_role(array['owner','manager'])) with check (public.has_role(array['owner','manager']))$f$, t);
  end loop;
end $$;

-- Billing: owner only writes (manager reads).
create policy "owner writes invoices" on public.invoices for all to authenticated
  using (public.has_role(array['owner'])) with check (public.has_role(array['owner']));
create policy "owner writes payments" on public.payments for all to authenticated
  using (public.has_role(array['owner'])) with check (public.has_role(array['owner']));

-- Support staff: tickets + timeline notes.
create policy "support writes tickets" on public.support_requests for all to authenticated
  using (public.has_role(array['owner','manager','support'])) with check (public.has_role(array['owner','manager','support']));
create policy "staff write activities" on public.activities for all to authenticated
  using (public.has_role(array['owner','manager','support'])) with check (public.has_role(array['owner','manager','support']));

-- Version history is written by trigger only.
-- admin_users: owner manages; everyone reads their own row (needed for role lookup in the proxy).
alter table public.admin_users enable row level security;
create policy "read self" on public.admin_users for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "owner manages users" on public.admin_users for all to authenticated
  using (public.has_role(array['owner'])) with check (public.has_role(array['owner']));

-- audit_log: any active admin may insert their own entries; owner/manager read. No update/delete policy (+ trigger).
alter table public.audit_log enable row level security;
create policy "insert own audit" on public.audit_log for insert to authenticated
  with check (public.is_admin() and (user_id is null or user_id = auth.uid()));
create policy "read audit" on public.audit_log for select to authenticated using (public.has_role(array['owner','manager']));

-- credentials & login_attempts: RLS on, NO policies → only the service-role key (backend) can touch them.
alter table public.credentials enable row level security;
alter table public.login_attempts enable row level security;

-- ---------- anon (public website) inserts, validated ----------
create policy "public submits leads" on public.leads for insert to anon
  with check (
    status = 'new' and assigned_to is null and converted_client_id is null and deleted_at is null
    and length(name) between 2 and 120 and length(phone) between 7 and 20
    and (message is null or length(message) <= 2000)
  );

create policy "public submits tickets" on public.support_requests for insert to anon
  with check (
    status = 'open' and priority = 'normal' and client_id is null and assigned_to is null
    and length(subject) between 3 and 200 and (message is null or length(message) <= 4000)
  );

create policy "public submits reviews" on public.testimonials for insert to anon
  with check (
    status = 'pending' and featured = false and client_id is null and deleted_at is null
    and length(customer_name) between 2 and 120 and rating between 1 and 5
    and (short_text is null or length(short_text) <= 600)
  );

-- ---------- storage buckets ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('public-site', 'public-site', true, 5242880, array['image/png','image/jpeg','image/webp','image/avif','image/svg+xml']),
  ('private-clients', 'private-clients', false, 15728640, null)
on conflict (id) do nothing;

-- public-site: anyone reads; managers write via authenticated session (or backend with service role).
create policy "public-site read" on storage.objects for select using (bucket_id = 'public-site');
create policy "public-site managers write" on storage.objects for all to authenticated
  using (bucket_id = 'public-site' and public.has_role(array['owner','manager']))
  with check (bucket_id = 'public-site' and public.has_role(array['owner','manager']));
-- private-clients: admins read via signed URLs; managers write.
create policy "private-clients admins read" on storage.objects for select to authenticated
  using (bucket_id = 'private-clients' and public.is_admin());
create policy "private-clients managers write" on storage.objects for all to authenticated
  using (bucket_id = 'private-clients' and public.has_role(array['owner','manager']))
  with check (bucket_id = 'private-clients' and public.has_role(array['owner','manager']));

-- ---------- realtime for the dashboard ----------
alter publication supabase_realtime add table public.leads, public.clients, public.support_requests, public.notifications;
