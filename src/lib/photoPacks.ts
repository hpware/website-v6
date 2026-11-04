// Photo packs live outside this repo. Point PHOTO_PACKS_URL at any JSON file
// shaped like `PhotoPacksFeed` (a gist, R2/S3 bucket, CMS endpoint, ...).
// See photo-packs.example.json in the repo root. Without it, no packs are shown.

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
    if (!url) return [];

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

export async function getPhotoPack(id: string): Promise<PhotoPack | undefined> {
    return (await getPhotoPacks()).find((pack) => pack.id === id);
}
