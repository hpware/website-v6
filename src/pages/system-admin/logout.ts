import type { APIRoute } from "astro";
import { signOut } from "../../lib/admin/session";

export const POST: APIRoute = ({ cookies, redirect }) => {
    signOut(cookies);
    return redirect("/system-admin/login", 303);
};
