import { getDb } from "@/lib/admin/db";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import MediaUploader from "@/components/admin/MediaUploader";

export const metadata = { title: "Media Library" };

export default async function MediaPage() {
  const { rows } = await (await getDb()).list("media_assets", { softDelete: true, order: { col: "created_at", asc: false }, limit: 200 });
  return (
    <>
      <PageHeader title="Media Library" description="Images used on the website. Upload here, or directly inside any form with an image field. Automatic WebP/thumbnail processing arrives with the Python service (Stage 4)." />
      <MediaUploader />
      {rows.length === 0 ? <div className="mt-6"><EmptyState title="No images yet" hint="Drop PNG, JPEG, WebP or AVIF files above (max 5 MB each)." /></div> : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {rows.map((m) => (
            <li key={m.id} className="glass overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url?.startsWith("http") || m.url?.startsWith("data:") ? m.url : ""} alt={m.alt_text || m.name} className="aspect-video w-full bg-[var(--line)] object-cover" loading="lazy" />
              <div className="p-3 text-xs"><p className="truncate font-semibold">{m.name}</p><p className="text-[var(--fg-muted)]">{m.size_bytes ? `${Math.round(m.size_bytes / 1024)} KB` : ""}</p></div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
