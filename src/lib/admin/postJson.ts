// Browser helper for the admin passkey endpoints: POST JSON, throw their error message.
export async function postJson<T>(url: string, body?: unknown): Promise<T> {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data: T & { error?: string } = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Request failed.");
    return data;
}

/** Closing the browser's passkey prompt throws NotAllowedError; that's not worth showing. */
export function isCancelled(error: unknown) {
    return error instanceof Error && error.name === "NotAllowedError";
}
