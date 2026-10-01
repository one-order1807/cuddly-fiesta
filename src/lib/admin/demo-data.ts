import "server-only";
import type { Row } from "./db";
import fallback from "@/content/fallback.json";

// Dev-only sample data used when ADMIN_DEMO=1. Never shipped to production (demoMode is false there).
const id = () => crypto.randomUUID();
const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const ts = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

export function demoSeed(): Record<string, Row[]> {
  const planA = id(), planB = id(), planC = id();
  const c1 = id(), c2 = id(), c3 = id(), c4 = id();
  const appPos = id();

  const base = (extra: Row): Row => ({ id: id(), created_at: ts(-30), updated_at: ts(-1), deleted_at: null, ...extra });

  return {
    onboarding_stages: ["Lead", "Demo", "Agreement", "Setup", "Training", "Go-live", "Support"].map((name, i) => ({ id: id(), name, sort_order: i })),
    plans: [
      base({ id: planA, slug: "starter", name: "Starter", badge: null, best_for: "Single counter café", price_monthly: 499, price_yearly: 4999, original_price: 799, price_label: null, free_setup_text: "Free setup", icon_url: null, cta_text: "Get started", highlight: false, active: true, status: "published", publish_at: null, sort_order: 1, features: [{ group: "Core", text: "Order screen + bills", included: true }, { group: "Core", text: "Kitchen portal", included: false }], limits: { outlets: 1, users: 2, printers: 1, tables: 10 } }),
      base({ id: planB, slug: "growth", name: "Growth", badge: "Most Popular", best_for: "Cafés with table service", price_monthly: 999, price_yearly: 9999, original_price: 1499, free_setup_text: "Free setup", cta_text: "Get started", highlight: true, active: true, status: "published", sort_order: 2, features: [{ group: "Service", text: "Tables + live status", included: true }], limits: { outlets: 1, users: 5, printers: 2, tables: 30 } }),
      base({ id: planC, slug: "pro", name: "Pro", best_for: "Busy restaurants", price_monthly: 1799, price_yearly: 17999, original_price: 2499, free_setup_text: "Free setup", cta_text: "Get started", highlight: false, active: true, status: "draft", sort_order: 3, features: [], limits: { outlets: 1, users: 10, printers: 4, tables: 60 } }),
    ],
    clients: [
      base({ id: c1, business_name: "Chai Tapri Café", owner_name: "Rohan Kulkarni", phone: "+91 98220 11111", whatsapp: "+91 98220 11111", email: "rohan@chaitapri.example", business_type: "cafe", city: "Pune", address: "FC Road, Pune", gst_number: null, logo_url: null, status: "active", tags: ["vip"], notes: "", assigned_to: null, source: "website", onboarding_stage: "Support", go_live_date: day(-40) }),
      base({ id: c2, business_name: "Spice Route Restaurant", owner_name: "Meera Shah", phone: "+91 98220 22222", whatsapp: "+91 98220 22222", email: "meera@spiceroute.example", business_type: "restaurant", city: "Pune", address: "Baner", status: "onboarding", tags: [], notes: "", source: "referral", onboarding_stage: "Training", go_live_date: day(6) }),
      base({ id: c3, business_name: "Sweet Crumbs Bakery", owner_name: "Anita Joshi", phone: "+91 98220 33333", email: null, business_type: "bakery", city: "Mumbai", status: "active", tags: [], source: "website", onboarding_stage: "Go-live", go_live_date: day(-100) }),
      base({ id: c4, business_name: "Nightowl Bar", owner_name: "Kabir Mehta", phone: "+91 98220 44444", business_type: "bar", city: "Pune", status: "lead", tags: [], source: "instagram", onboarding_stage: "Demo" }),
    ],
    subscriptions: [
      base({ client_id: c1, plan_id: planB, cycle: "monthly", list_price: 999, discount_type: "percent", discount_amount: 10, discount_reason: "Launch", free_period_months: 6, free_period_start: day(-40), free_period_end: day(140), total_amount: 5994, amount_paid: 0, amount_due: 5994, next_billing_date: day(140), renewal_reminder: true }),
      base({ client_id: c2, plan_id: planA, cycle: "monthly", list_price: 499, discount_type: "flat", discount_amount: 0, free_period_months: 6, free_period_start: day(-160), free_period_end: day(20), total_amount: 2994, amount_paid: 1000, amount_due: 1994, next_billing_date: day(20), renewal_reminder: true }),
      base({ client_id: c3, plan_id: planC, cycle: "yearly", list_price: 17999, discount_type: "percent", discount_amount: 0, free_period_months: 6, free_period_start: day(-190), free_period_end: day(-8), total_amount: 17999, amount_paid: 17999, amount_due: 0, next_billing_date: day(357), renewal_reminder: true }),
    ],
    devices: [
      base({ client_id: c1, device_type: "Tablet", brand_model: "Samsung Tab A9+", quantity: 2, provided_by: "us", status: "active" }),
      base({ client_id: c1, device_type: 'Thermal printer 3"', brand_model: "Epson TM-m30", quantity: 1, provided_by: "client", status: "active" }),
    ],
    repos: [
      base({ client_id: c1, github_url: "https://github.com/one-order1807/chai-tapri-pos", repo_name: "chai-tapri-pos", default_branch: "main", visibility: "private", last_commit_message: "fix: bill rounding", last_commit_at: ts(-3), ci_status: "passing", app_type: "expo" }),
    ],
    leads: [
      base({ name: "Sana Khan", business_name: "Brew & Beans", phone: "+91 98230 55555", city: "Pune", business_type: "cafe", status: "new", source: "website", message: "Need POS for 2 outlets", utm: {} }),
      base({ name: "Vikram Rao", business_name: "Tiffin Point", phone: "+91 98230 66666", city: "Nashik", business_type: "restaurant", status: "contacted", source: "website", utm: { utm_source: "instagram" } }),
      base({ name: "Neha Patil", business_name: "Cake Walk", phone: "+91 98230 77777", city: "Pune", business_type: "bakery", status: "demo_booked", source: "whatsapp", utm: {} }),
    ],
    support_requests: [
      base({ subject: "Printer not connecting", name: "Rohan", phone: "+91 98220 11111", status: "open", priority: "high", client_id: c1, replies: [] }),
    ],
    testimonials: [
      base({ customer_name: "Rohan Kulkarni", head_label: "Owner, Chai Tapri Café", business: "Chai Tapri Café", city: "Pune", rating: 5, short_text: "Orders never get mixed up now. The kitchen only sees new items!", status: "published", featured: true, sort_order: 0 }),
      base({ customer_name: "Meera Shah", head_label: "Owner, Spice Route", city: "Pune", rating: 5, short_text: "Setup was free and the team trained my staff in a day.", status: "pending", featured: false, sort_order: 1 }),
    ],
    features: [
      base({ title: "Cook Bill by round", summary: "Kitchen only sees what is new.", bullets: ["Prints only the new round", "Per-item notes"], icon: "ChefHat", plan_slugs: [], status: "published", sort_order: 0 }),
      base({ title: "Works offline", summary: "No internet needed.", bullets: ["On-device storage", "Auto-sync"], icon: "WifiOff", plan_slugs: [], status: "published", sort_order: 1 }),
    ],
    business_types: [base({ slug: "cafe", name: "Café", tagline: "Fast counter + table service", benefits: ["Quick adds"], flow_steps: ["Order", "Cook bill", "Pay"], status: "published", sort_order: 0 })],
    gallery_items: [],
    faqs: [base({ question: "Does it work offline?", answer: "Yes.", category: "General", status: "published", sort_order: 0 })],
    offers: [base({ title: "Free setup", popup_headline: "Click to get FREE SETUP for 6 months", perks: ["Menu upload", "Printer pairing"], badge: "Limited time", button_text: "Claim", link_target: "#contact", countdown: false, show_every_days: 3, audience: "all", bar_text: "FREE setup for 6 months", bar_color: "#2563EB", enabled: true, status: "published", sort_order: 0 })],
    coupons: [base({ code: "FREE6", kind: "percent", value: 100, usage_limit: 50, used_count: 3, expires_at: ts(30), active: true })],
    legal_pages: [base({ slug: "privacy", title: "Privacy Policy", body_md: "# Privacy\n\nDraft.", status: "draft" })],
    apps: [{ id: appPos, slug: "one-order-pos", name: "One-Order POS", description: "Tablet POS", created_at: ts(-90), updated_at: ts(-90) }],
    app_versions: [base({ app_id: appPos, version: "1.4.0", build_number: 140, platform: "android", channel: "stable", release_date: day(-10), release_notes: "Bill rounding fix", force_update: false, status: "released" })],
    site_settings: [
      { key: "contact", value: { whatsapp: "", email: "", phone: "", address: "Pune, Maharashtra", hours: "Mon–Sat 10:00–19:00" }, updated_at: ts(-1) },
      { key: "brand", value: { name: "One-Order", by: "Cloud Build Tech", trusted_count: 0, cities: ["Pune"] }, updated_at: ts(-1) },
      { key: "social", value: { instagram: "", linkedin: "", youtube: "" }, updated_at: ts(-1) },
    ],
    seo_pages: [{ id: id(), path: "/", title: "One-Order — Café POS", description: "Tablet-first café POS", in_sitemap: true, updated_at: ts(-1) }],
    audit_log: [],
    admin_users: [{ id: "00000000-0000-0000-0000-000000000001", email: "demo@one-order.local", full_name: "Demo Owner", role: "owner", active: true, must_change_password: false, created_at: ts(-100) }],
    activities: [], reminders: [], notifications: [], invoices: [], payments: [], backups: [], deployments: [], client_apps: [], onboarding_tasks: [], client_contacts: [], documents: [], backup_logs: [], site_sections: Object.values(fallback.sections).map((s, i) => base({ ...(s as Row), sort_order: i, status: "published", extra: (s as Row).extra ?? {} })), media_assets: [],
  };
}
