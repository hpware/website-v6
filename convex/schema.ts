import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  blog: defineTable({
    title: v.string(),
    slug: v.string(),
    markdown_content: v.string(),
    writer: v.union(
      v.object({
        name: v.string(),
        id: v.optional(v.string()),
      }),
      v.array(v.string()) // Legacy format from PostgreSQL
    ),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    created_at: v.union(v.number(), v.string()), // Can be number (new) or string (legacy from PostgreSQL)
    updated_at: v.union(v.number(), v.string()), // Can be number (new) or string (legacy from PostgreSQL)
    uuid: v.optional(v.string()), // Legacy field from PostgreSQL migration
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  pages: defineTable({
    slug: v.string(),
    title: v.string(),
    writer: v.union(v.string(), v.array(v.string())), // Can be string (new) or array (legacy from PostgreSQL)
    page_type: v.union(v.literal("landing"), v.literal("simple"), v.literal("info")),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    markdown_content: v.string(),
    landing_image: v.optional(v.string()),
    created_at: v.union(v.number(), v.string()), // Can be number (new) or string (legacy from PostgreSQL)
    updated_at: v.union(v.number(), v.string()), // Can be number (new) or string (legacy from PostgreSQL)
    uuid: v.optional(v.string()), // Legacy field from PostgreSQL migration
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  galleries: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    index_image: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    created_at: v.union(v.number(), v.string()), // Can be number (new) or string (legacy from PostgreSQL)
    updated_at: v.union(v.number(), v.string()), // Can be number (new) or string (legacy from PostgreSQL)
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  gallery_images: defineTable({
    gallery_id: v.union(v.id("galleries"), v.string()), // Can be Convex ID or legacy string ID
    name: v.string(),
    description: v.optional(v.string()),
    image_url: v.string(),
    sort_order: v.number(),
    created_at: v.union(v.number(), v.string()), // Can be number (new) or string (legacy from PostgreSQL)
  })
    .index("by_gallery_sort", ["gallery_id", "sort_order"]),

  mdcontent: defineTable({
    slug: v.string(),
    content: v.string(),
    uuid: v.optional(v.string()), // Legacy field from PostgreSQL migration
  }).index("by_slug", ["slug"]),

  comments: defineTable({
    article_id: v.string(),
    clerk_user: v.string(),
    comment: v.string(),
    parent_id: v.optional(v.id("comments")),
    created_at: v.number(),
  })
    .index("by_article", ["article_id"])
    .index("by_parent", ["parent_id"]),

  todos: defineTable({
    title: v.string(),
    content: v.string(),
    created_at: v.number(),
  }),
});
