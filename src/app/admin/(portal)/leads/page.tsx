import { Suspense } from "react";
import ResourcePage from "@/components/admin/ResourcePage";

export const metadata = { title: "leads" };

export default function Page() {
  return <Suspense><ResourcePage resourceKey="leads" /></Suspense>;
}
