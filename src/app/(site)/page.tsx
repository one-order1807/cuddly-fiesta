import type { Metadata } from "next";
import { getSiteContent } from "@/lib/content";
import Preloader from "@/components/site/Preloader";
import Nav from "@/components/site/Nav";
import { OfferBar, OfferPopup } from "@/components/site/Offers";
import HeroStory from "@/components/site/HeroStory";
import { BusinessTypes, FaqList, Features, Gallery, Reviews } from "@/components/site/Sections";
import Pricing from "@/components/site/Pricing";
import LeadForm from "@/components/site/LeadForm";
import Footer from "@/components/site/Footer";

// ISR: refreshed every minute, and instantly when the admin hits Publish (POST /api/revalidate).
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "One-Order — Café POS by Cloud Build Tech",
    description: "Tablet-first café POS with kitchen tickets, table tracking and offline mode. Free setup.",
  };
}

export default async function Home() {
  const c = await getSiteContent();
  const offer = c.offers[0];
  const brand = c.settings.brand ?? {};

  return (
    <>
      <Preloader brand={brand.name} by={brand.by} />
      <OfferBar offer={offer} />
      <Nav brand={brand.name ?? "One-Order"} by={brand.by ?? "Cloud Build Tech"} hasBar={Boolean(offer?.bar_text)} />
      <main>
        <HeroStory hero={c.sections.hero} story={c.sections.story} />
        <Features section={c.sections.features} items={c.features} />
        <BusinessTypes items={c.business_types} />
        <Gallery section={c.sections.gallery} items={c.gallery} />
        <Pricing section={c.sections.pricing} plans={c.plans} />
        <Reviews section={c.sections.reviews} items={c.testimonials} trusted={brand.trusted_count} />
        <FaqList section={c.sections.faq} items={c.faqs} />
        <LeadForm section={c.sections.cta} settings={c.settings} />
      </main>
      <Footer settings={c.settings} />
      <OfferPopup offer={offer} />
    </>
  );
}
