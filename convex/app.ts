import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

export const getMDContent = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const content = await ctx.db
      .query("mdcontent")
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .collect();
    return content;
  },
});
