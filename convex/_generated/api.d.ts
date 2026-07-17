/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth_functions from "../auth_functions.js";
import type * as campaigns from "../campaigns.js";
import type * as contacts from "../contacts.js";
import type * as dashboard from "../dashboard.js";
import type * as seed from "../seed.js";
import type * as sms from "../sms.js";
import type * as stations from "../stations.js";
import type * as submissions from "../submissions.js";
import type * as tally from "../tally.js";
import type * as tenants from "../tenants.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth_functions: typeof auth_functions;
  campaigns: typeof campaigns;
  contacts: typeof contacts;
  dashboard: typeof dashboard;
  seed: typeof seed;
  sms: typeof sms;
  stations: typeof stations;
  submissions: typeof submissions;
  tally: typeof tally;
  tenants: typeof tenants;
  utils: typeof utils;
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
