import { defineMiddleware } from "astro:middleware";
import { negotiateMarkdown } from "./lib/markdown";

export const onRequest = defineMiddleware(async ({ request }, next) => {
    return negotiateMarkdown(request, await next());
});
