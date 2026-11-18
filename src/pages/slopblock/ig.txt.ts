import type { APIRoute } from "astro";
import igList from "../../data/slopblock/ig.txt?raw";

export const prerender = false;

// The machine-readable slop blocklist for AI agents, served straight from
// src/data/slopblock/ig.txt (see src/lib/slopblock.ts for the format).
export const GET: APIRoute = async () =>
    new Response(igList, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=0, s-maxage=3600",
        },
    });
