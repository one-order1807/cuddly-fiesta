import { notFound } from "next/navigation";
import ResourcePage from "@/components/admin/ResourcePage";
import SettingsEditor from "@/components/admin/SettingsEditor";
import { RESOURCES } from "@/lib/admin/resources";

const ALIAS: Record<string, string> = { pages: "sections", plans: "plans", gallery: "gallery" };

export default async function CmsResource({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (key === "settings") return <SettingsEditor />;
  const rk = ALIAS[key] ?? key;
  if (!RESOURCES[rk] || !RESOURCES[rk].cms && !["coupons"].includes(rk)) notFound();
  return <ResourcePage resourceKey={rk} crumbs={[{ label: "Website CMS", href: "/admin/cms" }, { label: RESOURCES[rk].title }]} />;
}
