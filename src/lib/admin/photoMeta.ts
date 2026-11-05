import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { convex } from "../convex";
import { fitUrl } from "../photoUrl";
import { adminSecret } from "./utils";

const MODEL_IMAGE_SIZE = 1024;

/** Starts the background job in convex/photoMeta.ts. `origin` is this site, since Convex has to download the resized photos. */
export async function startPhotoMeta(
    pack: Doc<"galleries"> & { images: Doc<"gallery_images">[] },
    origin: string,
) {
    if (pack.images.length === 0) throw new Error("Add some photos first.");

    const photos = await Promise.all(
        pack.images
            .filter((image) => !image.name)
            .map(async (image) => ({
                id: image._id,
                url: new URL(await fitUrl(image.image_url, MODEL_IMAGE_SIZE), origin).href,
            })),
    );
    await convex.mutation(api.photoMeta.start, { secret: adminSecret(), id: pack._id, photos });
}
