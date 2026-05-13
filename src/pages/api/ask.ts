import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  return Response.json({
    error: "Working in progress. Please use convex endpoints instead.",
  });
};
