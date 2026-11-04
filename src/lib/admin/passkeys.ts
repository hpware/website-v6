import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
    type AuthenticationResponseJSON,
    type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import type { AstroCookies } from "astro";
import { api } from "../../../convex/_generated/api";
import { convex } from "../convex";
import { adminSecret } from "./utils";
import { saveChallenge, signIn, takeChallenge } from "./session";

// Passkeys are tied to the domain they were made on (rpID), so ones added on
// localhost only work on localhost, and ones added on the live site only there.

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");
const fromBase64 = (value: string) => new Uint8Array(Buffer.from(value, "base64url"));

function listPasskeys() {
    return convex.query(api.adminPasskeys.list, { secret: adminSecret() });
}

export async function registrationOptions(url: URL, cookies: AstroCookies) {
    const existing = await listPasskeys();
    const options = await generateRegistrationOptions({
        rpName: "元皓 admin",
        rpID: url.hostname,
        userName: "admin",
        // One fixed admin user, so a device replaces rather than duplicates its passkey.
        userID: new TextEncoder().encode("yuanhau-admin"),
        attestationType: "none",
        excludeCredentials: existing.map((passkey) => ({
            id: passkey.credential_id,
            transports: passkey.transports,
        })),
        authenticatorSelection: {
            residentKey: "required",
            userVerification: "preferred",
        },
    });
    saveChallenge(cookies, options.challenge);
    return options;
}

export async function registerPasskey(
    url: URL,
    cookies: AstroCookies,
    name: string,
    response: RegistrationResponseJSON,
) {
    const expectedChallenge = takeChallenge(cookies);
    if (!expectedChallenge) throw new Error("This passkey request expired. Try again.");

    const { verified, registrationInfo } = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: url.origin,
        expectedRPID: url.hostname,
    });
    if (!verified) throw new Error("The passkey could not be verified.");

    const { credential } = registrationInfo;
    await convex.mutation(api.adminPasskeys.add, {
        secret: adminSecret(),
        name,
        credential_id: credential.id,
        public_key: toBase64(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports,
    });
}

export async function authenticationOptions(url: URL, cookies: AstroCookies) {
    // No allowCredentials: the browser offers any passkey saved for this site.
    const options = await generateAuthenticationOptions({
        rpID: url.hostname,
        userVerification: "preferred",
    });
    saveChallenge(cookies, options.challenge);
    return options;
}

export async function signInWithPasskey(
    url: URL,
    cookies: AstroCookies,
    response: AuthenticationResponseJSON,
) {
    const expectedChallenge = takeChallenge(cookies);
    if (!expectedChallenge) throw new Error("This sign-in request expired. Try again.");

    const passkey = await convex.query(api.adminPasskeys.getByCredentialId, {
        secret: adminSecret(),
        credential_id: response.id,
    });
    if (!passkey) throw new Error("This passkey isn't registered for the admin panel.");

    const { verified, authenticationInfo } = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: url.origin,
        expectedRPID: url.hostname,
        credential: {
            id: passkey.credential_id,
            publicKey: fromBase64(passkey.public_key),
            counter: passkey.counter,
            transports: passkey.transports,
        },
    });
    if (!verified) throw new Error("The passkey could not be verified.");

    await convex.mutation(api.adminPasskeys.markUsed, {
        secret: adminSecret(),
        id: passkey._id,
        counter: authenticationInfo.newCounter,
    });
    signIn(cookies);
}
