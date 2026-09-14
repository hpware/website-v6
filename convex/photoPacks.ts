import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const packFields = {
  title: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  cover_image_url: v.string(),
  archive_url: v.string(),
  photo_count: v.optional(v.number()),
  archive_size: v.optional(v.string()),
};

function assertPublicUrl(value: string, fieldName: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${fieldName} must be a valid URL`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${fieldName} must use HTTP or HTTPS`);
  }
}

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("photo_packs")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: packFields,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("photo_packs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new Error("A photo pack with this slug already exists");

    assertPublicUrl(args.cover_image_url, "Cover image URL");
    assertPublicUrl(args.archive_url, "Archive URL");

    const now = Date.now();
    return await ctx.db.insert("photo_packs", {
      ...args,
      status: "draft",
      created_at: now,
      updated_at: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("photo_packs"),
    title: v.string(),
    description: v.optional(v.string()),
    cover_image_url: v.string(),
    archive_url: v.string(),
    photo_count: v.optional(v.number()),
    archive_size: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const { id, ...changes } = args;
    const pack = await ctx.db.get(id);
    if (!pack) throw new Error("Photo pack not found");

    assertPublicUrl(changes.cover_image_url, "Cover image URL");
    assertPublicUrl(changes.archive_url, "Archive URL");

    await ctx.db.patch(id, { ...changes, updated_at: Date.now() });
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("photo_packs"),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const pack = await ctx.db.get(args.id);
    if (!pack) throw new Error("Photo pack not found");

    await ctx.db.patch(args.id, {
      status: args.status,
      updated_at: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("photo_packs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const pack = await ctx.db.get(args.id);
    if (!pack) throw new Error("Photo pack not found");
    await ctx.db.delete(args.id);
  },
});
