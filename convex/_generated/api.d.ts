/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as adminAuth from "../adminAuth.js";
import type * as adminPasskeys from "../adminPasskeys.js";
import type * as app from "../app.js";
import type * as blog from "../blog.js";
import type * as comments from "../comments.js";
import type * as galleries from "../galleries.js";
import type * as pages from "../pages.js";
import type * as photoMeta from "../photoMeta.js";
import type * as todos from "../todos.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  adminAuth: typeof adminAuth;
  adminPasskeys: typeof adminPasskeys;
  app: typeof app;
  blog: typeof blog;
  comments: typeof comments;
  galleries: typeof galleries;
  pages: typeof pages;
  photoMeta: typeof photoMeta;
  todos: typeof todos;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
