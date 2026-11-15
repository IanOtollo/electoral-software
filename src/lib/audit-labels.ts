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
  if (action.startsWith("platform.") && s("email")) return `${base}: ${s("email")}`;
  if (action === "platform.workspace_deleted" && s("name")) return `${base}: ${s("name")}`;
  return base;
}

export const AUDIT_GROUPS = [
  { value: "", label: "Everything" },
  { value: "platform.", label: "Platform actions" },
  { value: "auth.", label: "Sign-ins and passwords" },
  { value: "user.", label: "People and roles" },
  { value: "tenant.", label: "Workspaces" },
  { value: "campaign.", label: "Campaign set-up" },
  { value: "agent.", label: "Agents" },
  { value: "contacts.", label: "Contacts" },
  { value: "message.", label: "Messages" },
];
