import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listByArticle = query({
  args: { article_id: v.string() },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_article", (q) => q.eq("article_id", args.article_id))
      .order("desc")
      .collect();
    return comments;
  },
});

export const create = mutation({
  args: {
    article_id: v.string(),
    clerk_user: v.string(),
    comment: v.string(),
    parent_id: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("comments", {
      article_id: args.article_id,
      clerk_user: args.clerk_user,
      comment: args.comment,
      parent_id: args.parent_id,
      created_at: Date.now(),
    });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});