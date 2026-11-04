import { ConvexError, v } from "convex/values";
import { query, mutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireAdmin } from "./adminAuth";

const pageType = v.union(v.literal("landing"), v.literal("simple"), v.literal("info"));

function findBySlug(ctx: QueryCtx, slug: string) {
  return ctx.db
    .query("pages")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
}

/** Mutations need the admin secret and an existing page. */
async function requirePage(ctx: MutationCtx, secret: string, slug: string) {
  requireAdmin(secret);
  const page = await findBySlug(ctx, slug);
  if (!page) throw new ConvexError("Page not found");
  return page;
}

// ============ QUERIES ============

export const list = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("pages").order("desc").collect(),
});

export const listPublished = query({
  args: {},
  handler: async (ctx) =>
    await ctx.db
      .query("pages")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect(),
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => await findBySlug(ctx, args.slug),
});

export const getPublishedBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await findBySlug(ctx, args.slug);
    return page?.status === "published" ? page : null;
  },
});

/** What the public site can show: published pages, plus archived ones (rendered with a banner). */
export const getPublicBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await findBySlug(ctx, args.slug);
    return page && page.status !== "draft" ? page : null;
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("pages").collect();
    return {
      total: all.length,
      published: all.filter((p) => p.status === "published").length,
      drafts: all.filter((p) => p.status === "draft").length,
      archived: all.filter((p) => p.status === "archived").length,
    };
  },
});

// ============ MUTATIONS ============

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    page_type: pageType,
    markdown_content: v.string(),
    landing_image: v.optional(v.string()),
    writer: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, { secret, ...args }) => {
    requireAdmin(secret);
    // Slugs are public URLs, so enforce uniqueness before creating a draft.
    if (await findBySlug(ctx, args.slug)) {
      throw new ConvexError("A page with this slug already exists");
    }

    const now = Date.now();
    return await ctx.db.insert("pages", {
      ...args,
      status: "draft",
      created_at: now,
      updated_at: now,
    });
  },
});

export const update = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
    page_type: pageType,
    markdown_content: v.string(),
    landing_image: v.optional(v.string()),
    secret: v.string(),
  },
  handler: async (ctx, { slug, secret, ...fields }) => {
    const page = await requirePage(ctx, secret, slug);
    await ctx.db.patch(page._id, { ...fields, updated_at: Date.now() });
  },
});

export const publish = mutation({
  args: { slug: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    const page = await requirePage(ctx, args.secret, args.slug);
    await ctx.db.patch(page._id, { status: "published", updated_at: Date.now() });
  },
});

export const unpublish = mutation({
  args: { slug: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    const page = await requirePage(ctx, args.secret, args.slug);
    await ctx.db.patch(page._id, { status: "draft", updated_at: Date.now() });
  },
});

/** Keeps the page online but marks it as no longer maintained. */
export const archive = mutation({
  args: { slug: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    const page = await requirePage(ctx, args.secret, args.slug);
    await ctx.db.patch(page._id, { status: "archived", updated_at: Date.now() });
  },
});

export const remove = mutation({
  args: { slug: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    const page = await requirePage(ctx, args.secret, args.slug);
    await ctx.db.delete(page._id);
  },
});
