import type { APIRoute } from "astro";
import { errorMessage } from "../../../../lib/admin/utils";
import { registrationOptions } from "../../../../lib/admin/passkeys";

export const POST: APIRoute = async ({ url, cookies }) => {
    try {
        return Response.json(await registrationOptions(url, cookies));
    } catch (error) {
        return Response.json({ error: errorMessage(error) }, { status: 400 });
    }
};
