import {
  LayoutDashboard, Users, GitBranch, Rocket, DatabaseBackup, Receipt, Target, LifeBuoy, Globe, ImageIcon, BellRing,
  BarChart3, ShieldCheck, ScrollText, Settings, type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/admin/roles";

export type NavItem = { href: string; label: string; icon: LucideIcon; roles?: Role[]; children?: { href: string; label: string }[] };

export const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/repos", label: "Projects & Repos", icon: GitBranch },
  { href: "/admin/versions", label: "App Versions", icon: Rocket },
  { href: "/admin/backups", label: "Backups", icon: DatabaseBackup },
  { href: "/admin/billing", label: "Billing", icon: Receipt, roles: ["owner", "manager"] },
  { href: "/admin/leads", label: "Leads", icon: Target },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  {
    href: "/admin/cms", label: "Website CMS", icon: Globe,
    children: [
      { href: "/admin/cms/pages", label: "Pages & Sections" },
      { href: "/admin/cms/plans", label: "Packages & Pricing" },
      { href: "/admin/cms/features", label: "Features" },
      { href: "/admin/cms/business_types", label: "Business Types" },
      { href: "/admin/cms/gallery", label: "Gallery & Screens" },
      { href: "/admin/cms/testimonials", label: "Reviews" },
      { href: "/admin/cms/faqs", label: "FAQ" },
      { href: "/admin/cms/offers", label: "Offers & Popup" },
      { href: "/admin/cms/coupons", label: "Coupons" },
      { href: "/admin/cms/legal", label: "Legal Pages" },
      { href: "/admin/cms/settings", label: "Site Settings" },
      { href: "/admin/cms/seo", label: "SEO" },
    ],
  },
  { href: "/admin/media", label: "Media Library", icon: ImageIcon },
  { href: "/admin/reminders", label: "Reminders", icon: BellRing },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/users", label: "Users & Roles", icon: ShieldCheck, roles: ["owner"] },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText, roles: ["owner", "manager"] },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

// Bottom tab bar on phones
export const TABS = ["/admin", "/admin/clients", "/admin/leads", "/admin/cms", "/admin/settings"];
