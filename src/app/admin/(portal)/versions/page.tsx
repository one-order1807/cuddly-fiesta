import { Suspense } from "react";
import ResourcePage from "@/components/admin/ResourcePage";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "App Versions" };

export default function VersionsPage() {
  return (
    <>
      <PageHeader title="App Versions" description="Release manager. Apps check GET /api/public/latest-version?app=…&platform=… (served by the Python service, Stage 3) to learn about updates." />
      <Suspense>
        <div className="space-y-10">
          <section><h2 className="mb-3 text-sm font-semibold">Releases</h2><ResourcePage resourceKey="app_versions" noHeader embedded /></section>
          <section><h2 className="mb-3 text-sm font-semibold">Products</h2><ResourcePage resourceKey="apps" noHeader embedded /></section>
        </div>
      </Suspense>
    </>
  );
}
