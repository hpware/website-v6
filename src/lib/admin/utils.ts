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

// Admin dates are shown in the owner's timezone (Asia/Taipei), not UTC — a
// UTC ISO date would read as "yesterday" for anything before 08:00 local.
// "en-CA" formats as YYYY-MM-DD.
const ADMIN_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" });

/** Formats created_at / updated_at, which are timestamps or legacy date strings. */
export function formatDate(value: number | string | undefined) {
    if (value === undefined) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : ADMIN_DATE.format(date);
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
