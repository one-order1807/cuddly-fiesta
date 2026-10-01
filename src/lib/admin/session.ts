import "server-only";
import { cache } from "react";
import { demoMode, supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "./roles";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  demo?: boolean;
};

/** Authoritative role check against `admin_users` (the proxy only does the optimistic redirect). */
export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  if (demoMode) {
    return { id: "00000000-0000-0000-0000-000000000001", email: "demo@one-order.local", name: "Demo Owner", role: "owner", mustChangePassword: false, demo: true };
  }
  if (!supabaseConfigured) return null;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: row } = await supabase
    .from("admin_users")
    .select("id,email,full_name,role,active,must_change_password")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!row || !row.active) return null; // authenticated in Supabase but not an active admin → no access
  return {
    id: row.id,
    email: row.email,
    name: row.full_name || row.email,
    role: row.role as Role,
    mustChangePassword: row.must_change_password,
  };
});
