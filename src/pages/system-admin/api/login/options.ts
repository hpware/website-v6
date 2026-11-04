import type { APIRoute } from "astro";
import { errorMessage } from "../../../../lib/admin/utils";
import { authenticationOptions } from "../../../../lib/admin/passkeys";

export const POST: APIRoute = async ({ url, cookies }) => {
    try {
        return Response.json(await authenticationOptions(url, cookies));
    } catch (error) {
        return Response.json({ error: errorMessage(error) }, { status: 400 });
    }
};
