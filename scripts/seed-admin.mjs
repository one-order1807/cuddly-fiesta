// Creates the first owner account from environment variables and forces a password change at first login.
//   node --env-file=.env.local scripts/seed-admin.mjs
// Never put the password in this file or in a prompt.
import { createClient } from "@supabase/supabase-js";

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, ADMIN_EMAIL: email, ADMIN_INITIAL_PASSWORD: password } = process.env;

if (!url || !key || !email || !password) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD");
  process.exit(1);
}
if (password.length < 12) {
  console.error("ADMIN_INITIAL_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let userId;
const { data: created, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
if (error) {
  if (!/already|registered|exists/i.test(error.message)) { console.error("createUser failed:", error.message); process.exit(1); }
  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  userId = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
  if (!userId) { console.error("User exists but could not be found."); process.exit(1); }
  console.log("Auth user already exists — updating the admin_users row only.");
} else {
  userId = created.user.id;
}

const { error: upsertErr } = await sb.from("admin_users").upsert(
  { id: userId, email: email.toLowerCase(), full_name: "Owner", role: "owner", active: true, must_change_password: !error },
  { onConflict: "id" },
);
if (upsertErr) { console.error("admin_users upsert failed:", upsertErr.message); process.exit(1); }

console.log(`Owner ready: ${email}. ${error ? "" : "You will be asked to set a new password on first login."}`);
console.log("Now remove ADMIN_INITIAL_PASSWORD from your environment.");
