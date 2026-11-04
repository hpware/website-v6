// Self-hosted S3-compatible storage for admin uploads. The server only signs
// requests; files go straight from the browser to the bucket, never through Vercel.
import {
    DeleteObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
    S3_ACCESS_KEY_ID,
    S3_BUCKET,
    S3_ENDPOINT,
    S3_PUBLIC_URL,
    S3_REGION,
    S3_SECRET_ACCESS_KEY,
} from "astro:env/server";

const UPLOAD_URL_TTL_SECONDS = 10 * 60;

export const missingS3Env = Object.entries({
    S3_ENDPOINT,
    S3_BUCKET,
    S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY,
    S3_PUBLIC_URL,
})
    .filter(([, value]) => !value)
    .map(([name]) => name);

let client: S3Client | undefined;

function s3() {
    if (missingS3Env.length > 0) {
        throw new Error(`S3 isn't configured. Missing env: ${missingS3Env.join(", ")}`);
    }
    client ??= new S3Client({
        endpoint: S3_ENDPOINT,
        region: S3_REGION,
        // Self-hosted servers usually don't do bucket.domain style addressing.
        forcePathStyle: true,
        credentials: {
            accessKeyId: S3_ACCESS_KEY_ID ?? "",
            secretAccessKey: S3_SECRET_ACCESS_KEY ?? "",
        },
    });
    return client;
}

/** Where the public can load an object from. */
export function publicUrl(key: string) {
    const base = (S3_PUBLIC_URL ?? "").replace(/\/+$/, "");
    return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** "My Photo (1).JPG" → "my-photo-1.jpg", so keys stay URL friendly. */
function cleanFileName(name: string) {
    const dot = name.lastIndexOf(".");
    const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    const base = (dot > 0 ? name.slice(0, dot) : name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return `${base || "file"}${ext ? `.${ext}` : ""}`;
}

/** "photos/tokyo" → "photos/tokyo/", "" stays "" (bucket root). Rejects "..". */
export function cleanPrefix(prefix: string) {
    const parts = prefix.split("/").map((part) => part.trim()).filter(Boolean);
    if (parts.some((part) => part === "." || part === "..")) {
        throw new Error("Folders can't contain . or ..");
    }
    return parts.length > 0 ? `${parts.join("/")}/` : "";
}

/** A presigned PUT the browser uploads one file with. */
export async function createUpload(prefix: string, fileName: string, contentType: string) {
    // The timestamp keeps re-uploads of the same file name from overwriting each other.
    const key = `${cleanPrefix(prefix)}${Date.now().toString(36)}-${cleanFileName(fileName)}`;
    const uploadUrl = await getSignedUrl(
        s3(),
        new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType }),
        { expiresIn: UPLOAD_URL_TTL_SECONDS },
    );
    return { key, uploadUrl, publicUrl: publicUrl(key) };
}

/** One "folder" level of the bucket: its subfolders and files. */
export async function listFolder(prefix: string) {
    const result = await s3().send(
        new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: prefix, Delimiter: "/" }),
    );
    return {
        folders: (result.CommonPrefixes ?? []).flatMap((entry) => (entry.Prefix ? [entry.Prefix] : [])),
        files: (result.Contents ?? []).flatMap((object) =>
            object.Key && object.Key !== prefix
                ? [{ key: object.Key, size: object.Size ?? 0, modified: object.LastModified }]
                : [],
        ),
        truncated: result.IsTruncated ?? false,
    };
}

export async function deleteObject(key: string) {
    await s3().send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}
