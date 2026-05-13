import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ============ QUERIES ============

export const list = query({
  args: {},
  handler: async (ctx) => {
    const blogs = await ctx.db
      .query("blog")
      .order("desc")
      .collect();
    return blogs;
  },
});

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const blogs = await ctx.db
      .query("blog")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();
    return blogs;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const blog = await ctx.db
      .query("blog")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    return blog;
  },
});

export const getPublishedBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const blog = await ctx.db
      .query("blog")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (blog?.status !== "published") {
      return null;
    }
    return blog;
  },
});

export const getById = query({
  args: { id: v.id("blog") },
  handler: async (ctx, args) => await ctx.db.get(args.id),
});

export const getPublishedById = query({
  args: { id: v.id("blog") },
  handler: async (ctx, args) => {
    const blog = await ctx.db.get(args.id);
    if (blog?.status !== "published") {
      return null;
    }
    return blog;
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("blog").collect();
    const total = all.length;
    const published = all.filter((b) => b.status === "published").length;
    const drafts = all.filter((b) => b.status === "draft").length;
    return { total, published, drafts };
  },
});

export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const blogs = await ctx.db
      .query("blog")
      .order("desc")
      .take(args.limit ?? 5);
    return blogs;
  },
});

// ============ MUTATIONS ============

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    markdown_content: v.string(),
    writer: v.object({
      name: v.string(),
      id: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Slugs are public URLs, so enforce uniqueness before creating a draft.
    const existing = await ctx.db
      .query("blog")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) {
      throw new Error("A blog post with this slug already exists");
    }

    const now = Date.now();
    const id = await ctx.db.insert("blog", {
      title: args.title,
      slug: args.slug,
      markdown_content: args.markdown_content,
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
    markdown_content: v.string(),
  },
  handler: async (ctx, args) => {
    const blog = await ctx.db
      .query("blog")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!blog) {
      throw new Error("Blog post not found");
    }

    await ctx.db.patch(blog._id, {
      title: args.title,
      markdown_content: args.markdown_content,
      updated_at: Date.now(),
    });
  },
});

export const publish = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const blog = await ctx.db
      .query("blog")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!blog) {
      throw new Error("Blog post not found");
    }

    await ctx.db.patch(blog._id, {
      status: "published",
      updated_at: Date.now(),
    });
  },
});

export const unpublish = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const blog = await ctx.db
      .query("blog")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!blog) {
      throw new Error("Blog post not found");
    }

    await ctx.db.patch(blog._id, {
      status: "draft",
      updated_at: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const blog = await ctx.db
      .query("blog")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!blog) {
      throw new Error("Blog post not found");
    }

    await ctx.db.delete(blog._id);
  },
});
