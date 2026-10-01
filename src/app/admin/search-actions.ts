"use server";

import { getAdmin } from "@/lib/admin/session";
import { getDb } from "@/lib/admin/db";

export type SearchHit = { type: "Client" | "Lead" | "Repo"; id: string; title: string; sub: string; href: string };

export async function globalSearch(q: string): Promise<SearchHit[]> {
  if (!(await getAdmin()) || q.trim().length < 2) return [];
  const db = await getDb();
  const [clients, leads, repos] = await Promise.all([
    db.list("clients", { q, searchCols: ["business_name", "owner_name", "phone", "city"], softDelete: true, limit: 5 }),
    db.list("leads", { q, searchCols: ["name", "business_name", "phone"], softDelete: true, limit: 5 }),
    db.list("repos", { q, searchCols: ["repo_name", "github_url"], softDelete: true, limit: 5 }),
  ]);
  return [
    ...clients.rows.map((r): SearchHit => ({ type: "Client", id: r.id, title: r.business_name, sub: [r.owner_name, r.city].filter(Boolean).join(" · "), href: `/admin/clients/${r.id}` })),
    ...leads.rows.map((r): SearchHit => ({ type: "Lead", id: r.id, title: r.name, sub: [r.business_name, r.phone].filter(Boolean).join(" · "), href: `/admin/leads` })),
    ...repos.rows.map((r): SearchHit => ({ type: "Repo", id: r.id, title: r.repo_name ?? r.github_url, sub: r.github_url, href: `/admin/repos` })),
  ];
}
