import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { supabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/server";

export const revalidate = 60;

async function getLegal(slug: string) {
  if (!supabaseConfigured) return null;
  const { data } = await createPublicClient().from("v_public_legal").select("slug,title,body_md,updated_at").eq("slug", slug).maybeSingle();
  return data as { slug: string; title: string; body_md: string; updated_at: string } | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getLegal((await params).slug);
  return { title: p ? `${p.title} — One-Order` : "Not found" };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = await getLegal((await params).slug);
  if (!page) notFound();
  return (
    <main className="mx-auto max-w-3xl px-5 py-28">
      <Link href="/" className="text-sm text-[var(--fg-muted)] hover:text-white">← One-Order</Link>
      <h1 className="mt-6 text-5xl">{page.title}</h1>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">Last updated {new Date(page.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
      {/* react-markdown does not render raw HTML by default, so admin-authored markdown can't inject scripts */}
      <article className="mt-10 space-y-4 text-[var(--fg)]/90 [&_a]:text-[var(--primary)] [&_h2]:mt-8 [&_h2]:text-3xl [&_h3]:mt-6 [&_h3]:text-2xl [&_li]:ml-5 [&_li]:list-disc">
        <ReactMarkdown>{page.body_md}</ReactMarkdown>
      </article>
    </main>
  );
}
