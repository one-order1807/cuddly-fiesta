import fallback from "@/content/fallback.json";
import { supabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/server";

export type Section = {
  slug: string; enabled: boolean; eyebrow?: string | null; heading?: string | null; subheading?: string | null;
  body?: string | null; cta_text?: string | null; cta_link?: string | null; image_url?: string | null;
  extra: Record<string, unknown>;
};
export type PlanFeature = { group?: string; text: string; included: boolean };
export type Plan = {
  id: string; slug: string; name: string; badge: string | null; best_for: string | null;
  price_monthly: number; price_yearly: number; original_price: number | null; free_setup_text: string | null;
  features: PlanFeature[]; limits: Record<string, number>; cta_text: string | null; highlight: boolean; sort_order: number;
};
export type Feature = { id: string; title: string; summary: string | null; bullets: string[]; icon: string | null; image_url?: string | null; sort_order: number };
export type BusinessType = { id: string; slug: string; name: string; tagline: string | null; benefits: string[]; flow_steps: string[]; hero_image_url?: string | null; sort_order: number };
export type GalleryItem = {
  id: string; title: string; label: string | null; caption: string | null; alt_text?: string | null; category: string;
  image_url?: string | null; thumb_url?: string | null; device_frame: "phone" | "tablet" | "desktop"; variant?: string; sort_order: number;
};
export type Testimonial = {
  id: string; customer_name: string; head_label: string | null; business: string | null; city: string | null; rating: number;
  short_text: string | null; full_text: string | null; customer_photo_url: string | null; business_thumb_url: string | null; featured: boolean; sort_order: number;
};
export type Faq = { id: string; question: string; answer: string; sort_order: number };
export type Offer = {
  id: string; title: string; popup_headline: string | null; perks: string[]; badge: string | null; button_text: string | null;
  link_target: string | null; ends_at?: string | null; countdown: boolean; show_every_days: number; audience: "all" | "new";
  bar_text: string | null; bar_color: string | null; exit_intent_text: string | null;
};
export type Settings = {
  contact: { whatsapp?: string; email?: string; phone?: string; address?: string; hours?: string; lat?: number; lng?: number };
  brand: { name?: string; by?: string; accent?: string; trusted_count?: number; cities?: string[]; logo_url?: string; by_logo_url?: string };
  social: { instagram?: string; linkedin?: string; youtube?: string };
  [k: string]: unknown;
};

export type SiteContent = {
  sections: Record<string, Section>;
  plans: Plan[];
  features: Feature[];
  business_types: BusinessType[];
  gallery: GalleryItem[];
  testimonials: Testimonial[];
  faqs: Faq[];
  offers: Offer[];
  settings: Settings;
};

const bySort = <T extends { sort_order?: number }>(rows: T[]) => [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

/**
 * Reads the published CMS views (v_public_*) with the anon key. Each block falls back to the bundled
 * JSON independently, so a partial Supabase outage (or an empty table) never blanks the site.
 */
export async function getSiteContent(): Promise<SiteContent> {
  const fb = fallback as unknown as SiteContent;
  if (!supabaseConfigured) return fb;

  const db = createPublicClient();
  const read = async <T,>(view: string, order = "sort_order"): Promise<T[] | null> => {
    try {
      const { data, error } = await db.from(view).select("*").order(order, { ascending: true });
      if (error || !data) return null;
      return data as T[];
    } catch {
      return null;
    }
  };

  const [sections, plans, features, types, gallery, reviews, faqs, offers, settings] = await Promise.all([
    read<Section>("v_public_sections"),
    read<Plan>("v_public_plans"),
    read<Feature>("v_public_features"),
    read<BusinessType>("v_public_business_types"),
    read<GalleryItem>("v_public_gallery"),
    read<Testimonial>("v_public_testimonials"),
    read<Faq>("v_public_faqs"),
    read<Offer>("v_public_offers"),
    read<{ key: string; value: unknown }>("v_public_settings", "key"),
  ]);

  const pick = <T,>(live: T[] | null, fbRows: T[]) => (live && live.length ? live : fbRows);

  return {
    sections: sections && sections.length ? { ...fb.sections, ...Object.fromEntries(sections.map((s) => [s.slug, s])) } : fb.sections,
    plans: bySort(pick(plans, fb.plans)),
    features: bySort(pick(features, fb.features)),
    business_types: bySort(pick(types, fb.business_types)),
    gallery: bySort(pick(gallery, fb.gallery)),
    testimonials: bySort(reviews ?? fb.testimonials), // empty is a valid live state: never invent reviews
    faqs: bySort(pick(faqs, fb.faqs)),
    offers: offers ?? fb.offers,
    settings: settings && settings.length
      ? ({ ...fb.settings, ...Object.fromEntries(settings.map((s) => [s.key, s.value])) } as Settings)
      : fb.settings,
  };
}
