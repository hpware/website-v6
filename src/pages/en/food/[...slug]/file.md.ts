import { getEntry } from "astro:content";
import { markdownResponse } from "../../../../lib/content";

export async function GET({ params }: { params: { slug?: string } }) {
    const entry = params.slug ? await getEntry("food", params.slug) : undefined;
    if (!entry || entry.data.status !== "published") {
        return new Response("Not found", { status: 404 });
    }
    return markdownResponse(entry);
}
