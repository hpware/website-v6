import { getCollection } from "astro:content";

export async function GET(context) {
  const posts = await getCollection("blog");
  return Response.json({
    error: "Working in progress. Please use convex endpoints instead.",
  });
}
