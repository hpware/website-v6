import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./adminAuth";

// Passkeys that can sign in to /admin. Only the website server can read or
// change these (it holds ADMIN_API_SECRET).

export const list = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    return await ctx.db.query("admin_passkeys").order("desc").collect();
  },
});

export const getByCredentialId = query({
  args: { secret: v.string(), credential_id: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    return await ctx.db
      .query("admin_passkeys")
      .withIndex("by_credential_id", (q) => q.eq("credential_id", args.credential_id))
      .first();
  },
});

export const add = mutation({
  args: {
    secret: v.string(),
    name: v.string(),
    credential_id: v.string(),
    public_key: v.string(),
    counter: v.number(),
    transports: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { secret, ...passkey }) => {
    requireAdmin(secret);
    await ctx.db.insert("admin_passkeys", { ...passkey, created_at: Date.now() });
  },
});

export const markUsed = mutation({
  args: { secret: v.string(), id: v.id("admin_passkeys"), counter: v.number() },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    await ctx.db.patch(args.id, { counter: args.counter, last_used_at: Date.now() });
  },
});

export const remove = mutation({
  args: { secret: v.string(), id: v.id("admin_passkeys") },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    if (!(await ctx.db.get(args.id))) throw new ConvexError("Passkey not found");
    await ctx.db.delete(args.id);
  },
});
