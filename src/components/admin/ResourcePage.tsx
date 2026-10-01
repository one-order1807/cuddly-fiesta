import { getAdmin } from "@/lib/admin/session";
import { getDb } from "@/lib/admin/db";
import { RESOURCES } from "@/lib/admin/resources";
import { can } from "@/lib/admin/roles";
import ResourceManager, { type ClientResource } from "./ResourceManager";
import { PageHeader } from "./ui";
import PublishButton from "./PublishButton";
import { redirect } from "next/navigation";
import { attachClientNames } from "@/lib/admin/db-helpers";

export default async function ResourcePage({ resourceKey, crumbs, noHeader, scope, embedded }: { resourceKey: string; crumbs?: { label: string; href?: string }[]; noHeader?: boolean; scope?: { col: string; value: string }; embedded?: boolean }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const r = RESOURCES[resourceKey];
  if (!r) throw new Error(`Unknown resource ${resourceKey}`);

  const { rows } = await (await getDb()).list(r.table, { softDelete: r.soft, order: r.order, searchCols: r.searchCols, limit: 500, filters: scope && r.scopeCol === scope.col ? { [scope.col]: scope.value } : undefined });
  const { write, ...rest } = r;
  const unscoped = !!r.scopeCol && !scope;
  const client: ClientResource = {
    ...rest,
    canWrite: write(admin.role),
    columns: unscoped ? [rest.columns[0], { name: "_client", label: "Client" }, ...rest.columns.slice(1)] : rest.columns,
    fields: unscoped ? [{ name: r.scopeCol!, label: "Client", type: "ref", ref: { table: "clients", label: "business_name" }, required: r.key !== "repos" }, ...rest.fields] : rest.fields,
  };
  const withNames = await attachClientNames(rows, r);

  return (
    <>
      {!noHeader && (
        <PageHeader title={r.title} description={r.description} crumbs={crumbs}
          actions={r.cms && can.publish(admin.role) ? <PublishButton /> : undefined} />
      )}
      <ResourceManager resource={client} initialRows={withNames} scope={scope} embedded={embedded} />
    </>
  );
}
