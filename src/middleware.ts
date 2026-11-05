import { defineMiddleware, sequence } from "astro:middleware";
import { isSignedIn, takeToast } from "./lib/admin/session";
import { negotiateMarkdown } from "./lib/markdown";

// Everything under /system-admin needs an admin session, except the login
// page and its passkey endpoints (/system-admin/login, /system-admin/api/login/*).
const systemAdmin = defineMiddleware(async (context, next) => {
    const { pathname } = context.url;
    if (!pathname.startsWith("/system-admin")) return next();

    const isLogin =
        pathname.startsWith("/system-admin/login") ||
        pathname.startsWith("/system-admin/api/login/");
    if (!isLogin && !isSignedIn(context.cookies)) {
        return pathname.startsWith("/system-admin/api/")
            ? Response.json({ error: "Unauthorized" }, { status: 401 })
            : context.redirect("/system-admin/login");
    }

    // Cookies have to be changed here: from the layout it would be too late, the response has started.
    if (context.request.method === "GET") context.locals.toast = takeToast(context.cookies);

    const response = await next();
    // Redirect responses have immutable headers; they don't need these anyway.
    if (response.status < 300 || response.status >= 400) {
        response.headers.set("X-Robots-Tag", "noindex, nofollow");
        response.headers.set("Cache-Control", "no-store");
    }
    return response;
});

const markdown = defineMiddleware(async ({ request }, next) => {
    return negotiateMarkdown(request, await next());
});

// Lets Vercel's CDN answer repeat visits instead of running the function each time,
// and refresh in the background. This has to be set here: headers set from inside a
// component are too late, the response has already started. Admin pages are safe
// because systemAdmin (which runs after this) replaces the header with no-store.
const cdnCache = defineMiddleware(async (context, next) => {
    const response = await next();
    const type = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (
        ["GET", "HEAD"].includes(context.request.method) &&
        response.status === 200 &&
        (type === "text/html" || type === "text/markdown") &&
        !response.headers.has("Cache-Control")
    ) {
        response.headers.set(
            "Cache-Control",
            "public, max-age=0, s-maxage=60, stale-while-revalidate=86400",
        );
    }
    return response;
});

export const onRequest = sequence(systemAdmin, cdnCache, markdown);
