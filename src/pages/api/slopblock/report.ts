import type { APIRoute } from "astro";
import { api } from "../../../../convex/_generated/api";
import { convex } from "../../../lib/convex";
import { adminSecret } from "../../../lib/admin/utils";
import { isSignedIn } from "../../../lib/admin/session";
import {
    cleanVideoUrl,
    isInstagramMediaLink,
    lookupInstagramOwner,
    parseInstagramInput,
} from "../../../lib/slopblock";

export const prerender = false;

// POST /api/slopblock/report  { handle?, reason, locale? }
// The public form at /slopblock/submit throws reports here. They wait in the
// admin panel (/system-admin/slopblock) until an admin approves them, which
// puts them on /slopblock/ and /slopblock/ig.txt right away.
//
// - The account is optional when the video link names it: it's taken from the
//   link (instagram.com/user/reel/…) or looked up from the reel's preview tags.
// - Video links lose share/tracking params (Instagram's igsh= identifies the
//   person who shared the link) before they're stored.
// - A signed-in admin skips the queue: the account is listed immediately.

const MAX_REASON = 500;

// Best-effort anonymous throttle: at most MAX_PER_WINDOW reports per IP per
// minute, roomy enough to report reel after reel with the share-sheet
// shortcut. Vercel serverless instances don't share memory, so this is
// friction rather than a hard quota — combined with the exact-duplicate suppression in
// Convex it bounds what a caller can do to the moderation queue.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
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
        notUsername: zh
            ? "這看起來不是 Instagram 使用者名稱或個檔連結。"
            : "That doesn't look like an Instagram username or profile link.",
        noOwner: zh
            ? "從這個影片連結看不出是哪個帳號發的，請在帳號欄填上使用者名稱。"
            : "Couldn't tell which account posted that video — type its username in the account field.",
        notVideo: zh
            ? "這看起來不是影片連結，連結要以 http:// 或 https:// 開頭。"
            : "That doesn't look like a video link — it should start with http:// or https://.",
        noVideo: zh ? "請貼上 slop 影片的連結。" : "Please paste a link to the slop video.",
        longVideo: zh
            ? `連結太長了，請控制在 ${MAX_REASON} 字以內。`
            : `The link is too long (max ${MAX_REASON} characters).`,
        generic: zh ? "回報失敗，請稍後再試。" : "The report failed. Please try again later.",
    };
};

const badRequest = (error: string) =>
    Response.json({ error }, { status: 400, headers: { "Cache-Control": "no-store" } });

export const POST: APIRoute = async ({ request, cookies }) => {
    const body = await request.json().catch(() => ({}));
    const locale = body?.locale === "zh-TW" ? "zh-TW" : "en";
    const text = messages(locale);
    const admin = isSignedIn(cookies);

    // Before any validation or Convex work, so over-quota requests only cost
    // the JSON parse above. Admins aren't throttled.
    if (!admin && rateLimited(request)) {
        return Response.json(
            { error: text.throttled },
            {
                status: 429,
                headers: { "Cache-Control": "no-store", "Retry-After": "60" },
            },
        );
    }

    let handleInput = typeof body?.handle === "string" ? body.handle.trim() : "";
    // The report's reason is a video link (e.g. the slop reel) — see
    // /slopblock/submit.
    let videoInput = typeof body?.reason === "string" ? body.reason.trim() : "";

    // Swapped fields: a reel link in the account field and nothing (or a
    // profile) in the video field.
    if (isInstagramMediaLink(handleInput) && !isInstagramMediaLink(videoInput)) {
        [handleInput, videoInput] = [videoInput, handleInput];
    }

    // Admins may list an account without a video link.
    if (!videoInput && !admin) return badRequest(text.noVideo);
    const video = videoInput ? cleanVideoUrl(videoInput) : "";
    if (videoInput && !video) return badRequest(text.notVideo);
    if (video.length > MAX_REASON) return badRequest(text.longVideo);

    let handle = "";
    if (handleInput) {
        const parsed = parseInstagramInput(handleInput);
        if (parsed.kind !== "handle") return badRequest(text.notUsername);
        handle = parsed.handle;
    } else if (video) {
        const parsed = parseInstagramInput(video);
        if (parsed.kind === "handle") handle = parsed.handle;
        else if (parsed.kind === "media") handle = await lookupInstagramOwner(parsed.url);
        if (!handle) return badRequest(text.noOwner);
    } else {
        return badRequest(text.notUsername);
    }

    try {
        const result = admin
            ? await convex.mutation(api.slopReports.addListed, {
                  secret: adminSecret(),
                  handle,
                  reason: video,
              })
            : await convex.mutation(api.slopReports.create, {
                  secret: adminSecret(),
                  platform: "ig",
                  handle,
                  reason: video,
              });
        return Response.json(
            { ok: true, handle, admin, ...result },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch {
        // The input was validated above, so this is unexpected (Convex down,
        // schema mismatch, ...) — keep the response generic.
        return Response.json({ error: text.generic }, { status: 500 });
    }
};
