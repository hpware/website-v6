import type { CollectionEntry } from "astro:content";
import { getPublishedFoodPaths, markdownResponse } from "../../../../lib/content";

export async function getStaticPaths() {
    return getPublishedFoodPaths();
}

export function GET({ props }: { props: CollectionEntry<"food"> }) {
    return markdownResponse(props);
}
