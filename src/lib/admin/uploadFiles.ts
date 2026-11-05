// Browser helper: asks the server to sign uploads, then PUTs each file straight to S3.
import { postJson } from "./postJson";

export type Uploaded = { key: string; publicUrl: string; name: string };

type SignedUpload = { key: string; uploadUrl: string; publicUrl: string };

// Enough for sharp fullscreen viewing; the site shows photos at 1600px at most.
const MAX_IMAGE_EDGE = 2560;
const SHRINK_QUALITY = 0.85;

function isHeic(file: File) {
    return /^image\/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

/** Most browsers can't show HEIC and sharp can't read it, so upload a JPEG instead. */
async function heicToJpeg(file: File) {
    // Only loaded when needed, the converter is about 3 MB.
    const { heicTo } = await import("heic-to");
    const jpeg = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 }).catch(() => {
        throw new Error(`Couldn't convert ${file.name} to JPEG.`);
    });
    return new File([jpeg], renamed(file.name, "image/jpeg"), { type: "image/jpeg" });
}

function renamed(name: string, type: string) {
    const extension = type.split("/")[1].replace("jpeg", "jpg");
    return `${name.replace(/\.[^.]*$/, "")}.${extension}`;
}

/** Shrinks a photo in the browser. Anything it can't make smaller is returned as is. */
async function shrinkImage(file: File) {
    // PNG and WebP can have transparency, which JPEG would turn black.
    const type = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;

    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext("2d");
        if (!context) return file;
        context.imageSmoothingQuality = "high";
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, SHRINK_QUALITY));
        if (!blob || blob.size >= file.size) return file;
        return new File([blob], renamed(file.name, blob.type), { type: blob.type });
    } catch {
        return file; // The browser can't decode it, so upload the original.
    }
}

export async function uploadFiles(
    selected: File[],
    prefix: string,
    onProgress?: (message: string) => void,
): Promise<Uploaded[]> {
    // One at a time, since decoding several large photos at once uses a lot of memory.
    const files: File[] = [];
    for (const [index, file] of selected.entries()) {
        onProgress?.(`Preparing ${index + 1} / ${selected.length}...`);
        files.push(await shrinkImage(isHeic(file) ? await heicToJpeg(file) : file));
    }

    const signed = await postJson<SignedUpload[]>("/system-admin/api/uploads", {
        prefix,
        files: files.map((file) => ({ name: file.name, type: file.type })),
    });

    let done = 0;
    onProgress?.(`Uploading ${done} / ${files.length}...`);
    return Promise.all(
        files.map(async (file, index) => {
            const upload = signed[index];
            const response = await fetch(upload.uploadUrl, {
                method: "PUT",
                // Must match the Content-Type the URL was signed with.
                headers: { "Content-Type": file.type || "application/octet-stream" },
                body: file,
            }).catch(() => null); // Blocked by CORS or the server is unreachable.
            if (!response?.ok) {
                throw new Error(`Uploading ${file.name} failed${response ? ` (${response.status})` : ""}. Is CORS set up on the bucket?`);
            }
            onProgress?.(`Uploading ${++done} / ${files.length}...`);
            return { key: upload.key, publicUrl: upload.publicUrl, name: file.name };
        }),
    );
}
