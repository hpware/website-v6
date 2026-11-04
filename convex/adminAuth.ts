import { ConvexError } from "convex/values";

// Admin-only functions are called by the website's server (never the browser)
// with ADMIN_API_SECRET, which is set both in Vercel and in the Convex env.
export function requireAdmin(secret: string) {
  const expected = process.env.ADMIN_API_SECRET;
  if (!expected || !safeEqual(secret, expected)) {
    throw new ConvexError("Unauthorized");
  }
}

// Constant-time compare (no node:crypto in the default Convex runtime).
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
