import { Suspense } from "react";
import ResourcePage from "@/components/admin/ResourcePage";

export const metadata = { title: "repos" };

export default function Page() {
  return <Suspense><ResourcePage resourceKey="repos" /></Suspense>;
}
