import type { Metadata } from "next";
import { headers } from "next/headers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: { default: "Admin Portal — One-Order × Cloud Build Tech", template: "%s · Admin" },
  robots: { index: false, follow: false, nocache: true },
};

// Runs before paint so dark mode never flashes. Carries the per-request CSP nonce set by src/proxy.ts.
const THEME_SCRIPT = `try{var t=localStorage.getItem('oo_theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.setAttribute('data-theme','dark')}catch(e){}`;

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      {children}
      <Toaster position="bottom-right" richColors closeButton />
    </>
  );
}
