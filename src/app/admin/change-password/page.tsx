import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/session";
import ChangePasswordForm from "./ChangePasswordForm";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false, follow: false } };

export default async function ChangePasswordPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="orbs" aria-hidden><span className="orb orb-a" /><span className="orb orb-b" /></div>
      <ChangePasswordForm forced={admin.mustChangePassword} />
    </main>
  );
}
