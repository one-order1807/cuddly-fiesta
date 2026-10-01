import Image from "next/image";
import { Star, ChefHat, Receipt, WifiOff, LayoutGrid, Printer, BarChart3, Users, QrCode, Smartphone, Zap, ShieldCheck, Clock, type LucideIcon } from "lucide-react";
import type { BusinessType, Faq, Feature, GalleryItem, Section, Testimonial } from "@/lib/content";
import PosScreenImage from "./PosScreenImage";
import type { ScreenVariant } from "./scene/screens";

const ICONS: Record<string, LucideIcon> = { ChefHat, Receipt, WifiOff, LayoutGrid, Printer, BarChart3, Users, QrCode, Smartphone, Zap, ShieldCheck, Clock };

export function SectionHead({ s, center = false }: { s?: Section; center?: boolean }) {
  if (!s) return null;
  return (
    <div className={`mb-12 max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      {s.eyebrow && <p data-reveal className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">{s.eyebrow}</p>}
      {s.heading && <h2 data-reveal className="text-[clamp(2rem,5vw,3.6rem)] leading-[1.02]">{s.heading}</h2>}
      {s.subheading && <p data-reveal className="mt-4 text-[var(--fg-muted)]">{s.subheading}</p>}
    </div>
  );
}

export function Features({ section, items }: { section?: Section; items: Feature[] }) {
  if (section && !section.enabled) return null;
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-24">
      <SectionHead s={section} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((f) => {
          const Icon = (f.icon && ICONS[f.icon]) || Zap;
          return (
            <article key={f.id} data-reveal className="glass group rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1.5">
              <div className="mb-5 grid h-11 w-11 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)] transition-transform duration-300 group-hover:scale-110">
                {f.image_url ? <Image src={f.image_url} alt="" width={28} height={28} /> : <Icon size={22} />}
              </div>
              <h3 className="text-2xl leading-tight">{f.title}</h3>
              {f.summary && <p className="mt-2 text-sm text-[var(--fg-muted)]">{f.summary}</p>}
              <ul className="mt-4 space-y-1.5 text-sm">
                {f.bullets.map((b) => <li key={b} className="flex gap-2 text-[var(--fg)]/85"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--primary)]" />{b}</li>)}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function BusinessTypes({ items }: { items: BusinessType[] }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24">
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((b) => (
          <article key={b.id} data-reveal className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f1b36] to-[#0a1224] p-7">
            {b.hero_image_url && <Image src={b.hero_image_url} alt="" fill className="object-cover opacity-25" sizes="(min-width:768px) 33vw, 100vw" />}
            <div className="relative">
              <h3 className="text-3xl">{b.name}</h3>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">{b.tagline}</p>
              <ol className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold">
                {b.flow_steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-2"><span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-[var(--primary)]">{s}</span>{i < b.flow_steps.length - 1 && <span className="text-white/25">→</span>}</li>
                ))}
              </ol>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Gallery({ section, items }: { section?: Section; items: GalleryItem[] }) {
  if (section && !section.enabled) return null;
  return (
    <section id="screens" className="overflow-hidden py-24">
      <div className="mx-auto max-w-6xl px-5"><SectionHead s={section} /></div>
      <div className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-6 sm:px-[max(1.25rem,calc((100vw-72rem)/2))]">
        {items.map((g) => (
          <figure key={g.id} data-reveal className="w-[min(86vw,34rem)] shrink-0 snap-center">
            {g.image_url ? (
              <div className="overflow-hidden rounded-[1.6rem] bg-[#0b1224] p-3 ring-1 ring-white/10">
                <Image src={g.image_url} alt={g.alt_text || g.title} width={1280} height={880} className="h-auto w-full rounded-xl" sizes="(min-width:640px) 34rem, 86vw" />
              </div>
            ) : (
              <PosScreenImage variant={(g.variant as ScreenVariant) || "ordering"} frame={g.device_frame} />
            )}
            <figcaption className="mt-4 px-1">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">{g.label || g.category}</span>
              <p className="serif mt-1 text-2xl">{g.title}</p>
              {g.caption && <p className="mt-1 text-sm text-[var(--fg-muted)]">{g.caption}</p>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function Reviews({ section, items, trusted }: { section?: Section; items: Testimonial[]; trusted?: number }) {
  if (section && !section.enabled) return null;
  // Real reviews only — the section simply doesn't render until you publish some in the admin.
  if (!items.length) return null;
  return (
    <section id="reviews" className="mx-auto max-w-6xl px-5 py-24">
      <SectionHead s={section} />
      {trusted ? <p data-reveal className="-mt-6 mb-10 text-[var(--fg-muted)]">{trusted}+ businesses run on One-Order</p> : null}
      <div className="columns-1 gap-4 md:columns-2 lg:columns-3 [&>*]:mb-4">
        {items.map((t) => (
          <blockquote key={t.id} data-reveal className="glass break-inside-avoid rounded-3xl p-6">
            <div className="mb-3 flex gap-0.5 text-[var(--amber)]" aria-label={`${t.rating} out of 5 stars`}>
              {Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <p className="text-[var(--fg)]/90">“{t.short_text || t.full_text}”</p>
            <footer className="mt-5 flex items-center gap-3">
              {t.customer_photo_url ? <Image src={t.customer_photo_url} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary)]">{t.customer_name[0]}</span>}
              <div className="text-sm"><div className="font-semibold">{t.customer_name}</div><div className="text-[var(--fg-muted)]">{t.head_label || [t.business, t.city].filter(Boolean).join(" · ")}</div></div>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}

export function FaqList({ section, items }: { section?: Section; items: Faq[] }) {
  if ((section && !section.enabled) || !items.length) return null;
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-24">
      <SectionHead s={section} center />
      <div className="space-y-3">
        {items.map((q) => (
          <details key={q.id} data-reveal className="glass group rounded-2xl px-5 py-4 open:bg-white/[0.06]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">
              {q.question}
              <span className="text-2xl leading-none text-[var(--primary)] transition-transform group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="mt-3 text-[var(--fg-muted)]">{q.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
