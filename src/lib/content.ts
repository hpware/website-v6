import { getCollection, type CollectionEntry } from "astro:content";

export async function getPublishedBlogPaths() {
    const posts = await getCollection(
        "blog",
        ({ data }) => data.status === "published",
    );

    return posts.map((post) => ({
        params: { slug: post.id },
        props: post,
    }));
}

export async function getPublishedFoodPaths() {
    const reviews = await getCollection(
        "food",
        ({ data }) => data.status === "published",
    );

    return reviews.map((review) => ({
        params: { slug: review.id },
        props: review,
    }));
}

type MarkdownEntry = CollectionEntry<"blog"> | CollectionEntry<"food">;

function markdownSource(entry: MarkdownEntry) {
    const fields = [
        `title: ${JSON.stringify(entry.data.title)}`,
        `description: ${JSON.stringify(entry.data.description)}`,
        `pubDate: ${entry.data.pubDate.toISOString()}`,
    ];

    if (entry.data.updatedDate) {
        fields.push(`updatedDate: ${entry.data.updatedDate.toISOString()}`);
    }
    if (entry.data.author) {
        fields.push(`author: ${JSON.stringify(entry.data.author)}`);
    }
    if (entry.collection === "food") {
        if (entry.data.rating !== undefined) {
            fields.push(`rating: ${entry.data.rating}`);
        }
        if (entry.data.priceRange) {
            fields.push(`priceRange: ${JSON.stringify(entry.data.priceRange)}`);
        }
        if (entry.data.location) {
            fields.push(`location: ${JSON.stringify(entry.data.location)}`);
        }
    }

    return `---\n${fields.join("\n")}\n---\n\n${entry.body ?? ""}`;
}

export function markdownResponse(entry: MarkdownEntry) {
    return new Response(markdownSource(entry), {
        headers: {
            "Cache-Control": "public, max-age=0, s-maxage=3600",
            "Content-Disposition": `inline; filename="${entry.id}.md"`,
            "Content-Type": "text/markdown; charset=utf-8",
        },
    });
}
