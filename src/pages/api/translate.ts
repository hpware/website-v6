import type { APIRoute } from "astro";
import { locales, type Locale } from "../../i18n";
import { errorMessage } from "../../lib/admin/utils";
import {
    getTranslation,
    startTranslation,
    translatableCollections,
    type TranslatableCollection,
} from "../../lib/translations";

// GET  /api/translate?collection=blog&slug=...&locale=en  → the translation (or its status)
// POST /api/translate  { collection, slug, locale }       → starts translating, then the same as GET

function parse(input: { collection?: unknown; slug?: unknown; locale?: unknown }) {
    const { collection, slug, locale } = input;
    if (
        !translatableCollections.includes(collection as TranslatableCollection) ||
        typeof slug !== "string" ||
        !locales.includes(locale as Locale)
    ) {
        return undefined;
    }
    return { collection: collection as TranslatableCollection, slug, locale: locale as Locale };
}

const badRequest = () => Response.json({ error: "Unknown post or language." }, { status: 400 });

export const GET: APIRoute = async ({ url }) => {
    const post = parse(Object.fromEntries(url.searchParams));
    if (!post) return badRequest();
    try {
        return Response.json(await getTranslation(post.collection, post.slug, post.locale), {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        return Response.json({ error: errorMessage(error) }, { status: 500 });
    }
};

export const POST: APIRoute = async ({ request }) => {
    const post = parse(await request.json().catch(() => ({})));
    if (!post) return badRequest();
    try {
        if (!(await startTranslation(post.collection, post.slug, post.locale))) return badRequest();
        return Response.json(await getTranslation(post.collection, post.slug, post.locale));
    } catch (error) {
        return Response.json({ error: errorMessage(error) }, { status: 500 });
    }
};
