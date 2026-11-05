import { getImage } from "astro:assets";

// Originals can be over 10 MB, so never show them directly. Width and height are
// both required here, otherwise Astro would download the photo during page render.
export async function coverUrl(src: string, size: number) {
    const image = await getImage({ src, width: size, height: size, fit: "cover", format: "webp" });
    return image.src;
}

/** Shrinks a photo to fit inside a size x size box, keeping its shape. */
export async function fitUrl(src: string, size: number) {
    const image = await getImage({ src, width: size, height: size, fit: "inside", format: "webp" });
    return image.src;
}
