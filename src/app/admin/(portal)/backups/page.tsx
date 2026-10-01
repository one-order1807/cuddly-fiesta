import { Suspense } from "react";
import ResourcePage from "@/components/admin/ResourcePage";

export const metadata = { title: "backups" };

export default function Page() {
  return <Suspense><ResourcePage resourceKey="backups" /></Suspense>;
}
