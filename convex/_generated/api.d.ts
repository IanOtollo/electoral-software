/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as agentPortal from "../agentPortal.js";
import type * as agents from "../agents.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as bootstrap from "../bootstrap.js";
import type * as campaign from "../campaign.js";
import type * as contacts from "../contacts.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_guard from "../lib/guard.js";
import type * as lib_legal from "../lib/legal.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_phone from "../lib/phone.js";
import type * as lib_reserved from "../lib/reserved.js";
import type * as lib_sms from "../lib/sms.js";
import type * as maintenance from "../maintenance.js";
import type * as messages from "../messages.js";
import type * as passwords from "../passwords.js";
import type * as signup from "../signup.js";
import type * as smsSend from "../smsSend.js";
import type * as tally from "../tally.js";
import type * as tenants from "../tenants.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  agentPortal: typeof agentPortal;
  agents: typeof agents;
  audit: typeof audit;
  auth: typeof auth;
  bootstrap: typeof bootstrap;
  campaign: typeof campaign;
  contacts: typeof contacts;
  crons: typeof crons;
  http: typeof http;
  "lib/audit": typeof lib_audit;
  "lib/crypto": typeof lib_crypto;
  "lib/guard": typeof lib_guard;
  "lib/legal": typeof lib_legal;
  "lib/permissions": typeof lib_permissions;
  "lib/phone": typeof lib_phone;
  "lib/reserved": typeof lib_reserved;
  "lib/sms": typeof lib_sms;
  maintenance: typeof maintenance;
  messages: typeof messages;
  passwords: typeof passwords;
  signup: typeof signup;
  smsSend: typeof smsSend;
  tally: typeof tally;
  tenants: typeof tenants;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
