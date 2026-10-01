"use server";

import { getAdmin } from "@/lib/admin/session";
import { getDb } from "@/lib/admin/db";
import { audit } from "@/lib/admin/audit";
import { can } from "@/lib/admin/roles";
import { createClient } from "@/lib/supabase/server";
import { demoMode } from "@/lib/env";
import type { ActionResult } from "./actions";

const MAX_PUBLIC = 5 * 1024 * 1024;

/** Content sniffing — never trust the client-supplied MIME type. SVG is rejected (script-capable). */
function sniff(b: Uint8Array): { mime: string; ext: string } | null {
  const is = (...bytes: number[]) => bytes.every((v, i) => b[i] === v);
  if (is(0x89, 0x50, 0x4e, 0x47)) return { mime: "image/png", ext: "png" };
  if (is(0xff, 0xd8, 0xff)) return { mime: "image/jpeg", ext: "jpg" };
  if (is(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { mime: "image/webp", ext: "webp" };
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 && b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 && b[11] === 0x66) return { mime: "image/avif", ext: "avif" };
  return null;
}

export async function uploadImage(form: FormData): Promise<ActionResult<{ url: string }>> {
  const admin = await getAdmin();
  if (!admin || !can.writeBusiness(admin.role)) return { ok: false, error: "You don't have permission to upload." };
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image first." };
  if (file.size > MAX_PUBLIC) return { ok: false, error: "Image is larger than 5 MB." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return { ok: false, error: "Only PNG, JPEG, WebP or AVIF images are allowed." };

  const safeName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").slice(0, 60) || "image";
  const path = `uploads/${new Date().getFullYear()}/${crypto.randomUUID().slice(0, 8)}-${safeName}.${kind.ext}`;

  let url: string;
  if (demoMode) {
    url = `data:${kind.mime};base64,${Buffer.from(bytes).toString("base64")}`;
  } else {
    const sb = await createClient();
    const { error } = await sb.storage.from("public-site").upload(path, bytes, { contentType: kind.mime, upsert: false, cacheControl: "31536000" });
    if (error) return { ok: false, error: "Upload failed: " + error.message };
    url = sb.storage.from("public-site").getPublicUrl(path).data.publicUrl;
  }

  try {
    await (await getDb()).insert("media_assets", { bucket: "public-site", path, url: demoMode ? path : url, name: file.name, mime: kind.mime, size_bytes: file.size, uploaded_by: admin.demo ? null : admin.id });
  } catch { /* the file is stored; the library row is best-effort */ }
  await audit(admin, { action: "upload", entity: "media_assets", meta: { path, size: file.size } });
  return { ok: true, data: { url } };
}
