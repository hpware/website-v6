// Uses an AI model (through OpenRouter) to write a photo pack's meta description
// and the alt text of photos that don't have any. Only runs from the admin panel;
// the results are stored in Convex, so page views never call the model.
import { z } from "astro/zod";
import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "astro:env/server";
import sharp from "sharp";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { convex } from "../convex";
import { adminSecret } from "./utils";

const PHOTOS_PER_REQUEST = 10;
const MODEL_IMAGE_SIZE = 1024;

type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image_url"; image_url: { url: string } };

const completionSchema = z.object({
    choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});
const altsSchema = z.object({ alts: z.array(z.string()) });
const descriptionSchema = z.object({ zh: z.string(), en: z.string() });

async function ask<T>(
    schemaName: string,
    schema: z.ZodType<T>,
    instructions: string,
    content: (TextPart | ImagePart)[],
): Promise<T> {
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set.");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: [
                { role: "system", content: instructions },
                { role: "user", content },
            ],
            response_format: {
                type: "json_schema",
                json_schema: { name: schemaName, strict: true, schema: z.toJSONSchema(schema) },
            },
            // Only use providers that actually support the JSON format above.
            provider: { require_parameters: true },
        }),
        signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
        throw new Error(`OpenRouter returned ${response.status}: ${await response.text()}`);
    }

    const completion = completionSchema.parse(await response.json());
    return schema.parse(JSON.parse(completion.choices[0].message.content));
}

/** Originals can be over 10 MB, too big for model APIs, so send a small copy instead. */
async function toImagePart(url: string): Promise<ImagePart> {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Couldn't download ${url} (${response.status}).`);
    const small = await sharp(await response.arrayBuffer())
        .rotate() // Applies the EXIF orientation
        .resize(MODEL_IMAGE_SIZE, MODEL_IMAGE_SIZE, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer();
    return { type: "image_url", image_url: { url: `data:image/jpeg;base64,${small.toString("base64")}` } };
}

async function writeAlts(packName: string, images: Doc<"gallery_images">[]) {
    const photos = await Promise.all(images.map((image) => toImagePart(image.image_url)));
    const { alts } = await ask(
        "photo_alts",
        altsSchema,
        "Write alt text in Traditional Chinese as used in Taiwan for each photo, in the order given. " +
            "Describe what is visible in one short phrase under 60 characters. Don't guess at specifics you can't see. " +
            "Return exactly one alt per photo.",
        [
            { type: "text", text: `Photo album: ${packName}` },
            ...photos,
        ],
    );
    if (alts.length !== images.length) {
        throw new Error(`The model returned ${alts.length} alt texts for ${images.length} photos.`);
    }
    return images.map((image, index) => ({ id: image._id, name: alts[index].trim() }));
}

/** Generates and saves the pack's meta description, plus alt text for photos missing it. */
export async function generatePhotoMeta(
    pack: Doc<"galleries"> & { images: Doc<"gallery_images">[] },
) {
    if (pack.images.length === 0) throw new Error("Add some photos first.");

    const missing = pack.images.filter((image) => !image.name);
    const batches: Doc<"gallery_images">[][] = [];
    for (let start = 0; start < missing.length; start += PHOTOS_PER_REQUEST) {
        batches.push(missing.slice(start, start + PHOTOS_PER_REQUEST));
    }
    const image_names = (
        await Promise.all(batches.map((batch) => writeAlts(pack.name, batch)))
    ).flat();

    // The description only needs the alt text, so the photos aren't sent a second time.
    const newNames = new Map<Id<"gallery_images">, string>(
        image_names.map(({ id, name }) => [id, name]),
    );
    const meta_description = await ask(
        "photo_pack_description",
        descriptionSchema,
        "Write a meta description for a photo album on a personal website, using only the details given. " +
            "Return it in Traditional Chinese as used in Taiwan (zh) and natural English (en), each under 150 characters.",
        [
            {
                type: "text",
                text: JSON.stringify({
                    album: pack.name,
                    photos: pack.images.map((image) => newNames.get(image._id) ?? image.name),
                }),
            },
        ],
    );

    await convex.mutation(api.galleries.setGeneratedMeta, {
        secret: adminSecret(),
        id: pack._id,
        meta_description,
        image_names,
    });
}
