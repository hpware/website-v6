import type { APIRoute } from "astro";
import { preferredLocaleFromHeader } from "../i18n";

export const prerender = false;

const redirectToPreferredLocale: APIRoute = ({ request }) =>
    new Response(null, {
        status: 307,
        headers: {
            "Cache-Control": "private, no-store",
            Location: `/${preferredLocaleFromHeader(request.headers.get("accept-language"))}/`,
            Vary: "Accept-Language",
        },
    });

export const GET = redirectToPreferredLocale;
export const HEAD = redirectToPreferredLocale;
