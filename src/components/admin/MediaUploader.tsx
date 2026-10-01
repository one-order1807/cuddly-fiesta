"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/app/admin/media-actions";

export default function MediaUploader() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);

  async function upload(files: FileList | File[]) {
    const list = [...files];
    setBusy({ done: 0, total: list.length });
    let ok = 0;
    for (const [i, file] of list.entries()) {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadImage(fd);
      if (res.ok) ok++; else toast.error(`${file.name}: ${res.error}`);
      setBusy({ done: i + 1, total: list.length });
    }
    setBusy(null);
    if (ok) { toast.success(`${ok} image${ok > 1 ? "s" : ""} uploaded`); router.refresh(); }
  }

  return (
    <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); void upload(e.dataTransfer.files); }}
      className={`grid place-items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${over ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-[var(--line)]"}`}>
      <input ref={input} type="file" multiple hidden accept="image/png,image/jpeg,image/webp,image/avif" onChange={(e) => e.target.files && void upload(e.target.files)} />
      {busy ? (
        <div className="w-full max-w-xs"><Loader2 className="mx-auto animate-spin text-[var(--primary)]" /><p className="mt-2 text-sm">Uploading {busy.done}/{busy.total}…</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full bg-[var(--primary)] transition-all" style={{ width: `${(busy.done / busy.total) * 100}%` }} /></div></div>
      ) : (
        <>
          <UploadCloud className="text-[var(--primary)]" size={32} />
          <p className="mt-2 text-sm">Drag images here or <button className="font-semibold text-[var(--primary)] hover:underline" onClick={() => input.current?.click()}>browse</button></p>
        </>
      )}
    </div>
  );
}
