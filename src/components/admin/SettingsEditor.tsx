import { getAdmin } from "@/lib/admin/session";
import { getDb } from "@/lib/admin/db";
import { can } from "@/lib/admin/roles";
import type { Field } from "@/lib/admin/resources";
import { PageHeader } from "./ui";
import PublishButton from "./PublishButton";
import SettingsForm from "./SettingsForm";

export const SETTING_GROUPS: { key: string; title: string; fields: Field[] }[] = [
  { key: "contact", title: "Contact & office", fields: [
    { name: "whatsapp", label: "WhatsApp number", type: "phone", half: true, placeholder: "+91…" },
    { name: "phone", label: "Phone", type: "phone", half: true },
    { name: "email", label: "Support email", type: "email", half: true },
    { name: "hours", label: "Office / support hours", type: "text", half: true },
    { name: "address", label: "Address (Pune)", type: "textarea" },
    { name: "lat", label: "Latitude", type: "number", half: true },
    { name: "lng", label: "Longitude", type: "number", half: true },
  ] },
  { key: "brand", title: "Brand & logos", fields: [
    { name: "name", label: "Brand name", type: "text", half: true },
    { name: "by", label: "Co-brand (by)", type: "text", half: true },
    { name: "trusted_count", label: "Trusted-by count", type: "number", half: true, min: 0, help: "Shown on the site only when > 0" },
    { name: "cities", label: "Cities served", type: "tags", half: true },
    { name: "logo_url", label: "One-Order logo", type: "image" },
    { name: "by_logo_url", label: "Cloud Build Tech logo", type: "image" },
    { name: "favicon_url", label: "Favicon", type: "image" },
    { name: "og_image_url", label: "Default social share image", type: "image" },
    { name: "accent", label: "Accent colour", type: "color", half: true },
  ] },
  { key: "social", title: "Social links", fields: [
    { name: "instagram", label: "Instagram", type: "url", half: true }, { name: "linkedin", label: "LinkedIn", type: "url", half: true }, { name: "youtube", label: "YouTube", type: "url", half: true },
  ] },
  { key: "announcement", title: "Announcement & cookies", fields: [
    { name: "text", label: "Announcement bar text", type: "text" },
    { name: "cookie_text", label: "Cookie banner text", type: "textarea" },
  ] },
  { key: "analytics", title: "Analytics", fields: [
    { name: "ga_id", label: "Google Analytics ID", type: "text", half: true, placeholder: "G-XXXXXXX" }, { name: "pixel_id", label: "Meta Pixel ID", type: "text", half: true },
  ] },
];

export default async function SettingsEditor() {
  const admin = await getAdmin();
  const { rows } = await (await getDb()).list("site_settings");
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value ?? {}]));
  const canWrite = !!admin && can.writeBusiness(admin.role);
  return (
    <>
      <PageHeader title="Site Settings" description="Contact details, logos, social links and analytics used across the website."
        crumbs={[{ label: "Website CMS", href: "/admin/cms" }, { label: "Site Settings" }]} actions={admin && can.publish(admin.role) ? <PublishButton /> : undefined} />
      <div className="grid gap-6">
        {SETTING_GROUPS.map((g) => <SettingsForm key={g.key} group={g} initial={byKey[g.key] ?? {}} canWrite={canWrite} />)}
      </div>
    </>
  );
}
