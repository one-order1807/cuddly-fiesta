import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getAdmin } from "@/lib/admin/session";
import { getDb } from "@/lib/admin/db";
import { can } from "@/lib/admin/roles";
import { PageHeader, Card } from "@/components/admin/ui";
import PublishButton from "@/components/admin/PublishButton";
import { siteUrl } from "@/lib/env";

const AREAS = [
  { href: "pages", label: "Pages & Sections", table: "site_sections", hint: "Headings, labels, buttons, hero & story captions" },
  { href: "plans", label: "Packages & Pricing", table: "plans", hint: "Plans, prices, strike-through, features, limits" },
  { href: "testimonials", label: "Customer Reviews", table: "testimonials", hint: "Add, feature or publish reviews" },
  { href: "offers", label: "Offers & Popup", table: "offers", hint: "Top bar, popup, countdown, coupons" },
  { href: "gallery", label: "Gallery & Screens", table: "gallery_items", hint: "Photos and POS screens" },
  { href: "features", label: "Features", table: "features", hint: "Feature cards and popup bullets" },
  { href: "business_types", label: "Business Types", table: "business_types", hint: "Café, restaurant, bakery…" },
  { href: "faqs", label: "FAQ", table: "faqs", hint: "Questions & answers" },
  { href: "legal", label: "Legal Pages", table: "legal_pages", hint: "Privacy, terms, refund, SLA" },
  { href: "settings", label: "Site Settings", table: "site_settings", hint: "WhatsApp, email, address, logos, social" },
  { href: "seo", label: "SEO", table: "seo_pages", hint: "Titles, descriptions, share image" },
  { href: "coupons", label: "Coupons", table: "coupons", hint: "Codes tied to leads" },
];

export default async function CmsHub() {
  const admin = await getAdmin();
  const db = await getDb();
  const counts = await Promise.all(AREAS.map(async (a) => {
    try { const r = await db.list(a.table, { softDelete: !["site_settings", "coupons", "seo_pages", "legal_pages"].includes(a.table), limit: 1 }); return r.count; } catch { return 0; }
  }));

  return (
    <>
      <PageHeader title="Website CMS" description="Everything on one-order.co.in is edited here. Save your changes, then press Publish to push them live." actions={admin && can.publish(admin.role) ? <PublishButton siteUrl={siteUrl} /> : undefined} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {AREAS.map((a, i) => (
          <Link key={a.href} href={`/admin/cms/${a.href}`} className="group">
            <Card className="h-full transition-transform duration-300 group-hover:-translate-y-1">
              <div className="flex items-start justify-between"><h2 className="text-lg font-semibold">{a.label}</h2><ArrowUpRight size={18} className="text-[var(--fg-muted)] transition-colors group-hover:text-[var(--primary)]" /></div>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">{a.hint}</p>
              <p className="serif mt-4 text-3xl tabular-nums">{counts[i]}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
