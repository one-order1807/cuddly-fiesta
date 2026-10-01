import "server-only";
import { getDb, type Row } from "./db";
import type { Resource } from "./resources";

/** For child tables viewed outside a client page, add a `_client` display name to each row. */
export async function attachClientNames(rows: Row[], r: Resource): Promise<Row[]> {
  if (!r.scopeCol) return rows;
  const clients = (await (await getDb()).list("clients", { limit: 2000 })).rows;
  const names = new Map(clients.map((c) => [c.id, c.business_name as string]));
  return rows.map((x) => ({ ...x, _client: names.get(x[r.scopeCol!]) ?? "" }));
}
