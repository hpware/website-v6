// Photo packs live outside this repo. Point PHOTO_PACKS_URL at any JSON file
// shaped like `PhotoPacksFeed` (a gist, R2/S3 bucket, CMS endpoint, ...).
// Without it, the sample packs below are shown so the page still works.

export type Photo = {
    src: string;
    alt?: string;
};

export type PhotoPack = {
    id: string;
    title: string;
    description?: string;
    date?: string;
    cover?: string;
    photos: Photo[];
};

export type PhotoPacksFeed = {
    packs: PhotoPack[];
};

const samplePhoto = (seed: string, alt: string): Photo => ({
    src: `https://picsum.photos/seed/${seed}/900/650`,
    alt,
});

const samplePacks: PhotoPack[] = [
    {
        id: "sample-city",
        title: "City walks",
        description: "Sample pack. Set PHOTO_PACKS_URL to load real ones.",
        date: "2026-01-01",
        photos: ["city-1", "city-2", "city-3", "city-4", "city-5"].map(
            (seed) => samplePhoto(seed, "Sample city photo"),
        ),
    },
    {
        id: "sample-sea",
        title: "By the sea",
        description: "Sample pack.",
        date: "2025-08-12",
        photos: ["sea-1", "sea-2", "sea-3", "sea-4"].map((seed) =>
            samplePhoto(seed, "Sample sea photo"),
        ),
    },
    {
        id: "sample-food",
        title: "Snacks",
        description: "Sample pack.",
        date: "2025-03-20",
        photos: ["food-1", "food-2", "food-3", "food-4", "food-5", "food-6"].map(
            (seed) => samplePhoto(seed, "Sample food photo"),
        ),
    },
];

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function optionalString(value: unknown) {
    return typeof value === "string" ? value : undefined;
}

function parsePhoto(value: unknown): Photo | null {
    if (typeof value === "string") return { src: value };
    if (!isRecord(value) || typeof value.src !== "string") return null;
    return { src: value.src, alt: optionalString(value.alt) };
}

function parsePack(value: unknown): PhotoPack | null {
    if (!isRecord(value)) return null;
    if (typeof value.id !== "string" || typeof value.title !== "string") {
        return null;
    }
    const photos = (Array.isArray(value.photos) ? value.photos : [])
        .map(parsePhoto)
        .filter((photo): photo is Photo => photo !== null);
    if (photos.length === 0) return null;

    return {
        id: value.id,
        title: value.title,
        description: optionalString(value.description),
        date: optionalString(value.date),
        cover: optionalString(value.cover),
        photos,
    };
}

export async function getPhotoPacks(): Promise<PhotoPack[]> {
    const url = import.meta.env.PHOTO_PACKS_URL;
    if (!url) return samplePacks;

    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const feed: unknown = await response.json();
        const packs = isRecord(feed) && Array.isArray(feed.packs) ? feed.packs : [];
        return packs
            .map(parsePack)
            .filter((pack): pack is PhotoPack => pack !== null);
    } catch (error) {
        console.error("Failed to load photo packs:", error);
        return [];
    }
}
