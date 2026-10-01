"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { publishSite } from "@/app/admin/actions";

export default function PublishButton({ siteUrl = "/" }: { siteUrl?: string }) {
  const [pending, start] = useTransition();
  const [last, setLast] = useState<string | null>(null);

  return (
    <>
      <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost"><ExternalLink size={15} /> View site</a>
      <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => {
        const res = await publishSite();
        if (res.ok) { setLast(new Date(res.data.at).toLocaleTimeString()); toast.success(`Published — the website now shows your latest changes (${res.data.via.join(" + ")}).`); }
        else toast.error(res.error);
      })}>
        {pending ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />} Publish changes
      </button>
      {last && <span className="text-xs text-[var(--fg-muted)]">Published {last}</span>}
    </>
  );
}
