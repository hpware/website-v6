import { ConvexHttpClient } from "convex/browser";

const convexUrl = import.meta.env.PUBLIC_CONVEX_URL;

export const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;
