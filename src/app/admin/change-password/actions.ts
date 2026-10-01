"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAdmin } from "@/lib/admin/session";
import { audit } from "@/lib/admin/audit";
import { demoMode } from "@/lib/env";
import { passwordProblem } from "@/lib/admin/password";

export type PwState = { error?: string } | null;

export async function changePassword(_prev: PwState, form: FormData): Promise<PwState> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const pw = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const problem = passwordProblem(pw, admin.email);
  if (problem) return { error: problem };
  if (pw !== confirm) return { error: "The two passwords don't match." };
  if (demoMode) redirect("/admin");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) return { error: error.message.includes("different") ? "Choose a password you haven't used before." : "Could not update the password. Please try again." };

  // Only the server may clear the flag (users cannot write admin_users under RLS).
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) await createServiceClient().from("admin_users").update({ must_change_password: false }).eq("id", admin.id);
  await audit(admin, { action: "password_changed" });
  redirect("/admin");
}
