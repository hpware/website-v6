import { ConvexError } from "convex/values";
import { ADMIN_API_SECRET } from "astro:env/server";

/** The secret admin-only Convex functions expect (see convex/adminAuth.ts). */
export function adminSecret() {
    if (!ADMIN_API_SECRET) throw new Error("ADMIN_API_SECRET is not set.");
    return ADMIN_API_SECRET;
}

/** A readable message for errors thrown by Convex functions or our own checks. */
export function errorMessage(error: unknown) {
    if (error instanceof ConvexError && typeof error.data === "string") {
        return error.data;
    }
    return error instanceof Error ? error.message : String(error);
}

/** Formats created_at / updated_at, which are timestamps or legacy date strings. */
export function formatDate(value: number | string | undefined) {
    if (value === undefined) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
}

/** A trimmed text field from a submitted form ("" if missing). */
export function text(form: FormData, name: string) {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
}

/** Like text(), but undefined when empty (for optional Convex fields). */
export function optionalText(form: FormData, name: string) {
    return text(form, name) || undefined;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function requireSlug(slug: string) {
    if (!SLUG.test(slug)) {
        throw new Error("Slugs can only use lowercase letters, numbers and dashes.");
    }
    return slug;
}

export function requireHttpUrl(value: string, label: string) {
    try {
        const { protocol } = new URL(value);
        if (protocol === "http:" || protocol === "https:") return value;
    } catch {
        // fall through to the error below
    }
    throw new Error(`${label} must be an http(s) URL.`);
}
