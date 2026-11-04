import type { APIRoute } from "astro";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { errorMessage } from "../../../../lib/admin/utils";
import { signInWithPasskey } from "../../../../lib/admin/passkeys";

export const POST: APIRoute = async ({ url, cookies, request }) => {
    try {
        // The library validates the shape of the browser's response.
        const response: AuthenticationResponseJSON = await request.json();
        await signInWithPasskey(url, cookies, response);
        return Response.json({ ok: true });
    } catch (error) {
        return Response.json({ error: errorMessage(error) }, { status: 400 });
    }
};
