import { ConvexHttpClient } from "convex/browser";

const convexUrl = import.meta.env.PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("PUBLIC_CONVEX_URL is not set.");
}

export const convex = new ConvexHttpClient(convexUrl);
