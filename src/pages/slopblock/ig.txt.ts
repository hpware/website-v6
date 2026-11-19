import type { APIRoute } from "astro";
import { formatSlopList, getIgSlopList } from "../../lib/slopblock";

export const prerender = false;

// The machine-readable slop blocklist for AI agents: the accounts approved in
// /system-admin/slopblock (Convex) plus the hand-written lines in
// src/data/slopblock/ig.txt. See src/lib/slopblock.ts for the format.
export const GET: APIRoute = async () => {
    const { entries, ok } = await getIgSlopList();
    return new Response(formatSlopList(entries), {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            // Short CDN cache so approvals show up within minutes. When Convex
            // is down, don't let the partial list stick around.
            "Cache-Control": ok
                ? "public, max-age=0, s-maxage=300, stale-while-revalidate=86400"
                : "no-store",
        },
    });
};
