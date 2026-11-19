// The slop blocklist: accounts that mass-produce AI-generated slop. Other AI
// agents fetch /slopblock/ig.txt and block the accounts on it.
//
// The live list is the "listed" reports in Convex (convex/slopReports.ts):
// humans report at /slopblock/submit, an admin approves in
// /system-admin/slopblock (or adds an account directly), and it's live right
// away. src/data/slopblock/ig.txt holds the file's header plus any
// hand-written lines, which are merged in.

import { api } from "../../convex/_generated/api";
import igList from "../data/slopblock/ig.txt?raw";
import { convex } from "./convex";
import { cleanReason, isInstagramHandle } from "./slopLinks";

export {
    cleanReason,
    cleanVideoUrl,
    isInstagramHandle,
    isInstagramMediaLink,
    parseInstagramInput,
} from "./slopLinks";

/** Platforms with a blocklist file. Served at /slopblock/<platform>.txt. */
export const SLOP_PLATFORMS = ["ig"] as const;
export type SlopPlatform = (typeof SLOP_PLATFORMS)[number];

export interface SlopEntry {
    handle: string;
    reason: string;
    /** When an admin listed it (undefined for hand-written lines). */
    listedAt?: number;
    source: "convex" | "file";
}

// "handle: reason" per line (also tolerates "handle — reason", "handle - reason"
// and a bare handle). # lines are comments.
const ENTRY = /^@?([a-z0-9._]{1,30})(?:\s*[:：]\s*|\s+[—-]\s+)(.*)$/i;

/** The report's reason is a video link — true for plain http(s) URLs. */
export const isHttpUrl = (value: string) => /^https?:\/\/\S+$/i.test(value);

/** One account per line: `handle: reason`. # lines are comments. */
export function parseSlopList(text: string): { handle: string; reason: string }[] {
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
            const match = line.match(ENTRY);
            if (match) {
                return { handle: match[1].toLowerCase(), reason: cleanReason(match[2].trim()) };
            }
            // A bare handle is a valid entry too.
            const handle = line.replace(/^@+/, "").toLowerCase();
            return isInstagramHandle(handle) ? { handle, reason: "" } : undefined;
        })
        .filter((entry) => entry !== undefined);
}

const fileEntries = parseSlopList(igList);
const fileHeader = igList
    .split("\n")
    .filter((line) => line.trim().startsWith("#"))
    .join("\n");

/**
 * The whole Instagram list: hand-written lines from ig.txt first, then the
 * accounts listed through the admin panel, oldest first. `ok` is false when
 * Convex couldn't be reached (only the file's lines are returned then).
 */
export async function getIgSlopList(): Promise<{ entries: SlopEntry[]; ok: boolean }> {
    const entries: SlopEntry[] = fileEntries.map((entry) => ({ ...entry, source: "file" }));
    const seen = new Set(entries.map((entry) => entry.handle));
    try {
        const listed = await convex.query(api.slopReports.listed, {});
        for (const item of listed) {
            if (seen.has(item.handle)) {
                // Listed in both: keep the file's line, but show the date.
                const existing = entries.find((entry) => entry.handle === item.handle);
                if (existing) existing.listedAt = item.listed_at;
                continue;
            }
            seen.add(item.handle);
            entries.push({
                handle: item.handle,
                reason: item.reason,
                listedAt: item.listed_at,
                source: "convex",
            });
        }
        return { entries, ok: true };
    } catch {
        return { entries, ok: false };
    }
}

/** The plain-text file served at /slopblock/ig.txt. */
export function formatSlopList(entries: SlopEntry[]): string {
    const lines = entries.map((entry) =>
        entry.reason ? `${entry.handle}: ${entry.reason}` : entry.handle,
    );
    return `${fileHeader}\n${lines.join("\n")}${lines.length ? "\n" : ""}`;
}

export const INSTAGRAM_LIST_URL = "/slopblock/ig.txt";

export const instagramProfileUrl = (handle: string) =>
    `https://www.instagram.com/${handle}/`;

const decodeEntities = (value: string) =>
    value
        .replace(/&#0*64;|&commat;/gi, "@")
        .replace(/&#x0*40;/gi, "@")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&");

/**
 * Best effort: finds who posted an Instagram post/reel from the link-preview
 * tags Instagram serves to crawlers. Returns "" when it can't tell (Instagram
 * may serve a login wall), so the caller asks for the username instead.
 */
export async function lookupInstagramOwner(mediaUrl: string): Promise<string> {
    try {
        const response = await fetch(mediaUrl, {
            headers: {
                // Instagram only serves Open Graph tags to link-preview bots.
                "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
                "Accept-Language": "en",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(4000),
        });
        if (!response.ok) return "";
        const html = (await response.text()).slice(0, 600_000);
        const meta = (name: string) => {
            const tag = html.match(
                new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, "i"),
            )?.[0];
            const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
            return content ? decodeEntities(content) : "";
        };
        const candidates = [
            // "Name (@user) • Instagram reel", "Name (@user) on Instagram: …"
            meta("og:title").match(/\(@([a-z0-9._]{1,30})\)/i)?.[1],
            meta("twitter:title").match(/\(@([a-z0-9._]{1,30})\)/i)?.[1],
            // "12 likes, 3 comments - user on March 3, 2025: …"
            meta("og:description").match(/\s-\s([a-z0-9._]{1,30}) on [A-Z]/)?.[1],
            meta("description").match(/\s-\s([a-z0-9._]{1,30}) on [A-Z]/)?.[1],
            // og:url sometimes names the account: instagram.com/user/reel/ID/
            meta("og:url").match(/instagram\.com\/([a-z0-9._]{1,30})\/(?:reel|p|tv)\//i)?.[1],
        ];
        for (const candidate of candidates) {
            const handle = candidate?.toLowerCase();
            if (handle && isInstagramHandle(handle) && handle !== "instagram") return handle;
        }
        return "";
    } catch {
        return "";
    }
}
