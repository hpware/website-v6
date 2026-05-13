import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ============ QUERIES ============

export const list = query({
  args: {},
  handler: async (ctx) => {
    const galleries = await ctx.db
      .query("galleries")
      .order("desc")
      .collect();
    return galleries;
  },
});

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const galleries = await ctx.db
      .query("galleries")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();
    return galleries;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const gallery = await ctx.db
      .query("galleries")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    return gallery;
  },
});

export const getImages = query({
  args: { galleryId: v.id("galleries") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gallery_images")
      .withIndex("by_gallery_sort", (q) => q.eq("gallery_id", args.galleryId))
      .order("asc")
      .collect();
  },
});

export const getBySlugWithImages = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const gallery = await ctx.db
      .query("galleries")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    
    if (!gallery) return null;

    const images = await ctx.db
      .query("gallery_images")
      .withIndex("by_gallery_sort", (q) => q.eq("gallery_id", gallery._id))
      .order("asc")
      .collect();

    return { ...gallery, images };
  },
});

// ============ MUTATIONS ============

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    index_image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    // Slugs are public URLs, so enforce uniqueness before creating a draft.
    const existing = await ctx.db
      .query("galleries")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) {
      throw new Error("A gallery with this slug already exists");
    }

    const now = Date.now();
    const id = await ctx.db.insert("galleries", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      index_image: args.index_image,
      status: "draft",
      created_at: now,
      updated_at: now,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("galleries"),
    name: v.string(),
    description: v.optional(v.string()),
    index_image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const gallery = await ctx.db.get(args.id);
    if (!gallery) throw new Error("Gallery not found");
    await ctx.db.patch(args.id, {
      name: args.name,
      description: args.description,
      index_image: args.index_image,
      updated_at: Date.now(),
    });
  },
});

export const publish = mutation({
  args: { id: v.id("galleries") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const gallery = await ctx.db.get(args.id);
    if (!gallery) throw new Error("Gallery not found");
    await ctx.db.patch(args.id, {
      status: "published",
      updated_at: Date.now(),
    });
  },
});

export const unpublish = mutation({
  args: { id: v.id("galleries") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const gallery = await ctx.db.get(args.id);
    if (!gallery) throw new Error("Gallery not found");
    await ctx.db.patch(args.id, {
      status: "draft",
      updated_at: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("galleries") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    // Remove child images first so the gallery delete cannot leave orphaned records.
    const images = await ctx.db
      .query("gallery_images")
      .withIndex("by_gallery_sort", (q) => q.eq("gallery_id", args.id))
      .collect();
    
    for (const image of images) {
      await ctx.db.delete(image._id);
    }

    await ctx.db.delete(args.id);
  },
});

// ============ IMAGE MUTATIONS ============

export const addImage = mutation({
  args: {
    gallery_id: v.id("galleries"),
    name: v.string(),
    description: v.optional(v.string()),
    image_url: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    // Append after the highest existing sort order to preserve the current sequence.
    const lastImage = await ctx.db
      .query("gallery_images")
      .withIndex("by_gallery_sort", (q) => q.eq("gallery_id", args.gallery_id))
      .order("desc")
      .first();
    const maxOrder = lastImage ? lastImage.sort_order : -1;

    const id = await ctx.db.insert("gallery_images", {
      gallery_id: args.gallery_id,
      name: args.name,
      description: args.description,
      image_url: args.image_url,
      sort_order: maxOrder + 1,
      created_at: Date.now(),
    });
    return id;
  },
});

export const removeImage = mutation({
  args: { id: v.id("gallery_images") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
  },
});

export const updateImageOrder = mutation({
  args: {
    id: v.id("gallery_images"),
    sort_order: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.patch(args.id, {
      sort_order: args.sort_order,
    });
  },
});
