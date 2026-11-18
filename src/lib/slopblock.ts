// The slop blocklist: a plain-text list of accounts that mass-produce
// AI-generated slop. Other AI agents fetch /slopblock/ig.txt and block the
// accounts on it. The list itself lives in src/data/slopblock/ig.txt; humans
// report accounts at /slopblock/submit and admins review those reports in
// /system-admin/slopblock before an account gets listed.

import igList from "../data/slopblock/ig.txt?raw";

/** Platforms with a blocklist file. Served at /slopblock/<platform>.txt. */
export const SLOP_PLATFORMS = ["ig"] as const;
export type SlopPlatform = (typeof SLOP_PLATFORMS)[number];

export interface SlopEntry {
    handle: string;
    reason: string;
}

// "handle: reason" per line (also tolerates "handle — reason", "handle - reason"
// and a bare handle). # lines are comments. No dates here — the website shows
// them, tracked by the admin review flow in Convex (slop_reports.listed_at).
const ENTRY = /^@?([a-z0-9._]{1,30})(?:\s*[:：]\s*|\s+[—-]\s+)(.*)$/i;

const INSTAGRAM_HANDLE = /^[a-z0-9._]{1,30}$/;

/** Instagram username rules (after lowercasing and stripping the @). */
export function isInstagramHandle(handle: string): boolean {
    return INSTAGRAM_HANDLE.test(handle);
}

/** The report's reason is a video link — true for plain http(s) URLs. */
export const isHttpUrl = (value: string) => /^https?:\/\/\S+$/i.test(value);

/** One account per line: `handle: reason`. # lines are comments. */
export function parseSlopList(text: string): SlopEntry[] {
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
            const match = line.match(ENTRY);
            if (match) {
                return { handle: match[1].toLowerCase(), reason: match[2].trim() };
            }
            // A bare handle is a valid entry too.
            const handle = line.replace(/^@+/, "").toLowerCase();
            return isInstagramHandle(handle) ? { handle, reason: "" } : undefined;
        })
        .filter((entry): entry is SlopEntry => entry !== undefined);
}

/** The Instagram blocklist, parsed from src/data/slopblock/ig.txt. */
export const igSlopList = parseSlopList(igList);

export const INSTAGRAM_LIST_URL = "/slopblock/ig.txt";

export const instagramProfileUrl = (handle: string) =>
    `https://www.instagram.com/${handle}/`;

// Path segments that are never a profile link (instagram.com/p/...,
// /reel/..., /legal/privacy/, ...). Any other top-level path is a profile.
const NON_PROFILE_SEGMENTS = [
    "p",
    "reel",
    "reels",
    "stories",
    "explore",
    "accounts",
    "direct",
    "legal",
    "about",
    "developer",
    "directory",
    "topics",
    "web",
    "challenge",
    "session",
    "your_account",
    "emails",
    "invites",
    "help",
    "terms",
    "privacy",
    "press",
    "api",
    "lite",
];

/**
 * Extracts an Instagram username from whatever someone threw at the form:
 * "@user", "user", "https://instagram.com/user", "instagram.com/user/".
 * Returns "" when the input is a link that doesn't contain a username (a post
 * or reel link), so the caller can tell the user to paste the profile instead.
 */
export function extractInstagramHandle(input: string): string {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return "";
    try {
        const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
        if (/(^|\.)instagram\.com$/.test(url.hostname)) {
            const [first] = url.pathname.split("/").filter(Boolean);
            if (!first || NON_PROFILE_SEGMENTS.includes(first)) return "";
            return first.replace(/^@+/, "");
        }
    } catch {
        // Not a URL — treat the whole input as a handle.
    }
    return trimmed.replace(/^@+/, "").replace(/\/+$/, "");
}
