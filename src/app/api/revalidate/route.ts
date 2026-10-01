import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Called by the admin "Publish changes" button (and the FastAPI /site/revalidate proxy).
 * Auth: shared secret in the `x-revalidate-secret` header, compared in constant time.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  const got = req.headers.get("x-revalidate-secret") ?? "";
  const a = Buffer.from(got), b = Buffer.from(expected ?? "");
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const paths: string[] = Array.isArray(body.paths) && body.paths.length ? body.paths : ["/"];
  paths.filter((p) => typeof p === "string" && p.startsWith("/") && !p.startsWith("/admin")).forEach((p) => revalidatePath(p));
  return NextResponse.json({ ok: true, revalidated: paths, at: new Date().toISOString() });
}
