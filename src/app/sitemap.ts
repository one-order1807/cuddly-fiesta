import type { MetadataRoute } from "next";
import { supabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/server";

// Public pages only — /admin is never listed.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const urls: MetadataRoute.Sitemap = [{ url: base, changeFrequency: "weekly", priority: 1 }];
  if (supabaseConfigured) {
    const { data } = await createPublicClient().from("v_public_legal").select("slug,updated_at");
    (data ?? []).forEach((l) => urls.push({ url: `${base}/legal/${l.slug}`, lastModified: l.updated_at, priority: 0.3 }));
  }
  return urls;
}
