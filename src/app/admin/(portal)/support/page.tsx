import { Suspense } from "react";
import ResourcePage from "@/components/admin/ResourcePage";

export const metadata = { title: "support" };

export default function Page() {
  return <Suspense><ResourcePage resourceKey="support" /></Suspense>;
}
