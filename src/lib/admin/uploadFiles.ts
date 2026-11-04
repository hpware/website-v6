// Browser helper: asks the server to sign uploads, then PUTs each file straight to S3.
import { postJson } from "./postJson";

export type Uploaded = { key: string; publicUrl: string; name: string };

type SignedUpload = { key: string; uploadUrl: string; publicUrl: string };

export async function uploadFiles(
    files: File[],
    prefix: string,
    onProgress?: (done: number, total: number) => void,
): Promise<Uploaded[]> {
    const signed = await postJson<SignedUpload[]>("/system-admin/api/uploads", {
        prefix,
        files: files.map((file) => ({ name: file.name, type: file.type })),
    });

    let done = 0;
    onProgress?.(done, files.length);
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
            onProgress?.(++done, files.length);
            return { key: upload.key, publicUrl: upload.publicUrl, name: file.name };
        }),
    );
}
