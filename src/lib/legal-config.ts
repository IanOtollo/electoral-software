/**
 * Who operates this service. Set these in the environment (never hard-code or
 * invent them). Anything unset is simply left out of the public pages.
 *
 *   NEXT_PUBLIC_OPERATOR_NAME     registered legal name of the operator
 *   NEXT_PUBLIC_OPERATOR_ADDRESS  postal / physical address
 *   NEXT_PUBLIC_CONTACT_EMAIL     general and legal contact
 *   NEXT_PUBLIC_ODPC_REGISTRATION Data Protection Commissioner registration number
 */
export const LEGAL = {
  service: "Campaign Management System",
  effective: "15 November 2026",
  version: "1.0",
  operatorName: process.env.NEXT_PUBLIC_OPERATOR_NAME || null,
  operatorAddress: process.env.NEXT_PUBLIC_OPERATOR_ADDRESS || null,
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  odpcRegistration: process.env.NEXT_PUBLIC_ODPC_REGISTRATION || null,
} as const;

/** Short statement shown in the footer and repeated wherever results appear. */
export const INDEPENDENCE_STATEMENT =
  "Independent software. Not affiliated with, endorsed by, or operated by the Independent Electoral and Boundaries Commission (IEBC), any government body, political party or candidate. Figures shown here are not official election results.";
