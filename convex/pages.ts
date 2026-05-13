import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ============ QUERIES ============

export const list = query({
  args: {},
  handler: async (ctx) => {
    const pages = await ctx.db
      .query("pages")
      .order("desc")
      .collect();
    return pages;
  },
});

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();
    return pages;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    return page;
  },
});

export const getPublishedBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (page?.status !== "published") {
      return null;
    }
    return page;
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("pages").collect();
    const total = all.length;
    const published = all.filter((p) => p.status === "published").length;
    const drafts = all.filter((p) => p.status === "draft").length;
    return { total, published, drafts };
  },
});

// ============ MUTATIONS ============

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    page_type: v.union(v.literal("landing"), v.literal("simple"), v.literal("info")),
    markdown_content: v.string(),
    landing_image: v.optional(v.string()),
    writer: v.string(),
  },
  handler: async (ctx, args) => {
    // Slugs are public URLs, so enforce uniqueness before creating a draft.
    const existing = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) {
      throw new Error("A page with this slug already exists");
    }

    const now = Date.now();
    const id = await ctx.db.insert("pages", {
      title: args.title,
      slug: args.slug,
      page_type: args.page_type,
      markdown_content: args.markdown_content,
      landing_image: args.landing_image,
      writer: args.writer,
      status: "draft",
      created_at: now,
      updated_at: now,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
    page_type: v.union(v.literal("landing"), v.literal("simple"), v.literal("info")),
    markdown_content: v.string(),
    landing_image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!page) {
      throw new Error("Page not found");
    }

    await ctx.db.patch(page._id, {
      title: args.title,
      page_type: args.page_type,
      markdown_content: args.markdown_content,
      landing_image: args.landing_image,
      updated_at: Date.now(),
    });
  },
});

export const publish = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!page) {
      throw new Error("Page not found");
    }

    await ctx.db.patch(page._id, {
      status: "published",
      updated_at: Date.now(),
    });
  },
});

export const unpublish = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!page) {
      throw new Error("Page not found");
    }

    await ctx.db.patch(page._id, {
      status: "draft",
      updated_at: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!page) {
      throw new Error("Page not found");
    }

    await ctx.db.delete(page._id);
  },
});
