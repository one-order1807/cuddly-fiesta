import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/session";
import { getDb } from "@/lib/admin/db";
import { can } from "@/lib/admin/roles";
import { Badge, Card, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Users & Roles" };

const ROLE_HELP = [
  ["owner", "Everything, including users and billing."],
  ["manager", "Everything except users and billing settings."],
  ["support", "Read clients, handle tickets. Cannot reveal vault secrets."],
  ["viewer", "Read-only."],
];

export default async function UsersPage() {
  const admin = await getAdmin();
  if (!admin || !can.manageUsers(admin.role)) redirect("/admin");
  const { rows } = await (await getDb()).list("admin_users", { order: { col: "created_at" } });
  return (
    <>
      <PageHeader title="Users & Roles" description="Team members who can sign in to this portal. Invites by email arrive with Stage 5; until then add users in Supabase Auth and insert a row in admin_users." />
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wider text-[var(--fg-muted)]"><th className="px-4 py-3">Name</th><th>Email</th><th>Role</th><th>Active</th><th>Last login</th></tr></thead>
            <tbody>{rows.map((u) => (
              <tr key={u.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-4 py-3 font-semibold">{u.full_name || "—"}</td><td>{u.email}</td><td><Badge value={u.role} tone="info" /></td><td>{u.active ? "Yes" : "No"}</td>
                <td className="text-[var(--fg-muted)]">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString("en-IN") : "—"}</td>
              </tr>))}</tbody>
          </table>
        </div>
        <Card title="Roles"><dl className="space-y-3 text-sm">{ROLE_HELP.map(([r, d]) => <div key={r}><dt className="font-semibold capitalize">{r}</dt><dd className="text-[var(--fg-muted)]">{d}</dd></div>)}</dl></Card>
      </div>
    </>
  );
}
