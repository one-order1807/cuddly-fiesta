import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/session";
import { demoMode } from "@/lib/env";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Admin Portal — Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getAdmin()) redirect("/admin");
  const { next } = await searchParams;
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="orbs" aria-hidden><span className="orb orb-a" /><span className="orb orb-b" /><span className="orb orb-c" /></div>
      <LoginForm next={next} demo={demoMode} />
    </main>
  );
}
