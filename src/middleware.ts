import { defineMiddleware, sequence } from "astro:middleware";
import { isSignedIn } from "./lib/admin/session";
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

export const onRequest = sequence(systemAdmin, markdown);
