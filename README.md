# One-Order × Cloud Build Tech

One repo, three parts:

| Part | Where | What it does |
|---|---|---|
| **Public website** | `src/app/(site)` → `/` | Cinematic scroll site (Lenis + GSAP ScrollTrigger + Three.js). All content comes from Supabase and falls back to `src/content/fallback.json`. |
| **Admin portal** | `src/app/admin` → `/admin` | Clients, onboarding, plans & free periods, devices, repos, backups, vault, billing, leads, support, and the **CMS** that controls the website. |
| **Python service** | `backend/` | Encrypted credentials vault, GitHub sync, backup webhook, public `latest-version` endpoint, daily reminders. |
| **Database** | `supabase/` | Migrations (schema + RLS + storage) and starter seed. |

## Quick preview (no accounts needed)

```bash
npm install
cp .env.example .env.local      # then set ADMIN_DEMO=1
npm run dev                     # http://localhost:3000  and  /admin
```

`ADMIN_DEMO=1` opens the admin with an in-memory sample store (resets on restart). It is **hard-disabled when `NODE_ENV=production`**.
Without Supabase the public site renders from `fallback.json`, and the lead form tells visitors to use WhatsApp.

## Real setup

1. **Supabase** → create a project. In the SQL editor run, in order: `supabase/migrations/0001…0004`, then `supabase/seed.sql`.
   Auth → enable **MFA (TOTP)** if you want two-factor.
2. **Env** → copy `.env.example` to `.env.local` and fill the Supabase URL/keys, `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD` (12+ chars), `REVALIDATE_SECRET` (long random string).
3. **First admin** → `node --env-file=.env.local scripts/seed-admin.mjs`. You are forced to choose a new password on first login. Then delete `ADMIN_INITIAL_PASSWORD` from the env.
4. **Run** → `npm run dev`, open `/admin/login`.
5. **Python service** (needed for the vault):
   ```bash
   cd backend
   cp .env.example .env            # fill it; generate VAULT_KEY as described inside
   uv venv && uv pip install -r requirements.txt     # or: python -m venv .venv && pip install -r requirements.txt
   .venv/Scripts/python -m pytest                    # 31 tests
   .venv/Scripts/uvicorn app.main:app --port 8000
   ```
   **Back up `VAULT_KEY`.** Losing it makes every stored secret unrecoverable.

## How editing the website works

Admin → **Website CMS** → edit anything (prices, labels, reviews, offers, gallery, settings…) → **Publish changes**.
Content is `draft` / `pending` / `published`, supports scheduled publish (`publish_at`), drag-to-reorder, and every edit is snapshotted in `content_versions`.
The site reads only the `v_public_*` views, so drafts can never leak. Publishing calls `revalidatePath` (and `SITE_REVALIDATE_URL` if the website is deployed separately).

## Security model (what is actually enforced)

- Row Level Security on every table; the public (anon) role can only read `v_public_*` views and insert validated leads / tickets / *pending* reviews. `credentials` and `login_attempts` have **no** policies (service role only).
- Roles `owner / manager / support / viewer` checked in the DB (RLS), in server actions, and in the Python API.
- Session cookies are `httpOnly`, `sameSite=lax`, `secure` in production; 30-minute idle sign-out with warning; "Sign out everywhere".
- Login: generic error, 5 failures / 15 min per email (25 per IP), progressive delay, lock, every attempt audited. Forced strong password change on first login. Optional TOTP.
- Vault: AES-256-GCM, key only in env, ciphertext bound to its row, list endpoints never return secrets, reveal needs password re-entry + role + rate limit, auto-hides after 20 s, audit-logged, clipboard cleared after 30 s.
- `audit_log` is insert-only (RLS **and** a trigger).
- Uploads: PNG/JPEG/WebP/AVIF by magic bytes (never the client MIME type), 5 MB cap, SVG rejected.
- Strict nonce CSP on `/admin`, `noindex` on `/admin`, constant-time secret comparison on webhooks, CSV-injection-safe exports.

## Tests

| Suite | Command | Covers |
|---|---|---|
| Python | `cd backend && pytest` | crypto, vault auth/role/re-auth/rate-limit/audit, webhook, version check, CSV, reminders |
| SQL / RLS | `npm i -D @electric-sql/pglite && node scripts/test-sql.mjs` | migrations apply; anon/viewer/support/owner boundaries; audit immutability |
| Type + lint | `npx tsc --noEmit && npm run lint` | |

## Known gaps (honest list)

- **Not yet built:** invoice PDFs, media processing (WebP/thumbnails via Pillow), team invitations by email, Leads kanban view + "Convert to client", CSV import with mapping, onboarding tour, presence ("Priya is editing"), Playwright e2e for login/vault, GitHub-sync and "Notify on WhatsApp" buttons in the UI (API exists for sync).
- Dashboard "realtime" is a 30-second refresh, not Supabase websockets, because session cookies are `httpOnly` (a deliberate security trade-off).
- Supabase has no recovery codes for TOTP; keep the secret key or enrol two devices.
- The Python service has been unit-tested against a fake store, **not** against a live Supabase project or the real GitHub API.
- Prices and copy in `seed.sql` / `fallback.json` are **placeholders** — set your real ones in the CMS.

## Deploy

- **Next.js** → Vercel. Set the env vars from `.env.example`.
- **Python** → `backend/Dockerfile` (Render / Railway / any Docker host). Keep `ENABLE_SCHEDULER=1` on exactly one replica.
- Set `ALLOWED_ORIGINS` on the API to the admin + website origins only.
