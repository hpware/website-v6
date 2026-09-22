import type { CollectionEntry } from "astro:content";
import { getPublishedBlogPaths, markdownResponse } from "../../../../lib/content";

export async function getStaticPaths() {
    return getPublishedBlogPaths();
}

export function GET({ props }: { props: CollectionEntry<"blog"> }) {
    return markdownResponse(props);
}
