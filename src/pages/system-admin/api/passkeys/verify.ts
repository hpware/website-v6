import type { APIRoute } from "astro";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { errorMessage } from "../../../../lib/admin/utils";
import { registerPasskey } from "../../../../lib/admin/passkeys";
import { setToast } from "../../../../lib/admin/session";

export const POST: APIRoute = async ({ url, cookies, request }) => {
    try {
        // The library validates the shape of the browser's response.
        const body: { name?: string; response: RegistrationResponseJSON } =
            await request.json();
        const name = body.name?.trim() || "Passkey";
        await registerPasskey(url, cookies, name, body.response);
        setToast(cookies, "Passkey added.");
        return Response.json({ ok: true });
    } catch (error) {
        return Response.json({ error: errorMessage(error) }, { status: 400 });
    }
};
