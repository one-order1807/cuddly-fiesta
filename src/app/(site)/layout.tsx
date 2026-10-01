import SmoothScroll from "@/components/site/SmoothScroll";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site min-h-dvh overflow-x-clip">
      <SmoothScroll />
      {children}
    </div>
  );
}
