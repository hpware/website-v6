import type { APIRoute } from "astro";
import { createUpload } from "../../../lib/admin/s3";
import { errorMessage } from "../../../lib/admin/utils";

type UploadRequest = {
    prefix?: unknown;
    files?: unknown;
};

type FileInfo = { name: string; type: string };

function isFileInfo(value: unknown): value is FileInfo {
    if (typeof value !== "object" || value === null) return false;
    const file = value as Record<string, unknown>;
    return typeof file.name === "string" && typeof file.type === "string";
}

// Returns a presigned PUT URL per file; the browser then uploads to S3 directly.
export const POST: APIRoute = async ({ request }) => {
    try {
        const body: UploadRequest = await request.json();
        const prefix = typeof body.prefix === "string" ? body.prefix : "";
        if (!Array.isArray(body.files) || !body.files.every(isFileInfo)) {
            throw new Error("Expected files: [{ name, type }].");
        }
        const uploads = await Promise.all(
            body.files.map((file) =>
                createUpload(prefix, file.name, file.type || "application/octet-stream"),
            ),
        );
        return Response.json(uploads);
    } catch (error) {
        return Response.json({ error: errorMessage(error) }, { status: 400 });
    }
};
