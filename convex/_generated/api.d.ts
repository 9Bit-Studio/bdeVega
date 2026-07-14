/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiKeys from "../apiKeys.js";
import type * as assets from "../assets.js";
import type * as auth from "../auth.js";
import type * as games from "../games.js";
import type * as generation from "../generation.js";
import type * as generationJobs from "../generationJobs.js";
import type * as generationWorker from "../generationWorker.js";
import type * as http from "../http.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_generationPolicy from "../lib/generationPolicy.js";
import type * as publish from "../publish.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apiKeys: typeof apiKeys;
  assets: typeof assets;
  auth: typeof auth;
  games: typeof games;
  generation: typeof generation;
  generationJobs: typeof generationJobs;
  generationWorker: typeof generationWorker;
  http: typeof http;
  "lib/authz": typeof lib_authz;
  "lib/crypto": typeof lib_crypto;
  "lib/generationPolicy": typeof lib_generationPolicy;
  publish: typeof publish;
  settings: typeof settings;
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
