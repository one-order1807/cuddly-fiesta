import Link from "next/link";
import { getAdmin } from "@/lib/admin/session";
import { getMfaStatus } from "@/app/admin/security-actions";
import { signOutEverywhereAction } from "@/app/admin/actions";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import MfaCard from "@/components/admin/MfaCard";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const admin = await getAdmin();
  const mfa = await getMfaStatus();
  return (
    <>
      <PageHeader title="Settings" description="Your profile and account security." />
      <div className="grid gap-4 lg:max-w-3xl">
        <Card title="Profile">
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div><dt className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Name</dt><dd className="mt-1">{admin?.name}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Email</dt><dd className="mt-1">{admin?.email}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Role</dt><dd className="mt-1"><Badge value={admin?.role ?? ""} tone="info" /></dd></div>
          </dl>
        </Card>
        <Card title="Password"><div className="flex items-center justify-between gap-3"><p className="text-sm text-[var(--fg-muted)]">Use at least 12 characters. Don&apos;t reuse it anywhere else.</p><Link href="/admin/change-password" className="btn btn-ghost">Change password</Link></div></Card>
        <MfaCard enrolled={mfa.enrolled} available={mfa.available} />
        <Card title="Sessions"><form action={signOutEverywhereAction} className="flex items-center justify-between gap-3"><p className="text-sm text-[var(--fg-muted)]">Sign out of every browser and device, including this one.</p><button className="btn btn-danger">Sign out everywhere</button></form></Card>
      </div>
    </>
  );
}
