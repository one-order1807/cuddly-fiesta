import { Suspense } from "react";
import ResourcePage from "@/components/admin/ResourcePage";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <>
      <PageHeader title="Billing" description="Invoices and payments across all clients. PDF invoices and WhatsApp/email sending arrive with the Python service (Stage 5)." />
      <Suspense>
        <div className="space-y-10">
          <section><h2 className="mb-3 text-sm font-semibold">Invoices</h2><ResourcePage resourceKey="invoices" noHeader embedded /></section>
          <section><h2 className="mb-3 text-sm font-semibold">Payments</h2><ResourcePage resourceKey="payments" noHeader embedded /></section>
        </div>
      </Suspense>
    </>
  );
}
