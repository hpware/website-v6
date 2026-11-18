import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./adminAuth";

// Slop account reports thrown from the public form at /slopblock/submit (via
// the site's /api/slopblock/report). Admins review them in
// /system-admin/slopblock and list accepted accounts in
// src/data/slopblock/ig.txt, which is served at /slopblock/ig.txt for AI
// agents to fetch and block.

const INSTAGRAM_HANDLE = /^[a-z0-9._]{1,30}$/;
const MAX_REASON = 500;

export const create = mutation({
  args: {
    // The site's server is the only caller (it holds ADMIN_API_SECRET), so
    // direct public Convex calls can't write reports.
    secret: v.string(),
    platform: v.string(),
    handle: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);

    // The site's API route validates and localizes errors for humans; these
    // checks are the defensive server-side backstop.
    const handle = args.handle.trim().replace(/^@+/, "").toLowerCase();
    // One line per account in src/data/slopblock/ig.txt, so reasons must be single-line.
    const reason = args.reason.trim().replace(/\s+/g, " ");
    if (args.platform !== "ig" || !INSTAGRAM_HANDLE.test(handle)) {
      throw new ConvexError("Invalid slop report.");
    }
    if (!reason || reason.length > MAX_REASON) {
      throw new ConvexError("Invalid reason.");
    }

    // Skip reports that are already waiting for review with the same reason.
    // The filter runs on the index's platform/handle/pending range and stops
    // at the first match, so the queue is never fully collected.
    const existing = await ctx.db
      .query("slop_reports")
      .withIndex("by_platform_handle_status", (q) =>
        q.eq("platform", "ig").eq("handle", handle).eq("status", "pending"),
      )
      .filter((q) => q.eq(q.field("reason"), reason))
      .first();
    if (existing) {
      return { duplicate: true };
    }

    await ctx.db.insert("slop_reports", {
      platform: "ig",
      handle,
      reason,
      status: "pending",
      created_at: Date.now(),
    });
    return { created: true };
  },
});

export const list = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    // Bounded and newest-first per status, so pending reports can never be
    // crowded out by reviewed history, and Convex read/return limits can't
    // break the admin page as the table grows.
    const statuses = ["pending", "listed", "dismissed"] as const;
    const batches = await Promise.all(
      statuses.map((status) =>
        ctx.db
          .query("slop_reports")
          .withIndex("by_platform_status", (q) =>
            q.eq("platform", "ig").eq("status", status),
          )
          .order("desc")
          .take(200),
      ),
    );
    return batches.flat();
  },
});

// "listed" = added to src/data/slopblock/ig.txt; "dismissed" = rejected.
// Only the first moderation decision counts: a report already reviewed in
// another tab can't be settled again.
export const settle = mutation({
  args: {
    secret: v.string(),
    id: v.id("slop_reports"),
    status: v.union(v.literal("listed"), v.literal("dismissed")),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    const report = await ctx.db.get(args.id);
    if (!report) {
      throw new ConvexError("Report not found.");
    }
    if (report.status !== "pending") {
      throw new ConvexError("Report was already reviewed.");
    }
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.status === "listed"
        ? { listed_at: Date.now() }
        : {}),
    });
  },
});

// Public: when each listed account was listed, for the dates shown on
// /slopblock/. Only handles and dates — no report details.
export const listedDates = query({
  args: {},
  handler: async (ctx) => {
    const reports = await ctx.db
      .query("slop_reports")
      .withIndex("by_platform_status", (q) =>
        q.eq("platform", "ig").eq("status", "listed"),
      )
      .collect();
    const dated: { handle: string; listed_at: number }[] = [];
    for (const report of reports) {
      if (report.listed_at !== undefined) {
        dated.push({ handle: report.handle, listed_at: report.listed_at });
      }
    }
    return dated;
  },
});
