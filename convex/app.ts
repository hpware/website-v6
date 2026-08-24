import { v } from "convex/values";
import { query } from "./_generated/server";

export const listMDContent = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("mdcontent").collect();
  },
});

export const getMDContent = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const content = await ctx.db
      .query("mdcontent")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .take(1);
    return content;
  },
});
