import type { APIRoute } from "astro";
import { api } from "../../../../convex/_generated/api";
import { convex } from "../../../lib/convex";
import { adminSecret } from "../../../lib/admin/utils";
import { extractInstagramHandle, isInstagramHandle } from "../../../lib/slopblock";

export const prerender = false;

// POST /api/slopblock/report  { handle, reason, locale? }
// The public form at /slopblock/submit throws reports here. They wait in the
// admin panel (/system-admin/slopblock) until an admin lists the account in
// src/data/slopblock/ig.txt (served at /slopblock/ig.txt).

const MAX_REASON = 500;

// Best-effort anonymous throttle: at most MAX_PER_WINDOW reports per IP per
// minute. Vercel serverless instances don't share memory, so this is friction
// rather than a hard quota — combined with the exact-duplicate suppression in
// Convex it bounds what a caller can do to the moderation queue.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;
const hits = new Map<string, number[]>();

function rateLimited(request: Request) {
    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown";
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
    // Rejected requests are not recorded, so a burst can't grow this IP's
    // array (and its per-request filter work) beyond MAX_PER_WINDOW.
    if (recent.length >= MAX_PER_WINDOW) return true;
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 10_000) {
        // Amortized cleanup, so IPs that never return don't pile up on a
        // long-lived instance. Entries hold at most MAX_PER_WINDOW timestamps.
        for (const [key, times] of hits) {
            if (now - times[times.length - 1] >= WINDOW_MS) hits.delete(key);
        }
    }
    return false;
}

const messages = (locale: "en" | "zh-TW") => {
    const zh = locale === "zh-TW";
    return {
        throttled: zh
            ? "回報太頻繁了，請一分鐘後再試。"
            : "Too many reports — try again in a minute.",
        postLink: zh
            ? "這個連結不是帳號的個檔，請貼帳號的個檔連結或 @使用者名稱。"
            : "That link doesn't point to an account — paste the account's profile link or @username.",
        notUsername: zh
            ? "這看起來不是 Instagram 使用者名稱。"
            : "That doesn't look like an Instagram username.",
        noReason: zh ? "請填寫理由。" : "Please include a reason.",
        longReason: zh
            ? `理由太長了，請控制在 ${MAX_REASON} 字以內。`
            : `The reason is too long (max ${MAX_REASON} characters).`,
        generic: zh ? "回報失敗，請稍後再試。" : "The report failed. Please try again later.",
    };
};

const badRequest = (error: string) =>
    Response.json({ error }, { status: 400, headers: { "Cache-Control": "no-store" } });

export const POST: APIRoute = async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const locale = body?.locale === "zh-TW" ? "zh-TW" : "en";
    const text = messages(locale);

    // Before any validation or Convex work, so over-quota requests only cost
    // the JSON parse above.
    if (rateLimited(request)) {
        return Response.json(
            { error: text.throttled },
            {
                status: 429,
                headers: { "Cache-Control": "no-store", "Retry-After": "60" },
            },
        );
    }

    const handleInput = typeof body?.handle === "string" ? body.handle : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    const handle = extractInstagramHandle(handleInput);

    if (!handle && /instagram\.com/i.test(handleInput)) {
        return badRequest(text.postLink);
    }
    if (!isInstagramHandle(handle)) return badRequest(text.notUsername);
    if (!reason) return badRequest(text.noReason);
    if (reason.length > MAX_REASON) return badRequest(text.longReason);

    try {
        const result = await convex.mutation(api.slopReports.create, {
            secret: adminSecret(),
            platform: "ig",
            handle,
            reason,
        });
        return Response.json(
            { ok: true, ...result },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch {
        // The input was validated above, so this is unexpected (Convex down,
        // schema mismatch, ...) — keep the response generic.
        return Response.json({ error: text.generic }, { status: 500 });
    }
};
