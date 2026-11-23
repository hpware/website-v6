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
    meta_description: v.optional(v.object({ zh: v.string(), en: v.string() })), // AI generated
    // The background job writing it (see photoMeta.ts). Removed once it succeeds.
    meta_job: v.optional(
      v.object({
        status: v.union(v.literal("running"), v.literal("failed")),
        done: v.number(),
        total: v.number(),
        started_at: v.number(),
        error: v.optional(v.string()),
      }),
    ),
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

  // Passkeys that can sign in to the website's /admin (see convex/adminPasskeys.ts).
  admin_passkeys: defineTable({
    name: v.string(),
    credential_id: v.string(), // base64url
    public_key: v.string(), // base64url
    counter: v.number(),
    transports: v.optional(v.array(v.string())),
    created_at: v.number(),
    last_used_at: v.optional(v.number()),
  }).index("by_credential_id", ["credential_id"]),

  // AI translations of the blog posts / food reviews (src/content), made when a reader asks
  // for one (see convex/translations.ts). One per post and language.
  translations: defineTable({
    collection: v.union(v.literal("blog"), v.literal("food")),
    slug: v.string(),
    locale: v.union(v.literal("en"), v.literal("zh-TW")), // The language it's translated to
    source_hash: v.string(), // Of the post it was translated from, so edits make it stale
    status: v.union(v.literal("running"), v.literal("done"), v.literal("failed")),
    started_at: v.number(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    markdown: v.optional(v.string()),
    error: v.optional(v.string()),
  }).index("by_post", ["collection", "slug", "locale"]),

  // Slop account reports from the public form at /slopblock/submit (see
  // convex/slopReports.ts). "listed" reports are the live list, served at
  // /slopblock/ and /slopblock/ig.txt (with src/data/slopblock/ig.txt's
  // hand-written lines). Admins can also list an account directly.
  slop_reports: defineTable({
    platform: v.string(), // "ig" — more platforms when the list grows
    handle: v.string(),
    reason: v.string(),
    status: v.union(v.literal("pending"), v.literal("listed"), v.literal("dismissed")),
    // When it was marked "listed" — the date shown on /slopblock/.
    listed_at: v.optional(v.number()),
    created_at: v.number(),
  })
    .index("by_platform_handle_status", ["platform", "handle", "status"])
    .index("by_platform_status", ["platform", "status"]),

  // Incidents on the home lab status page at /hl/status/ (see
  // convex/statusIncidents.ts). Written from /system-admin/status; each one
  // can point at a blog post (src/content/blog) with the full write-up.
  status_incidents: defineTable({
    title: v.string(),
    impact: v.union(v.literal("minor"), v.literal("major"), v.literal("maintenance")),
    status: v.union(
      v.literal("investigating"),
      v.literal("identified"),
      v.literal("monitoring"),
      v.literal("resolved"),
    ),
    // Newest last. The first one is the opening message.
    updates: v.array(
      v.object({
        status: v.union(
          v.literal("investigating"),
          v.literal("identified"),
          v.literal("monitoring"),
          v.literal("resolved"),
        ),
        message: v.string(),
        at: v.number(),
      }),
    ),
    post_slug: v.optional(v.string()), // A src/content/blog slug
    created_at: v.number(),
    resolved_at: v.optional(v.number()),
  }).index("by_created", ["created_at"]),

  todos: defineTable({
    title: v.string(),
    content: v.string(),
    created_at: v.number(),
  }),
});
