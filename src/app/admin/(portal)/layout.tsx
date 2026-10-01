import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/session";
import { getDb } from "@/lib/admin/db";
import Shell from "@/components/admin/Shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword) redirect("/admin/change-password");

  let unread = 0;
  try {
    const { rows } = await (await getDb()).list("notifications", { filters: { read_at: null }, limit: 50 });
    unread = rows.length;
  } catch { /* notifications are non-critical */ }

  return <Shell admin={admin} unread={unread}>{children}</Shell>;
}
