import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAdmin } from "./adminAuth";
import { cleanReason, cleanVideoUrl } from "../src/lib/slopLinks";

// Slop account reports thrown from the public form at /slopblock/submit (via
// the site's /api/slopblock/report). Admins review them in
// /system-admin/slopblock. A "listed" report IS the listing: the site builds
// /slopblock/ and /slopblock/ig.txt from them (plus any hand-written lines in
// src/data/slopblock/ig.txt), so approving goes live without a deploy.

const INSTAGRAM_HANDLE = /^[a-z0-9._]{1,30}$/;
const MAX_REASON = 500;

async function isListed(ctx: QueryCtx | MutationCtx, handle: string) {
  const listed = await ctx.db
    .query("slop_reports")
    .withIndex("by_platform_handle_status", (q) =>
      q.eq("platform", "ig").eq("handle", handle).eq("status", "listed"),
    )
    .first();
  return listed !== null;
}

function normalizeHandle(handle: string) {
  const normalized = handle.trim().replace(/^@+/, "").toLowerCase();
  if (!INSTAGRAM_HANDLE.test(normalized)) {
    throw new ConvexError("Invalid Instagram username.");
  }
  return normalized;
}

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
    // One line per account in src/data/slopblock/ig.txt, so this must be a
    // single-line value; reports use a video link (the slop reel, ...) as the
    // reason. Share/tracking params (Instagram's igsh names the sharer's
    // account) are stripped here too, whatever the caller sent.
    const reason = cleanVideoUrl(args.reason);
    if (args.platform !== "ig" || !INSTAGRAM_HANDLE.test(handle)) {
      throw new ConvexError("Invalid slop report.");
    }
    if (!reason || reason.length > MAX_REASON) {
      throw new ConvexError("Invalid video link.");
    }
    if (await isListed(ctx, handle)) {
      return { alreadyListed: true };
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

// "listed" = on the public list right away; "dismissed" = rejected.
// Only the first moderation decision counts: a report already reviewed in
// another tab can't be settled again. Listing an account also lists its other
// pending reports, so duplicates don't need a click each.
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
    if (args.status === "dismissed") {
      await ctx.db.patch(args.id, { status: "dismissed" });
      return;
    }
    const now = Date.now();
    const pending = await ctx.db
      .query("slop_reports")
      .withIndex("by_platform_handle_status", (q) =>
        q.eq("platform", "ig").eq("handle", report.handle).eq("status", "pending"),
      )
      .take(100);
    for (const item of pending) {
      await ctx.db.patch(item._id, {
        status: "listed",
        listed_at: now,
        reason: cleanReason(item.reason),
      });
    }
  },
});

// Admin shortcut: list an account straight away, no report or review step.
// The video link is optional here.
export const addListed = mutation({
  args: { secret: v.string(), handle: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    const handle = normalizeHandle(args.handle);
    const raw = args.reason.trim();
    const reason = raw ? cleanVideoUrl(raw) : "";
    if (raw && (!reason || reason.length > MAX_REASON)) {
      throw new ConvexError("Invalid video link.");
    }
    if (await isListed(ctx, handle)) {
      return { alreadyListed: true };
    }
    const now = Date.now();
    await ctx.db.insert("slop_reports", {
      platform: "ig",
      handle,
      reason,
      status: "listed",
      listed_at: now,
      created_at: now,
    });
    // Anything still waiting for review on this account is settled too.
    const pending = await ctx.db
      .query("slop_reports")
      .withIndex("by_platform_handle_status", (q) =>
        q.eq("platform", "ig").eq("handle", handle).eq("status", "pending"),
      )
      .take(100);
    for (const item of pending) {
      await ctx.db.patch(item._id, { status: "listed", listed_at: now, reason: cleanReason(item.reason) });
    }
    return { created: true };
  },
});

// Takes an account off the list (its listed reports become dismissed).
export const unlist = mutation({
  args: { secret: v.string(), handle: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(args.secret);
    const handle = normalizeHandle(args.handle);
    const listed = await ctx.db
      .query("slop_reports")
      .withIndex("by_platform_handle_status", (q) =>
        q.eq("platform", "ig").eq("handle", handle).eq("status", "listed"),
      )
      .take(100);
    for (const item of listed) {
      await ctx.db.patch(item._id, { status: "dismissed" });
    }
    return { removed: listed.length };
  },
});

// Public: the listed accounts, one entry per handle (its first listing), oldest
// first. Reasons are video links with share/tracking params removed.
export const listed = query({
  args: {},
  handler: async (ctx) => {
    const reports = await ctx.db
      .query("slop_reports")
      .withIndex("by_platform_status", (q) =>
        q.eq("platform", "ig").eq("status", "listed"),
      )
      .collect();
    const byHandle = new Map<string, { handle: string; reason: string; listed_at: number }>();
    for (const report of reports) {
      const listed_at = report.listed_at ?? report.created_at;
      const current = byHandle.get(report.handle);
      if (!current || listed_at < current.listed_at) {
        byHandle.set(report.handle, {
          handle: report.handle,
          reason: cleanReason(report.reason || current?.reason || ""),
          listed_at,
        });
      } else if (!current.reason && report.reason) {
        current.reason = cleanReason(report.reason);
      }
    }
    return [...byHandle.values()].sort((a, b) => a.listed_at - b.listed_at);
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
