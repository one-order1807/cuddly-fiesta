import { z } from "zod";
import { can, type Role } from "./roles";

/* Pure data + helpers: safe to import from both server actions and client components. */

export type FieldType =
  | "text" | "textarea" | "markdown" | "number" | "select" | "bool" | "date" | "datetime"
  | "json" | "tags" | "lines" | "featurelist" | "limits" | "image" | "color" | "ref" | "email" | "phone" | "url";

export type Option = { value: string; label: string };

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Option[];
  ref?: { table: string; label: string };
  help?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  half?: boolean; // render at half width in the form grid
  default?: unknown;
};

export type ColKind = "text" | "badge" | "bool" | "money" | "date" | "image" | "tags" | "rating" | "count";
export type Col = { name: string; label: string; kind?: ColKind; primary?: boolean };

export type Resource = {
  key: string;
  table: string;
  title: string;
  singular: string;
  description?: string;
  searchCols: string[];
  columns: Col[];
  fields: Field[];
  order: { col: string; asc?: boolean };
  soft: boolean;
  sortable?: boolean;
  cms?: boolean; // affects the public website → shows the Publish hint
  write: (r: Role) => boolean;
  statusFilter?: { col: string; options: Option[] };
  scopeCol?: string; // child tables: rows belong to a parent (e.g. client_id)
  detailHref?: string; // primary cell links to a detail page instead of opening the drawer
};

const opt = (...vals: string[]): Option[] => vals.map((v) => ({ value: v, label: v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) }));
const STATUS = opt("draft", "pending", "published", "archived");
const cmsTail: Field[] = [
  { name: "status", label: "Status", type: "select", options: STATUS, default: "draft", half: true },
  { name: "publish_at", label: "Schedule publish", type: "datetime", half: true, help: "Leave empty to publish immediately when status is Published." },
  { name: "sort_order", label: "Order", type: "number", half: true, default: 0, help: "Drag rows in the list to reorder." },
];
const writeBiz = can.writeBusiness;

export const RESOURCES: Record<string, Resource> = {
  plans: {
    key: "plans", table: "plans", title: "Packages & Pricing", singular: "package", cms: true, soft: true, sortable: true, write: writeBiz,
    description: "Plans shown in the website pricing section. Change a price here, then press Publish.",
    searchCols: ["name", "slug"], order: { col: "sort_order" },
    columns: [
      { name: "name", label: "Plan", primary: true }, { name: "badge", label: "Badge" },
      { name: "price_monthly", label: "Monthly", kind: "money" }, { name: "price_yearly", label: "Yearly", kind: "money" },
      { name: "highlight", label: "Highlight", kind: "bool" }, { name: "status", label: "Status", kind: "badge" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, half: true },
      { name: "slug", label: "Slug", type: "text", required: true, half: true, help: "lowercase-with-dashes, unique" },
      { name: "badge", label: "Badge label", type: "text", half: true, placeholder: "Most Popular" },
      { name: "best_for", label: "“Best for” line", type: "text", half: true },
      { name: "price_monthly", label: "Price / month (₹)", type: "number", required: true, half: true, min: 0 },
      { name: "price_yearly", label: "Price / year (₹)", type: "number", required: true, half: true, min: 0 },
      { name: "original_price", label: "Original (strike-through) price", type: "number", half: true, min: 0 },
      { name: "price_label", label: "Price label text", type: "text", half: true },
      { name: "free_setup_text", label: "Free-setup ribbon", type: "text", half: true, placeholder: "Free setup" },
      { name: "cta_text", label: "Button text", type: "text", half: true, default: "Get started" },
      { name: "icon_url", label: "Thumbnail / icon", type: "image" },
      { name: "features", label: "Feature list", type: "featurelist" },
      { name: "limits", label: "Limits", type: "limits", help: "e.g. outlets, users, printers, tables" },
      { name: "highlight", label: "Highlight this plan", type: "bool", half: true },
      { name: "active", label: "Active", type: "bool", half: true, default: true },
      ...cmsTail,
    ],
  },
  clients: {
    key: "clients", table: "clients", title: "Clients", singular: "client", soft: true, write: writeBiz, detailHref: "/admin/clients/",
    description: "Everyone who uses One-Order — plus leads you are onboarding.",
    searchCols: ["business_name", "owner_name", "phone", "email", "city"], order: { col: "created_at", asc: false },
    statusFilter: { col: "status", options: opt("lead", "onboarding", "active", "paused", "churned") },
    columns: [{ name: "logo_url", label: " ", kind: "image" }, { name: "business_name", label: "Business", primary: true }, { name: "owner_name", label: "Owner" }, { name: "phone", label: "Phone" }, { name: "city", label: "City" }, { name: "business_type", label: "Type", kind: "badge" }, { name: "onboarding_stage", label: "Stage", kind: "badge" }, { name: "status", label: "Status", kind: "badge" }],
    fields: [
      { name: "logo_url", label: "Logo / photo", type: "image" },
      { name: "business_name", label: "Business name", type: "text", required: true, half: true },
      { name: "owner_name", label: "Owner name", type: "text", half: true },
      { name: "phone", label: "Phone", type: "phone", half: true },
      { name: "whatsapp", label: "WhatsApp", type: "phone", half: true },
      { name: "email", label: "Email", type: "email", half: true },
      { name: "business_type", label: "Business type", type: "select", options: opt("cafe", "restaurant", "hotel", "bakery", "bar", "other"), half: true, default: "cafe" },
      { name: "city", label: "City", type: "text", half: true },
      { name: "gst_number", label: "GST number (optional)", type: "text", half: true },
      { name: "address", label: "Address", type: "textarea" },
      { name: "status", label: "Status", type: "select", options: opt("lead", "onboarding", "active", "paused", "churned"), half: true, default: "onboarding" },
      { name: "source", label: "Source", type: "text", half: true, placeholder: "website / referral / instagram" },
      { name: "assigned_to", label: "Assigned to", type: "ref", ref: { table: "admin_users", label: "full_name" }, half: true },
      { name: "go_live_date", label: "Go-live date", type: "date", half: true },
      { name: "tags", label: "Tags", type: "tags" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  devices: {
    key: "devices", table: "devices", title: "Devices", singular: "device", soft: true, write: writeBiz, scopeCol: "client_id",
    searchCols: ["device_type", "brand_model", "serial"], order: { col: "created_at" },
    columns: [{ name: "device_type", label: "Type", primary: true }, { name: "brand_model", label: "Brand / model" }, { name: "quantity", label: "Qty", kind: "count" }, { name: "provided_by", label: "Provided by", kind: "badge" }, { name: "status", label: "Status", kind: "badge" }],
    fields: [
      { name: "device_type", label: "Device type", type: "select", required: true, options: ["Android phone", "Tablet", "Desktop/PC", "Kitchen display", 'Thermal printer 2"', 'Thermal printer 3"', "Barcode scanner", "Cash drawer", "Other"].map((v) => ({ value: v, label: v })), half: true },
      { name: "quantity", label: "Quantity", type: "number", required: true, min: 1, default: 1, half: true },
      { name: "brand_model", label: "Brand / model", type: "text", half: true },
      { name: "serial", label: "Serial / IMEI", type: "text", half: true },
      { name: "purchased_from", label: "Purchased from", type: "text", half: true },
      { name: "provided_by", label: "Provided by", type: "select", options: opt("client", "us"), half: true, default: "client" },
      { name: "install_date", label: "Install date", type: "date", half: true },
      { name: "status", label: "Status", type: "select", options: opt("active", "faulty", "returned", "spare"), half: true, default: "active" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  repos: {
    key: "repos", table: "repos", title: "Projects & Repos", singular: "repo", soft: true, write: writeBiz, scopeCol: "client_id",
    description: "GitHub repos for every client project. Paste a URL; the name is filled in for you.",
    searchCols: ["repo_name", "github_url", "tech_stack"], order: { col: "created_at", asc: false },
    columns: [{ name: "repo_name", label: "Repo", primary: true }, { name: "github_url", label: "URL" }, { name: "default_branch", label: "Branch" }, { name: "app_type", label: "Type", kind: "badge" }, { name: "last_commit_at", label: "Last commit", kind: "date" }, { name: "ci_status", label: "CI", kind: "badge" }],
    fields: [
      { name: "github_url", label: "GitHub repo URL", type: "url", required: true },
      { name: "repo_name", label: "Repo name", type: "text", half: true },
      { name: "default_branch", label: "Default branch", type: "text", half: true, default: "main" },
      { name: "visibility", label: "Visibility", type: "select", options: opt("private", "public"), half: true },
      { name: "app_type", label: "App type", type: "select", options: opt("expo", "web", "backend", "other"), half: true },
      { name: "tech_stack", label: "Tech stack", type: "text", half: true },
      { name: "ci_status", label: "CI status", type: "select", options: opt("passing", "failing", "unknown"), half: true },
      { name: "last_commit_message", label: "Last commit message", type: "text" },
      { name: "last_commit_at", label: "Last commit time", type: "datetime", half: true },
      { name: "issue_tracker_url", label: "Issue tracker", type: "url", half: true },
      { name: "readme_url", label: "README link", type: "url", half: true },
    ],
  },
  deployments: {
    key: "deployments", table: "deployments", title: "Backend & Deployment", singular: "deployment", soft: false, write: writeBiz, scopeCol: "client_id",
    searchCols: ["deploy_url", "domain", "hosting_provider"], order: { col: "created_at" },
    columns: [{ name: "environment", label: "Env", kind: "badge", primary: true }, { name: "backend_type", label: "Backend" }, { name: "deploy_url", label: "URL" }, { name: "domain", label: "Domain" }, { name: "ssl_expires_on", label: "SSL expires", kind: "date" }],
    fields: [
      { name: "environment", label: "Environment", type: "select", options: opt("prod", "staging"), half: true, default: "prod" },
      { name: "backend_type", label: "Backend", type: "select", options: opt("Supabase", "Firebase", "Custom"), half: true },
      { name: "deploy_url", label: "Deploy URL", type: "url", half: true },
      { name: "hosting_provider", label: "Hosting provider", type: "text", half: true },
      { name: "project_ref", label: "Project ref / id", type: "text", half: true },
      { name: "region", label: "Region", type: "text", half: true },
      { name: "db_host", label: "DB host", type: "text", half: true },
      { name: "storage_bucket", label: "Storage bucket", type: "text", half: true },
      { name: "domain", label: "Domain / subdomain", type: "text", half: true },
      { name: "ssl_expires_on", label: "SSL expiry", type: "date", half: true },
      { name: "server_provider", label: "Server / provider", type: "text", half: true },
      { name: "monitoring_url", label: "Monitoring link", type: "url", half: true },
    ],
  },
  backups: {
    key: "backups", table: "backups", title: "Backups", singular: "backup plan", soft: false, write: writeBiz, scopeCol: "client_id",
    description: "Backup schedule per client. Backup scripts can report in through the webhook endpoint (Stage 3).",
    searchCols: ["location", "frequency"], order: { col: "created_at" },
    columns: [{ name: "frequency", label: "Frequency", primary: true }, { name: "location", label: "Location" }, { name: "last_backup_at", label: "Last backup", kind: "date" }, { name: "next_backup_at", label: "Next", kind: "date" }, { name: "status", label: "Status", kind: "badge" }],
    fields: [
      { name: "frequency", label: "Frequency", type: "select", options: opt("hourly", "daily", "weekly", "monthly"), half: true, default: "daily" },
      { name: "status", label: "Status", type: "select", options: opt("ok", "overdue", "failed", "unknown"), half: true, default: "unknown" },
      { name: "last_backup_at", label: "Last backup", type: "datetime", half: true },
      { name: "next_backup_at", label: "Next backup", type: "datetime", half: true },
      { name: "location", label: "Location (bucket / drive path)", type: "text" },
      { name: "retention_days", label: "Retention (days)", type: "number", half: true, default: 30, min: 1 },
      { name: "size_mb", label: "Size (MB)", type: "number", half: true, min: 0 },
      { name: "restore_tested_on", label: "Restore last tested", type: "date", half: true },
    ],
  },
  client_apps: {
    key: "client_apps", table: "client_apps", title: "App & Version", singular: "installation", soft: false, write: writeBiz, scopeCol: "client_id",
    searchCols: ["installed_version"], order: { col: "created_at" },
    columns: [{ name: "platform", label: "Platform", kind: "badge", primary: true }, { name: "installed_version", label: "Installed" }, { name: "update_method", label: "Update via", kind: "badge" }, { name: "last_updated_at", label: "Updated", kind: "date" }],
    fields: [
      { name: "app_id", label: "Product", type: "ref", ref: { table: "apps", label: "name" }, required: true },
      { name: "platform", label: "Platform", type: "select", options: opt("android", "ios", "web", "windows"), half: true, default: "android" },
      { name: "installed_version", label: "Installed version", type: "text", half: true },
      { name: "update_method", label: "Update method", type: "select", options: [{ value: "play_store", label: "Play Store" }, { value: "apk", label: "APK" }, { value: "ota", label: "OTA" }], half: true, default: "apk" },
      { name: "last_updated_at", label: "Last updated", type: "datetime", half: true },
    ],
  },
  onboarding_tasks: {
    key: "onboarding_tasks", table: "onboarding_tasks", title: "Checklist", singular: "task", soft: false, sortable: true, write: writeBiz, scopeCol: "client_id",
    searchCols: ["title"], order: { col: "sort_order" },
    columns: [{ name: "title", label: "Task", primary: true }, { name: "due_date", label: "Due", kind: "date" }, { name: "done", label: "Done", kind: "bool" }],
    fields: [
      { name: "title", label: "Task", type: "text", required: true },
      { name: "owner_id", label: "Owner", type: "ref", ref: { table: "admin_users", label: "full_name" }, half: true },
      { name: "due_date", label: "Due date", type: "date", half: true },
      { name: "done", label: "Done", type: "bool", half: true },
      { name: "sort_order", label: "Order", type: "number", half: true, default: 0 },
    ],
  },
  invoices: {
    key: "invoices", table: "invoices", title: "Invoices", singular: "invoice", soft: true, write: can.writeBilling, scopeCol: "client_id",
    searchCols: ["number", "notes"], order: { col: "created_at", asc: false },
    statusFilter: { col: "status", options: opt("draft", "sent", "paid", "overdue", "void") },
    columns: [{ name: "number", label: "Invoice", primary: true }, { name: "issue_date", label: "Date", kind: "date" }, { name: "due_date", label: "Due", kind: "date" }, { name: "total", label: "Total", kind: "money" }, { name: "status", label: "Status", kind: "badge" }],
    fields: [
      { name: "issue_date", label: "Invoice date", type: "date", half: true },
      { name: "due_date", label: "Due date", type: "date", half: true },
      { name: "subtotal", label: "Subtotal (₹)", type: "number", half: true, min: 0, default: 0 },
      { name: "discount", label: "Discount (₹)", type: "number", half: true, min: 0, default: 0 },
      { name: "gst_enabled", label: "Add GST", type: "bool", half: true },
      { name: "gst_percent", label: "GST %", type: "number", half: true, default: 18, min: 0, max: 100 },
      { name: "total", label: "Total (₹)", type: "number", required: true, half: true, min: 0, help: "Subtotal − discount + GST" },
      { name: "status", label: "Status", type: "select", options: opt("draft", "sent", "paid", "overdue", "void"), half: true, default: "draft" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  payments: {
    key: "payments", table: "payments", title: "Payments", singular: "payment", soft: false, write: can.writeBilling, scopeCol: "client_id",
    searchCols: ["reference"], order: { col: "paid_on", asc: false },
    columns: [{ name: "paid_on", label: "Date", kind: "date", primary: true }, { name: "mode", label: "Mode", kind: "badge" }, { name: "reference", label: "Reference" }, { name: "amount", label: "Amount", kind: "money" }],
    fields: [
      { name: "paid_on", label: "Paid on", type: "date", required: true, half: true },
      { name: "amount", label: "Amount (₹)", type: "number", required: true, min: 1, half: true },
      { name: "mode", label: "Mode", type: "select", options: opt("upi", "bank", "cash", "cheque", "card"), half: true, default: "upi" },
      { name: "reference", label: "Reference / UTR", type: "text", half: true },
    ],
  },
  sections: {
    key: "sections", table: "site_sections", title: "Pages & Sections", singular: "section", cms: true, soft: true, sortable: true, write: writeBiz,
    description: "Each block of the home page: heading, sub-heading, label, button and image. Turn a section off to hide it.",
    searchCols: ["slug", "heading"], order: { col: "sort_order" },
    columns: [{ name: "slug", label: "Section", primary: true }, { name: "heading", label: "Heading" }, { name: "enabled", label: "Visible", kind: "bool" }, { name: "status", label: "Status", kind: "badge" }],
    fields: [
      { name: "slug", label: "Section id", type: "select", options: opt("hero", "story", "features", "gallery", "pricing", "reviews", "faq", "cta"), required: true, half: true },
      { name: "enabled", label: "Visible on site", type: "bool", half: true, default: true },
      { name: "eyebrow", label: "Label (small text above)", type: "text", half: true },
      { name: "heading", label: "Heading", type: "text", half: true },
      { name: "subheading", label: "Sub-heading", type: "textarea" },
      { name: "body", label: "Body", type: "markdown" },
      { name: "cta_text", label: "Button text", type: "text", half: true },
      { name: "cta_link", label: "Button link", type: "text", half: true, placeholder: "#contact" },
      { name: "image_url", label: "Background image / thumbnail", type: "image" },
      { name: "extra", label: "Extra data (JSON)", type: "json", help: 'Story captions: {"beats":["Step 1","Step 2","Step 3","Step 4"]}' },
      ...cmsTail,
    ],
  },
  seo: {
    key: "seo", table: "seo_pages", title: "SEO", singular: "page", cms: true, soft: false, write: writeBiz,
    searchCols: ["path", "title"], order: { col: "path" },
    columns: [{ name: "path", label: "Path", primary: true }, { name: "title", label: "Title" }, { name: "in_sitemap", label: "In sitemap", kind: "bool" }],
    fields: [
      { name: "path", label: "Page path", type: "text", required: true, half: true, placeholder: "/" },
      { name: "in_sitemap", label: "Include in sitemap", type: "bool", half: true, default: true },
      { name: "title", label: "SEO title", type: "text", max: 70, help: "Aim for under 60 characters" },
      { name: "description", label: "Meta description", type: "textarea", max: 200, help: "Aim for 120–160 characters" },
      { name: "og_image_url", label: "Social share image (OG)", type: "image" },
      { name: "structured_data", label: "Structured data (JSON-LD)", type: "json" },
    ],
  },
  features: {
    key: "features", table: "features", title: "Features", singular: "feature", cms: true, soft: true, sortable: true, write: writeBiz,
    searchCols: ["title", "summary"], order: { col: "sort_order" },
    columns: [{ name: "title", label: "Title", primary: true }, { name: "summary", label: "Summary" }, { name: "status", label: "Status", kind: "badge" }],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "summary", label: "Short summary", type: "textarea" },
      { name: "bullets", label: "Popup bullets", type: "lines", help: "One per line" },
      { name: "icon", label: "Icon", type: "select", options: opt("ChefHat", "Receipt", "WifiOff", "LayoutGrid", "Printer", "BarChart3", "Users", "QrCode", "Smartphone", "Zap", "ShieldCheck", "Clock"), half: true },
      { name: "plan_slugs", label: "Plans it belongs to", type: "tags", half: true, help: "Plan slugs, comma separated" },
      { name: "image_url", label: "Image / thumbnail", type: "image" },
      ...cmsTail,
    ],
  },
  business_types: {
    key: "business_types", table: "business_types", title: "Business Types", singular: "business type", cms: true, soft: true, sortable: true, write: writeBiz,
    searchCols: ["name", "slug"], order: { col: "sort_order" },
    columns: [{ name: "name", label: "Name", primary: true }, { name: "tagline", label: "Tagline" }, { name: "status", label: "Status", kind: "badge" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, half: true },
      { name: "slug", label: "Slug", type: "text", required: true, half: true },
      { name: "tagline", label: "Tagline", type: "text" },
      { name: "benefits", label: "Benefits", type: "lines", help: "One per line" },
      { name: "flow_steps", label: "Mini-flow steps", type: "lines", help: "One per line, e.g. Order → Cook bill → Pay" },
      { name: "hero_image_url", label: "Hero image", type: "image" },
      ...cmsTail,
    ],
  },
  gallery: {
    key: "gallery", table: "gallery_items", title: "Gallery & Screens", singular: "screen", cms: true, soft: true, sortable: true, write: writeBiz,
    searchCols: ["title", "label", "caption"], order: { col: "sort_order" },
    columns: [{ name: "thumb_url", label: " ", kind: "image" }, { name: "title", label: "Title", primary: true }, { name: "category", label: "Category", kind: "badge" }, { name: "device_frame", label: "Frame" }, { name: "status", label: "Status", kind: "badge" }],
    fields: [
      { name: "image_url", label: "Photo / POS screen", type: "image", required: true },
      { name: "thumb_url", label: "Thumbnail (optional crop)", type: "image" },
      { name: "title", label: "Title", type: "text", required: true, half: true },
      { name: "label", label: "Label / heading", type: "text", half: true },
      { name: "caption", label: "Caption", type: "textarea" },
      { name: "alt_text", label: "Alt text", type: "text", help: "Describe the image for accessibility & SEO" },
      { name: "category", label: "Category", type: "select", options: opt("Ordering", "Tables", "Kitchen", "Billing", "Dashboard", "Menu"), half: true, default: "Ordering" },
      { name: "device_frame", label: "Device frame", type: "select", options: opt("phone", "tablet", "desktop"), half: true, default: "tablet" },
      ...cmsTail,
    ],
  },
  testimonials: {
    key: "testimonials", table: "testimonials", title: "Customer Reviews", singular: "review", cms: true, soft: true, sortable: true, write: writeBiz,
    description: "Only reviews with status “Published” appear on the website. Public submissions arrive as “Pending”.",
    searchCols: ["customer_name", "business", "short_text"], order: { col: "sort_order" },
    columns: [{ name: "customer_name", label: "Customer", primary: true }, { name: "head_label", label: "Label" }, { name: "rating", label: "Rating", kind: "rating" }, { name: "featured", label: "Featured", kind: "bool" }, { name: "status", label: "Status", kind: "badge" }],
    statusFilter: { col: "status", options: STATUS },
    fields: [
      { name: "customer_name", label: "Customer name", type: "text", required: true, half: true },
      { name: "head_label", label: "Head label", type: "text", half: true, placeholder: "Owner, Cafe Name" },
      { name: "business", label: "Business", type: "text", half: true },
      { name: "city", label: "City", type: "text", half: true },
      { name: "rating", label: "Rating (1–5)", type: "number", half: true, default: 5, min: 1, max: 5, required: true },
      { name: "reviewed_on", label: "Review date", type: "date", half: true },
      { name: "short_text", label: "Review (short)", type: "textarea", max: 600 },
      { name: "full_text", label: "Review (full)", type: "textarea" },
      { name: "customer_photo_url", label: "Customer photo", type: "image" },
      { name: "business_thumb_url", label: "Business thumbnail", type: "image" },
      { name: "source", label: "Source", type: "text", half: true, placeholder: "WhatsApp / Google" },
      { name: "featured", label: "Featured", type: "bool", half: true },
      ...cmsTail,
    ],
  },
  faqs: {
    key: "faqs", table: "faqs", title: "FAQ", singular: "question", cms: true, soft: true, sortable: true, write: writeBiz,
    searchCols: ["question", "answer"], order: { col: "sort_order" },
    columns: [{ name: "question", label: "Question", primary: true }, { name: "category", label: "Category" }, { name: "status", label: "Status", kind: "badge" }],
    fields: [
      { name: "question", label: "Question", type: "text", required: true },
      { name: "answer", label: "Answer", type: "markdown", required: true },
      { name: "category", label: "Category", type: "text", half: true },
      ...cmsTail,
    ],
  },
  offers: {
    key: "offers", table: "offers", title: "Offers & Popup", singular: "offer", cms: true, soft: true, sortable: true, write: writeBiz,
    description: "The top bar and the popup shown to visitors. Only one live offer is shown at a time (lowest order).",
    searchCols: ["title", "popup_headline"], order: { col: "sort_order" },
    columns: [{ name: "title", label: "Offer", primary: true }, { name: "badge", label: "Badge" }, { name: "ends_at", label: "Ends", kind: "date" }, { name: "enabled", label: "On", kind: "bool" }, { name: "status", label: "Status", kind: "badge" }],
    fields: [
      { name: "title", label: "Internal title", type: "text", required: true },
      { name: "popup_headline", label: "Popup headline", type: "text", placeholder: "Click to get FREE SETUP for 6 months" },
      { name: "perks", label: "Perks", type: "lines", help: "One per line" },
      { name: "badge", label: "Badge", type: "text", half: true },
      { name: "button_text", label: "Button text", type: "text", half: true },
      { name: "link_target", label: "Button link", type: "text", half: true, placeholder: "#contact" },
      { name: "audience", label: "Audience", type: "select", options: opt("all", "new"), half: true, default: "all" },
      { name: "starts_at", label: "Starts", type: "datetime", half: true },
      { name: "ends_at", label: "Ends", type: "datetime", half: true },
      { name: "countdown", label: "Show countdown", type: "bool", half: true },
      { name: "show_every_days", label: "Show once every (days)", type: "number", half: true, default: 3, min: 1 },
      { name: "bar_text", label: "Top offer-bar text", type: "text" },
      { name: "bar_color", label: "Bar colour", type: "color", half: true, default: "#2563EB" },
      { name: "exit_intent_text", label: "Exit-intent text", type: "text", half: true },
      { name: "enabled", label: "Enabled", type: "bool", default: true },
      { name: "status", label: "Status", type: "select", options: STATUS, default: "draft", half: true },
      { name: "sort_order", label: "Order", type: "number", half: true, default: 0 },
    ],
  },
  coupons: {
    key: "coupons", table: "coupons", title: "Coupon Codes", singular: "coupon", soft: false, write: writeBiz,
    searchCols: ["code"], order: { col: "created_at", asc: false },
    columns: [{ name: "code", label: "Code", primary: true }, { name: "kind", label: "Type", kind: "badge" }, { name: "value", label: "Value" }, { name: "used_count", label: "Used", kind: "count" }, { name: "expires_at", label: "Expires", kind: "date" }, { name: "active", label: "Active", kind: "bool" }],
    fields: [
      { name: "code", label: "Code", type: "text", required: true, half: true },
      { name: "kind", label: "Type", type: "select", options: opt("percent", "flat"), half: true, default: "percent" },
      { name: "value", label: "Value", type: "number", required: true, half: true, min: 0 },
      { name: "usage_limit", label: "Usage limit", type: "number", half: true, min: 1 },
      { name: "expires_at", label: "Expires", type: "datetime", half: true },
      { name: "active", label: "Active", type: "bool", half: true, default: true },
    ],
  },
  legal: {
    key: "legal", table: "legal_pages", title: "Legal Pages", singular: "page", cms: true, soft: false, write: writeBiz,
    searchCols: ["title", "slug"], order: { col: "slug" },
    columns: [{ name: "title", label: "Page", primary: true }, { name: "slug", label: "Slug" }, { name: "updated_at", label: "Updated", kind: "date" }, { name: "status", label: "Status", kind: "badge" }],
    fields: [
      { name: "slug", label: "Slug", type: "select", options: opt("privacy", "terms", "refund", "cookies", "security", "sla", "offer-terms"), required: true, half: true },
      { name: "title", label: "Title", type: "text", required: true, half: true },
      { name: "body_md", label: "Content (Markdown)", type: "markdown" },
      { name: "status", label: "Status", type: "select", options: STATUS, default: "draft", half: true },
      { name: "publish_at", label: "Schedule publish", type: "datetime", half: true },
    ],
  },
  apps: {
    key: "apps", table: "apps", title: "Products", singular: "product", soft: false, write: writeBiz,
    searchCols: ["name", "slug"], order: { col: "name" },
    columns: [{ name: "name", label: "Product", primary: true }, { name: "slug", label: "Slug" }, { name: "description", label: "Description" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, half: true },
      { name: "slug", label: "Slug", type: "text", required: true, half: true },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  app_versions: {
    key: "app_versions", table: "app_versions", title: "Releases", singular: "release", soft: false, write: writeBiz,
    searchCols: ["version", "release_notes"], order: { col: "created_at", asc: false },
    columns: [{ name: "version", label: "Version", primary: true }, { name: "platform", label: "Platform", kind: "badge" }, { name: "channel", label: "Channel", kind: "badge" }, { name: "release_date", label: "Released", kind: "date" }, { name: "force_update", label: "Force", kind: "bool" }, { name: "status", label: "Status", kind: "badge" }],
    fields: [
      { name: "app_id", label: "Product", type: "ref", ref: { table: "apps", label: "name" }, required: true },
      { name: "version", label: "Version (semver)", type: "text", required: true, half: true, placeholder: "1.4.0" },
      { name: "build_number", label: "Build number", type: "number", half: true },
      { name: "platform", label: "Platform", type: "select", options: opt("android", "ios", "web", "windows"), half: true, default: "android" },
      { name: "channel", label: "Channel", type: "select", options: opt("stable", "beta"), half: true, default: "stable" },
      { name: "release_date", label: "Release date", type: "date", half: true },
      { name: "min_supported_version", label: "Min supported version", type: "text", half: true },
      { name: "release_notes", label: "Release notes", type: "markdown" },
      { name: "download_url", label: "Download / APK URL", type: "url", half: true },
      { name: "store_url", label: "Store link", type: "url", half: true },
      { name: "force_update", label: "Force update", type: "bool", half: true },
      { name: "status", label: "Status", type: "select", options: opt("draft", "released", "withdrawn"), half: true, default: "draft" },
    ],
  },
  leads: {
    key: "leads", table: "leads", title: "Leads", singular: "lead", soft: true, write: writeBiz,
    searchCols: ["name", "business_name", "phone", "email", "city"], order: { col: "created_at", asc: false },
    statusFilter: { col: "status", options: opt("new", "contacted", "demo_booked", "proposal", "won", "lost") },
    columns: [{ name: "name", label: "Name", primary: true }, { name: "business_name", label: "Business" }, { name: "phone", label: "Phone" }, { name: "city", label: "City" }, { name: "source", label: "Source", kind: "badge" }, { name: "status", label: "Stage", kind: "badge" }, { name: "created_at", label: "Received", kind: "date" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, half: true },
      { name: "business_name", label: "Business", type: "text", half: true },
      { name: "phone", label: "Phone", type: "phone", required: true, half: true },
      { name: "email", label: "Email", type: "email", half: true },
      { name: "city", label: "City", type: "text", half: true },
      { name: "business_type", label: "Business type", type: "select", options: opt("cafe", "restaurant", "hotel", "bakery", "bar", "other"), half: true },
      { name: "status", label: "Stage", type: "select", options: opt("new", "contacted", "demo_booked", "proposal", "won", "lost"), half: true, default: "new" },
      { name: "follow_up_at", label: "Follow-up", type: "datetime", half: true },
      { name: "plan_interest", label: "Plan interest", type: "text", half: true },
      { name: "source", label: "Source", type: "text", half: true },
      { name: "message", label: "Message", type: "textarea" },
      { name: "notes", label: "Internal notes", type: "textarea" },
    ],
  },
  support: {
    key: "support", table: "support_requests", title: "Support Requests", singular: "request", soft: true, write: can.writeSupport,
    searchCols: ["subject", "name", "phone"], order: { col: "created_at", asc: false },
    statusFilter: { col: "status", options: opt("open", "in_progress", "waiting", "resolved", "closed") },
    columns: [{ name: "subject", label: "Subject", primary: true }, { name: "name", label: "From" }, { name: "priority", label: "Priority", kind: "badge" }, { name: "status", label: "Status", kind: "badge" }, { name: "created_at", label: "Opened", kind: "date" }],
    fields: [
      { name: "subject", label: "Subject", type: "text", required: true },
      { name: "name", label: "From", type: "text", half: true },
      { name: "phone", label: "Phone", type: "phone", half: true },
      { name: "email", label: "Email", type: "email", half: true },
      { name: "client_id", label: "Client", type: "ref", ref: { table: "clients", label: "business_name" }, half: true },
      { name: "priority", label: "Priority", type: "select", options: opt("low", "normal", "high", "urgent"), half: true, default: "normal" },
      { name: "status", label: "Status", type: "select", options: opt("open", "in_progress", "waiting", "resolved", "closed"), half: true, default: "open" },
      { name: "message", label: "Message", type: "textarea" },
    ],
  },
};

/* ---------- validation ---------- */
const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

function fieldSchema(f: Field): z.ZodType {
  let s: z.ZodType;
  switch (f.type) {
    case "number": {
      let n = z.coerce.number();
      if (f.min !== undefined) n = n.min(f.min);
      if (f.max !== undefined) n = n.max(f.max);
      s = f.required ? n : z.preprocess(emptyToNull, n.nullable());
      return s;
    }
    case "bool": return z.coerce.boolean();
    case "json": return z.record(z.string(), z.unknown()).default({});
    case "tags": case "lines": return z.array(z.string().trim().max(300)).max(100).default([]);
    case "featurelist": return z.array(z.object({ group: z.string().max(80).optional().nullable(), text: z.string().trim().min(1).max(200), included: z.boolean() })).max(100).default([]);
    case "limits": return z.record(z.string().max(40), z.coerce.number()).default({});
    case "select": s = z.string().max(100); break;
    case "email": s = z.string().trim().email().max(200); break;
    case "url": case "image": s = z.string().trim().max(2000).refine((v) => v === "" || /^(https?:\/\/|\/|data:image\/)/.test(v), "Must be a URL"); break;
    case "markdown": case "textarea": s = z.string().max(f.max ?? 20000); break;
    case "color": s = z.string().regex(/^#[0-9a-fA-F]{6}$/); break;
    default: s = z.string().trim().max(f.max ?? 500);
  }
  return f.required ? (s as z.ZodString).min(1, `${f.label} is required`) : z.preprocess(emptyToNull, (s as z.ZodString).nullable());
}

/** Whitelist schema: only fields declared in the config are accepted (no mass-assignment). */
export function buildSchema(r: Resource) {
  const shape: Record<string, z.ZodType> = {};
  for (const f of r.fields) shape[f.name] = fieldSchema(f).optional();
  if (r.scopeCol) shape[r.scopeCol] = z.string().uuid().optional();
  return z.object(shape).strict();
}

export function defaults(r: Resource): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of r.fields) {
    out[f.name] = f.default !== undefined ? f.default : f.type === "bool" ? false : f.type === "tags" || f.type === "lines" || f.type === "featurelist" ? [] : f.type === "limits" ? {} : "";
  }
  return out;
}

export const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
