// Photo packs are the published galleries in Convex (`galleries` +
// `gallery_images`), managed from the admin panel.
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { convex } from "./convex";

export type Photo = {
    src: string;
    /** Small version for the grid; src is used if there isn't one. */
    thumb?: string;
    alt?: string;
};

export type PhotoPack = {
    id: string;
    title: string;
    description?: string;
    metaDescription?: { zh: string; en: string };
    date?: string;
    cover?: string;
    photos: Photo[];
};

type GalleryWithImages = Doc<"galleries"> & {
    images: Doc<"gallery_images">[];
};

// created_at is a timestamp (new) or a date string (legacy PostgreSQL rows).
function formatDate(value: number | string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? undefined
        : date.toISOString().slice(0, 10);
}

// Galleries without images are skipped so they don't show up as empty albums.
function toPhotoPack(gallery: GalleryWithImages): PhotoPack | null {
    if (gallery.images.length === 0) return null;

    return {
        id: gallery.slug,
        title: gallery.name,
        description: gallery.description || undefined,
        metaDescription: gallery.meta_description,
        date: formatDate(gallery.created_at),
        cover: gallery.index_image || undefined,
        photos: gallery.images.map((image) => ({
            src: image.image_url,
            alt: image.name || undefined,
        })),
    };
}

export async function getPhotoPacks(): Promise<PhotoPack[]> {
    const galleries = await convex.query(
        api.galleries.listPublishedWithImages,
        {},
    );
    return galleries
        .map(toPhotoPack)
        .filter((pack): pack is PhotoPack => pack !== null);
}

export async function getPhotoPack(slug: string): Promise<PhotoPack | null> {
    const gallery = await convex.query(api.galleries.getBySlugWithImages, {
        slug,
    });
    if (!gallery || gallery.status !== "published") return null;
    return toPhotoPack(gallery);
}
