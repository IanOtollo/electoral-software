/** Plain-English wording for audit entries, shared by the admin console and workspace audit page. */
const LABELS: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
  "auth.password_changed": "Changed their password",
  "auth.password_reset": "Chose a new password from a reset link",
  "user.invited": "Invited a person",
  "user.invite_revoked": "Withdrew an invitation",
  "user.joined": "Accepted an invitation",
  "user.role_changed": "Changed a role",
  "user.suspended": "Suspended a user",
  "user.reactivated": "Reactivated a user",
  "tenant.created": "Workspace created",
  "tenant.signed_up": "Campaign signed up",
  "tenant.updated": "Workspace updated",
  "tenant.credits_granted": "SMS credits adjusted",
  "campaign.saved": "Saved the campaign set-up",
  "agent.created": "Added an agent",
  "agent.updated": "Updated an agent",
  "agent.access_reset": "Reissued an agent's link and PIN",
  "contacts.imported": "Imported contacts",
  "contacts.opted_out": "Recorded an opt-out",
  "contacts.removed": "Removed a contact",
  "message.submitted": "Submitted a message for approval",
  "message.approved": "Message approved",
  "message.refused": "Message refused",
  "message.cancelled": "Message cancelled",
  "message.sent": "Message sent to the network",
  "message.failed": "Message stopped before finishing",
  "contacts.opted_out_by_reply": "Contact opted out by replying STOP",
  "auth.login_failed": "Failed sign-in attempt",
  "auth.locked": "Account locked after repeated failures",
  "agent.signed_in": "Agent signed in",
  "agent.sign_in_failed": "Agent sign-in failed",
  "agent.locked": "Agent locked after wrong PINs",
  "result.submitted": "Result submitted for a station",
  "result.corrected": "Result corrected for a station",
  "platform.audit_exported": "Audit log exported",
  "platform.user_suspended": "Platform suspended a user",
  "platform.user_reactivated": "Platform reactivated a user",
  "platform.user_signed_out": "Platform signed a user out everywhere",
  "platform.password_reset_issued": "Platform issued a password reset link",
  "platform.invite_reissued": "Platform issued a new invitation link",
  "platform.workspace_deleted": "Workspace deleted by the platform",
  "platform.signups_opened": "New sign-ups opened",
  "platform.signups_closed": "New sign-ups paused",
  "platform.super_admin_created": "Platform administrator created",
};

export function describeAction(action: string, metadata?: unknown): string {
  const base = LABELS[action] ?? action;
  const m = (metadata ?? {}) as Record<string, unknown>;
  const s = (k: string) => (typeof m[k] === "string" ? (m[k] as string) : null);
  if (action === "user.role_changed" && s("from") && s("to")) return `${base}: ${s("from")!.replace(/_/g, " ")} to ${s("to")!.replace(/_/g, " ")}`;
  if (action === "user.invited" && s("email")) return `${base}: ${s("email")}`;
  if (action === "tenant.credits_granted" && typeof m.amount === "number") return `${base}: ${m.amount > 0 ? "+" : ""}${m.amount} (balance ${m.balance})`;
  if (action === "contacts.imported" && typeof m.added === "number") return `${base}: ${m.added} added`;
  if (action === "auth.login_failed" && s("reason")) return `${base}: ${s("reason")!.replace(/_/g, " ")}`;
  if (action === "agent.sign_in_failed" && s("agent")) return `${base}: ${s("agent")}${s("reason") ? ` (${s("reason")!.replace(/_/g, " ")})` : ""}`;
  if ((action === "agent.signed_in" || action === "agent.locked") && s("agent")) return `${base}: ${s("agent")}`;
  if ((action === "result.submitted" || action === "result.corrected") && s("station")) return `${base}: ${s("station")}${Array.isArray(m.flags) && m.flags.length ? " (flagged)" : ""}`;
  if (action === "platform.audit_exported" && typeof m.entries === "number") return `${base}: ${m.entries} entries`;
  if (action.startsWith("platform.") && s("email")) return `${base}: ${s("email")}`;
  if (action === "platform.workspace_deleted" && s("name")) return `${base}: ${s("name")}`;
  return base;
}

export const AUDIT_GROUPS = [
  { value: "", label: "Everything" },
  { value: "platform.", label: "Platform actions" },
  { value: "auth.", label: "Sign-ins and passwords" },
  { value: "result.", label: "Results" },
  { value: "user.", label: "People and roles" },
  { value: "tenant.", label: "Workspaces" },
  { value: "campaign.", label: "Campaign set-up" },
  { value: "agent.", label: "Agents" },
  { value: "contacts.", label: "Contacts" },
  { value: "message.", label: "Messages" },
];

/** How much attention an entry deserves: shown as a coloured marker in the log. */
export type Severity = "normal" | "notice" | "alert";
export function severityOf(action: string, metadata?: unknown): Severity {
  const m = (metadata ?? {}) as { flags?: unknown[] };
  if (action === "auth.locked" || action === "agent.locked" || action === "message.failed" || action === "platform.workspace_deleted") return "alert";
  if (action === "result.submitted" || action === "result.corrected") return Array.isArray(m.flags) && m.flags.length ? "alert" : "normal";
  if (/failed|refused|suspended|deleted|signed_out|password_reset_issued|removed|revoked|exported|cancelled/.test(action)) return "notice";
  return "normal";
}
