/**
 * Single source of truth for RBAC. Imported by Convex functions (enforcement)
 * and by the Next.js app (UI gating only — the server never trusts the UI).
 */

export const ROLES = [
  "super_admin", // platform operator; no access to tenant voter/SMS content
  "tenant_admin", // owns a campaign workspace
  "campaign_manager",
  "comms_officer",
  "tally_clerk",
  "field_agent",
  "viewer",
] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "tenants:manage",
  "users:read",
  "users:manage",
  "audit:read",
  "settings:manage",
  "voters:read",
  "voters:write",
  "sms:read",
  "sms:send",
  "sms:review",
  "tally:read",
  "tally:submit",
  "tally:verify",
  "tally:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const TENANT_READ: Permission[] = ["voters:read", "sms:read", "tally:read"];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: ["tenants:manage", "users:read", "users:manage", "audit:read", "sms:review"],
  tenant_admin: [
    "users:read", "users:manage", "audit:read", "settings:manage",
    "voters:read", "voters:write", "sms:read", "sms:send",
    "tally:read", "tally:verify", "tally:manage",
  ],
  campaign_manager: [
    "users:read", "voters:read", "voters:write", "sms:read", "sms:send",
    "tally:read", "tally:verify", "tally:manage",
  ],
  comms_officer: ["voters:read", "voters:write", "sms:read", "sms:send"],
  tally_clerk: ["tally:read", "tally:verify", "tally:submit"],
  field_agent: ["tally:submit"],
  viewer: TENANT_READ,
};

/** Higher = more privileged. Used to stop privilege escalation. */
export const ROLE_RANK: Record<Role, number> = {
  super_admin: 100,
  tenant_admin: 80,
  campaign_manager: 60,
  comms_officer: 40,
  tally_clerk: 40,
  field_agent: 20,
  viewer: 10,
};

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Platform Administrator",
  tenant_admin: "Workspace Administrator",
  campaign_manager: "Campaign Manager",
  comms_officer: "Communications Officer",
  tally_clerk: "Tally Clerk",
  field_agent: "Field Agent",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Provisions workspaces and monitors the platform. Cannot read voter data or messages.",
  tenant_admin: "Full control of the workspace: people, settings, messaging and results.",
  campaign_manager: "Runs the campaign: voters, SMS, results verification and agents.",
  comms_officer: "Manages contacts and sends SMS. No access to results.",
  tally_clerk: "Captures and verifies results at the tally centre.",
  field_agent: "Submits results from a polling station. Nothing else.",
  viewer: "Read-only access to dashboards.",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function hasPermission(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Roles `actor` may grant. Nobody can grant above their own rank; only super_admin grants super_admin. */
export function assignableRoles(actor: Role): Role[] {
  if (actor === "super_admin") return [...ROLES];
  return ROLES.filter((r) => r !== "super_admin" && ROLE_RANK[r] <= ROLE_RANK[actor]);
}

export function canAssign(actor: Role, target: Role): boolean {
  return assignableRoles(actor).includes(target);
}
