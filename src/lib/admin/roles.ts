export type Role = "owner" | "manager" | "support" | "viewer";

export const ROLES: Role[] = ["owner", "manager", "support", "viewer"];

/** Who may do what. The DB enforces the same rules via RLS; this drives the UI and server-action pre-checks. */
export const can = {
  readAdmin: (r: Role) => ROLES.includes(r),
  writeBusiness: (r: Role) => r === "owner" || r === "manager",
  writeBilling: (r: Role) => r === "owner",
  writeSupport: (r: Role) => r !== "viewer",
  revealVault: (r: Role) => r === "owner" || r === "manager",
  manageUsers: (r: Role) => r === "owner",
  publish: (r: Role) => r === "owner" || r === "manager",
  readAudit: (r: Role) => r === "owner" || r === "manager",
};
