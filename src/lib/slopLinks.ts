// Pure link helpers for the slop blocklist, shared by the site (src/lib/slopblock.ts,
// the report API) and Convex (convex/slopReports.ts). No Astro or Node imports.

const INSTAGRAM_HANDLE = /^[a-z0-9._]{1,30}$/;

/** Instagram username rules (after lowercasing and stripping the @). */
export function isInstagramHandle(handle: string): boolean {
    return INSTAGRAM_HANDLE.test(handle);
}

const isInstagramHost = (hostname: string) =>
    /(^|\.)(instagram\.com|instagr\.am)$/i.test(hostname);

// Query parameters that identify who shared a link (Instagram's igsh/igshid
// is tied to the sharer's account) or track the click. They are stripped from
// every stored and displayed video link, so a report can't leak the
// reporter's account.
const TRACKING_PARAMS = [
    /^igsh(id)?$/i,
    /^utm_/i,
    /^fbclid$/i,
    /^gclid$/i,
    /^si$/i, // YouTube / Spotify share id
    /^pp$/i, // YouTube
    /^feature$/i,
    /^share_(id|app_id|source)$/i,
    /^_r$/i, // TikTok
    /^_t$/i, // TikTok
    /^is_from_webapp$/i,
    /^sender_device$/i,
    /^mibextid$/i, // Facebook
    /^ref(_src|_url)?$/i,
];

// X / Twitter share source and share token. Only stripped there: elsewhere
// (YouTube's t= timestamp, ...) these names mean something.
const X_TRACKING_PARAMS = [/^s$/i, /^t$/i];

function parseLooseUrl(input: string): URL | null {
    const trimmed = input.trim();
    if (!trimmed || /\s/.test(trimmed) || trimmed.startsWith("@")) return null;
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
    // Without a scheme, "foo.bar" is more likely a username than a site —
    // only "host/path" counts as a link.
    if (!hasScheme && !trimmed.includes("/")) return null;
    try {
        const url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
        if (url.protocol !== "http:" && url.protocol !== "https:") return null;
        // "foo" alone parses as https://foo/ — require a dotted host.
        if (!url.hostname.includes(".")) return null;
        return url;
    } catch {
        return null;
    }
}

/**
 * Normalizes a pasted video link: adds https:// when it's missing and strips
 * share/tracking parameters. Instagram links lose their whole query string and
 * fragment (none of it is needed to open a post or reel). Returns "" when the
 * input isn't a usable http(s) link.
 */
export function cleanVideoUrl(input: string): string {
    const url = parseLooseUrl(input);
    if (!url) return "";
    url.username = "";
    url.password = "";
    if (isInstagramHost(url.hostname)) {
        url.search = "";
        url.hash = "";
        url.hostname = "www.instagram.com";
        return url.toString();
    }
    const isX = /(^|\.)(x\.com|twitter\.com)$/i.test(url.hostname);
    const patterns = isX ? [...TRACKING_PARAMS, ...X_TRACKING_PARAMS] : TRACKING_PARAMS;
    for (const key of [...url.searchParams.keys()]) {
        if (patterns.some((pattern) => pattern.test(key))) {
            url.searchParams.delete(key);
        }
    }
    return url.toString();
}

/** Cleans a stored reason for display: video links lose tracking params. */
export function cleanReason(reason: string): string {
    if (!/^https?:\/\/\S+$/i.test(reason.trim())) return reason;
    return cleanVideoUrl(reason) || reason;
}

// Path segments that are never a profile (instagram.com/p/..., /reel/...,
// /legal/privacy/, ...). Any other top-level path is a username.
const NON_PROFILE_SEGMENTS = new Set([
    "p",
    "reel",
    "reels",
    "tv",
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
    "share",
]);

const MEDIA_SEGMENTS = new Set(["p", "reel", "reels", "tv"]);

export type InstagramInput =
    /** A username, or a link that names the account (profile, /user/reel/id, stories/user). */
    | { kind: "handle"; handle: string }
    /** A post/reel link with no username in it — the owner has to be looked up. */
    | { kind: "media"; url: string }
    | { kind: "invalid" };

/**
 * Works out the account from whatever someone pasted: "@user", "user",
 * "instagram.com/user", "https://www.instagram.com/user/?igsh=…",
 * "instagram.com/user/reel/ID", "instagram.com/stories/user/123". A bare
 * post/reel link comes back as { kind: "media" }.
 */
export function parseInstagramInput(input: string): InstagramInput {
    const trimmed = input.trim();
    if (!trimmed) return { kind: "invalid" };

    const bare = trimmed.replace(/^@+/, "").replace(/\/+$/, "").toLowerCase();
    if (isInstagramHandle(bare) && !/^www\./.test(bare)) {
        // "instagram.com" itself looks like a handle; it's a link without a path.
        if (!/(^|\.)instagram\.com$/.test(bare)) return { kind: "handle", handle: bare };
    }

    const url = parseLooseUrl(trimmed);
    if (!url || !isInstagramHost(url.hostname)) return { kind: "invalid" };

    const segments = url.pathname.split("/").filter(Boolean).map((s) => s.toLowerCase());
    const [first, second] = segments;
    if (!first) return { kind: "invalid" };

    if (first === "stories" && second && isInstagramHandle(second) && second !== "highlights") {
        return { kind: "handle", handle: second };
    }
    if (MEDIA_SEGMENTS.has(first)) {
        return segments.length >= 2 ? { kind: "media", url: cleanVideoUrl(trimmed) } : { kind: "invalid" };
    }
    if (NON_PROFILE_SEGMENTS.has(first)) return { kind: "invalid" };

    const handle = first.replace(/^@+/, "");
    return isInstagramHandle(handle) ? { kind: "handle", handle } : { kind: "invalid" };
}

/** True when the link is an Instagram post/reel (one that can be the video link). */
export function isInstagramMediaLink(input: string): boolean {
    const url = parseLooseUrl(input);
    if (!url || !isInstagramHost(url.hostname)) return false;
    const segments = url.pathname.split("/").filter(Boolean).map((s) => s.toLowerCase());
    return segments.some((segment, index) => MEDIA_SEGMENTS.has(segment) && index < segments.length - 1);
}
