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

const messages = (locale: "en" | "zh-TW") => {
    const zh = locale === "zh-TW";
    return {
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
