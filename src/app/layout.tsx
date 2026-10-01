import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Work_Sans } from "next/font/google";
import "./globals.css";

const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"], display: "swap" });
const instrumentSerif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "One-Order — Café POS by Cloud Build Tech",
  description: "Tablet-first café POS with kitchen tickets, table tracking and offline mode. Free setup.",
};

export const viewport: Viewport = { themeColor: "#050a16", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${workSans.variable} ${instrumentSerif.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
