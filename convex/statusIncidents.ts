import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./adminAuth";

// Incidents for the home lab status page (/hl/status/). Kener and
// Beszel only say what's up or down; the story of an outage is written here
// from /system-admin/status, and can link to a blog post with the write-up.

const incidentStatus = v.union(
  v.literal("investigating"),
  v.literal("identified"),
  v.literal("monitoring"),
  v.literal("resolved"),
);
const impact = v.union(v.literal("minor"), v.literal("major"), v.literal("maintenance"));

const MAX_TITLE = 200;
const MAX_MESSAGE = 5000;
const SLUG = /^[a-z0-9][a-z0-9/_-]*$/i;

function cleanTitle(title: string) {
  const cleaned = title.trim();
  if (!cleaned || cleaned.length > MAX_TITLE) throw new ConvexError("The title is empty or too long.");
  return cleaned;
}

function cleanMessage(message: string) {
  const cleaned = message.trim();
  if (!cleaned || cleaned.length > MAX_MESSAGE) throw new ConvexError("The message is empty or too long.");
  return cleaned;
}

function cleanSlug(slug: string | undefined) {
  const cleaned = slug?.trim();
  if (!cleaned) return undefined;
  if (!SLUG.test(cleaned)) throw new ConvexError("That isn't a post slug.");
  return cleaned;
}

/** The newest incidents, for the public page and the admin panel. */
export const recent = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("status_incidents").withIndex("by_created").order("desc").take(50);
  },
});

export const create = mutation({
  args: {
    secret: v.string(),
    title: v.string(),
    impact,
    status: incidentStatus,
    message: v.string(),
    post_slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    const now = Date.now();
    return await ctx.db.insert("status_incidents", {
      title: cleanTitle(args.title),
      impact: args.impact,
      status: args.status,
      updates: [{ status: args.status, message: cleanMessage(args.message), at: now }],
      post_slug: cleanSlug(args.post_slug),
      created_at: now,
      resolved_at: args.status === "resolved" ? now : undefined,
    });
  },
});

/** Posts a new update; its status becomes the incident's status. */
export const addUpdate = mutation({
  args: {
    secret: v.string(),
    id: v.id("status_incidents"),
    status: incidentStatus,
    message: v.string(),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    const incident = await ctx.db.get(args.id);
    if (!incident) throw new ConvexError("Incident not found.");
    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: args.status,
      updates: [...incident.updates, { status: args.status, message: cleanMessage(args.message), at: now }],
      resolved_at: args.status === "resolved" ? (incident.resolved_at ?? now) : undefined,
    });
  },
});

export const edit = mutation({
  args: {
    secret: v.string(),
    id: v.id("status_incidents"),
    title: v.string(),
    impact,
    post_slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    if (!(await ctx.db.get(args.id))) throw new ConvexError("Incident not found.");
    await ctx.db.patch(args.id, {
      title: cleanTitle(args.title),
      impact: args.impact,
      post_slug: cleanSlug(args.post_slug),
    });
  },
});

export const remove = mutation({
  args: { secret: v.string(), id: v.id("status_incidents") },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    await ctx.db.delete(args.id);
  },
});
