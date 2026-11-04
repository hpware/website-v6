import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { rehypeImageAttributes } from "./rehypeImageAttributes";

// Same pipeline as the blog's .md files (GFM, Shiki, heading ids), built once per server instance.
const processor = createMarkdownProcessor({ rehypePlugins: [rehypeImageAttributes] });

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"" };

/** Renders Markdown stored in the database to HTML, plus a plain-text excerpt for meta descriptions. */
export async function renderMarkdown(markdown: string) {
    const { code: html } = await (await processor).render(markdown);
    const excerpt = html
        .replace(/<(pre|style|script)[\s\S]*?<\/\1>/g, " ")
        .replace(/<\/(p|h\d|li|t[dh]|blockquote)>|<br\s*\/?>/g, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/&#(x?)([\da-f]+);/gi, (_, hex: string, code: string) => String.fromCodePoint(parseInt(code, hex ? 16 : 10)))
        .replace(/&(amp|lt|gt|quot);/g, (_, name: string) => ENTITIES[name] ?? "")
        .replace(/\s+/g, " ")
        .trim();
    return { html, excerpt };
}
