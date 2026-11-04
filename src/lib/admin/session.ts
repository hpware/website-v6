import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { AstroCookies } from "astro";
import { ADMIN_PASSWORD_SHA512, ADMIN_SESSION_SECRET } from "astro:env/server";

// Admin sign-in state lives in HMAC-signed cookies, so there's no session table.
// Changing ADMIN_SESSION_SECRET signs everyone out.

const SESSION_COOKIE = "admin_session";
const CHALLENGE_COOKIE = "admin_challenge";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const CHALLENGE_MS = 5 * 60 * 1000;

type Signed = { kind: "session" | "challenge"; exp: number; challenge?: string };

function signingKey() {
    if (!ADMIN_SESSION_SECRET) throw new Error("ADMIN_SESSION_SECRET is not set.");
    return ADMIN_SESSION_SECRET;
}

function hmac(payload: string) {
    return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
}

function seal(data: Signed) {
    const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
    return `${payload}.${hmac(payload)}`;
}

function unseal(value: string | undefined, kind: Signed["kind"]): Signed | null {
    // Without a signing secret nothing can be trusted, so everyone is signed out.
    if (!ADMIN_SESSION_SECRET) return null;
    const [payload, signature] = value?.split(".") ?? [];
    if (!payload || !signature || !safeEqual(signature, hmac(payload))) return null;
    const data: Signed = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.kind === kind && data.exp > Date.now() ? data : null;
}

const cookieOptions = (maxAgeMs: number) => ({
    path: "/",
    httpOnly: true,
    sameSite: "strict" as const,
    secure: import.meta.env.PROD,
    maxAge: maxAgeMs / 1000,
});

export function isSignedIn(cookies: AstroCookies) {
    return unseal(cookies.get(SESSION_COOKIE)?.value, "session") !== null;
}

export function signIn(cookies: AstroCookies) {
    const value = seal({ kind: "session", exp: Date.now() + SESSION_MS });
    cookies.set(SESSION_COOKIE, value, cookieOptions(SESSION_MS));
}

export function signOut(cookies: AstroCookies) {
    cookies.delete(SESSION_COOKIE, { path: "/" });
}

/** Remembers a WebAuthn challenge between the options and verify requests. */
export function saveChallenge(cookies: AstroCookies, challenge: string) {
    const value = seal({ kind: "challenge", exp: Date.now() + CHALLENGE_MS, challenge });
    cookies.set(CHALLENGE_COOKIE, value, cookieOptions(CHALLENGE_MS));
}

/** Returns the saved challenge once (it's deleted so it can't be replayed). */
export function takeChallenge(cookies: AstroCookies) {
    const data = unseal(cookies.get(CHALLENGE_COOKIE)?.value, "challenge");
    cookies.delete(CHALLENGE_COOKIE, { path: "/" });
    return data?.challenge ?? null;
}

/** Compares the SHA-512 of the given password with ADMIN_PASSWORD_SHA512. */
export function checkPassword(password: string) {
    if (!ADMIN_PASSWORD_SHA512) return false;
    const hash = createHash("sha512").update(password).digest("hex");
    return safeEqual(hash, ADMIN_PASSWORD_SHA512.trim().toLowerCase());
}
