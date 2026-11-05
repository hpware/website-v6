import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, mutation, type MutationCtx } from "./_generated/server";
import { requireAdmin } from "./adminAuth";

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

// Every gallery with the image to show for it, for the admin panel's list.
export const listWithCovers = query({
  args: {},
  handler: async (ctx) => {
    const galleries = await ctx.db.query("galleries").order("desc").collect();
    return await Promise.all(
      galleries.map(async (gallery) => {
        const firstImage = await ctx.db
          .query("gallery_images")
          .withIndex("by_gallery_sort", (q) => q.eq("gallery_id", gallery._id))
          .order("asc")
          .first();
        return { ...gallery, cover: gallery.index_image ?? firstImage?.image_url };
      }),
    );
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

// Published galleries with their images, for the public photo packs pages.
export const listPublishedWithImages = query({
  args: {},
  handler: async (ctx) => {
    const galleries = await ctx.db
      .query("galleries")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();

    return await Promise.all(
      galleries.map(async (gallery) => ({
        ...gallery,
        images: await ctx.db
          .query("gallery_images")
          .withIndex("by_gallery_sort", (q) => q.eq("gallery_id", gallery._id))
          .order("asc")
          .collect(),
      })),
    );
  },
});

// ============ MUTATIONS ============
// All of these need ADMIN_API_SECRET (see adminAuth.ts).

async function requireGallery(ctx: MutationCtx, secret: string, id: Id<"galleries">) {
  requireAdmin(secret);
  const gallery = await ctx.db.get(id);
  if (!gallery) throw new ConvexError("Gallery not found");
  return gallery;
}

function imagesOf(ctx: MutationCtx, galleryId: Id<"galleries">) {
  return ctx.db
    .query("gallery_images")
    .withIndex("by_gallery_sort", (q) => q.eq("gallery_id", galleryId))
    .order("asc")
    .collect();
}

export const create = mutation({
  args: {
    secret: v.string(),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    index_image: v.optional(v.string()),
  },
  handler: async (ctx, { secret, ...args }) => {
    requireAdmin(secret);
    // Slugs are public URLs, so enforce uniqueness before creating a draft.
    const existing = await ctx.db
      .query("galleries")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new ConvexError("A gallery with this slug already exists");

    const now = Date.now();
    return await ctx.db.insert("galleries", {
      ...args,
      status: "draft",
      created_at: now,
      updated_at: now,
    });
  },
});

export const update = mutation({
  args: {
    secret: v.string(),
    id: v.id("galleries"),
    name: v.string(),
    description: v.optional(v.string()),
    index_image: v.optional(v.string()),
  },
  handler: async (ctx, { secret, id, ...fields }) => {
    await requireGallery(ctx, secret, id);
    await ctx.db.patch(id, { ...fields, updated_at: Date.now() });
  },
});

export const setStatus = mutation({
  args: {
    secret: v.string(),
    id: v.id("galleries"),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    await requireGallery(ctx, args.secret, args.id);
    await ctx.db.patch(args.id, { status: args.status, updated_at: Date.now() });
  },
});

export const remove = mutation({
  args: { secret: v.string(), id: v.id("galleries") },
  handler: async (ctx, args) => {
    await requireGallery(ctx, args.secret, args.id);
    // Remove child images first so the gallery delete cannot leave orphaned records.
    for (const image of await imagesOf(ctx, args.id)) {
      await ctx.db.delete(image._id);
    }
    await ctx.db.delete(args.id);
  },
});

// ============ IMAGE MUTATIONS ============

export const addImage = mutation({
  args: {
    secret: v.string(),
    gallery_id: v.id("galleries"),
    name: v.string(),
    description: v.optional(v.string()),
    image_url: v.string(),
  },
  handler: async (ctx, { secret, ...args }) => {
    await requireGallery(ctx, secret, args.gallery_id);
    // Append after the highest existing sort order to preserve the current sequence.
    const images = await imagesOf(ctx, args.gallery_id);
    const maxOrder = images.length > 0 ? images[images.length - 1].sort_order : -1;

    return await ctx.db.insert("gallery_images", {
      ...args,
      sort_order: maxOrder + 1,
      created_at: Date.now(),
    });
  },
});

export const removeImage = mutation({
  args: { secret: v.string(), id: v.id("gallery_images") },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    await ctx.db.delete(args.id);
  },
});

/** Swaps an image with its neighbour (one transaction, so the order never ends up half-changed). */
export const moveImage = mutation({
  args: {
    secret: v.string(),
    id: v.id("gallery_images"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    const image = await ctx.db.get(args.id);
    if (!image) throw new ConvexError("Image not found");
    const galleryId = ctx.db.normalizeId("galleries", image.gallery_id);
    if (!galleryId) throw new ConvexError("Image belongs to a legacy gallery");

    const images = await imagesOf(ctx, galleryId);
    const index = images.findIndex((other) => other._id === image._id);
    const target = args.direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;
    [images[index], images[target]] = [images[target], images[index]];

    // Renumber 0..n-1 so gaps or duplicate sort_order values get cleaned up too.
    for (const [position, other] of images.entries()) {
      if (other.sort_order !== position) {
        await ctx.db.patch(other._id, { sort_order: position });
      }
    }
  },
});
