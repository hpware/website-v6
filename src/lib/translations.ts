// AI translations of the blog posts / food reviews, made and saved by convex/translations.ts.
// The browser asks for them through /api/translate (see ArticleTranslation.astro).
import { getEntry } from "astro:content";
import path from "node:path";
import { api } from "../../convex/_generated/api";
import type { Locale } from "../i18n";
import { adminSecret } from "./admin/utils";
import { convex } from "./convex";
import { renderMarkdown } from "./renderMarkdown";

export const translatableCollections = ["blog", "food"] as const;
export type TranslatableCollection = (typeof translatableCollections)[number];

export type TranslationResult =
    | { status: "none" | "running" | "failed" }
    | { status: "done"; title: string; html: string };

/** The language a post is mostly written in: Chinese if it has more Chinese characters than English words. */
export function postLocale(markdown: string): Locale {
    const text = markdown.replace(/```[\s\S]*?```|`[^`]*`|\]\([^)]*\)|https?:\/\/\S+/g, " ");
    const chinese = text.match(/\p{Script=Han}/gu)?.length ?? 0;
    const english = text.match(/[a-z]+/gi)?.length ?? 0;
    return chinese > english ? "zh-TW" : "en";
}

async function publishedPost(collection: TranslatableCollection, slug: string) {
    const post = await getEntry(collection, slug);
    return post?.data.status === "published" ? post : undefined;
}

/** Changes whenever the post does, so an old translation isn't shown for an edited post. */
async function sourceHash(title: string, description: string, markdown: string) {
    const bytes = new TextEncoder().encode(JSON.stringify([title, description, markdown]));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Buffer.from(digest).toString("hex");
}

/** Returns false if there's no such published post (or it's already in that language). */
export async function startTranslation(collection: TranslatableCollection, slug: string, locale: Locale) {
    const post = await publishedPost(collection, slug);
    const markdown = post?.body;
    if (!post || !markdown || postLocale(markdown) === locale) return false;

    const { title, description } = post.data;
    await convex.mutation(api.translations.start, {
        secret: adminSecret(),
        collection,
        slug,
        locale,
        title,
        description,
        markdown,
        source_hash: await sourceHash(title, description, markdown),
    });
    return true;
}

export async function getTranslation(
    collection: TranslatableCollection,
    slug: string,
    locale: Locale,
): Promise<TranslationResult> {
    const post = await publishedPost(collection, slug);
    if (!post?.body) return { status: "none" };
    const translation = await convex.query(api.translations.get, { collection, slug, locale });
    const { title, description } = post.data;
    if (!translation || translation.source_hash !== (await sourceHash(title, description, post.body))) {
        return { status: "none" };
    }
    if (translation.status !== "done" || !translation.markdown) {
        return { status: translation.status === "done" ? "failed" : translation.status };
    }

    const markdown = resolveLocalImages(translation.markdown, post.filePath);
    const { html } = await renderMarkdown(markdown);
    return { status: "done", title: translation.title ?? title, html };
}

// The posts' own images (`![](../../assets/x.jpg)`) are bundled by Astro, so their paths
// only work in the .md file. These are the URLs they end up at.
const assets = import.meta.glob<ImageMetadata>("/src/assets/**/*.{png,jpg,jpeg,webp,gif,avif,svg}", {
    eager: true,
    import: "default",
});

function resolveLocalImages(markdown: string, filePath: string | undefined) {
    if (!filePath) return markdown;
    return markdown.replace(/(!\[[^\]]*\]\()(\.{1,2}\/[^)\s]+)/g, (match, start: string, relative: string) => {
        const asset = assets[`/${path.posix.join(path.posix.dirname(filePath), relative)}`];
        return asset ? start + asset.src : match;
    });
}
