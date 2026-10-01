import { Suspense } from "react";
import ResourcePage from "@/components/admin/ResourcePage";

export const metadata = { title: "Clients" };

export default function ClientsPage() {
  return <Suspense><ResourcePage resourceKey="clients" /></Suspense>;
}
