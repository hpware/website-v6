import type { APIRoute } from "astro";
import { api } from "../../../../convex/_generated/api";
import { convex } from "../../../lib/convex";

export async function getStaticPaths() {
  try {
    const items = await convex.query(api.app.listMDContent, {});

    return items.map((item) => ({
      params: { slug: item.slug },
    }));
  } catch {
    return [];
  }
}

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;

  if (!slug) {
    return Response.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const content = await convex.query(api.app.getMDContent, { slug });

    if (!content || content.length === 0) {
      return Response.json({ error: "Content not found" }, { status: 404 });
    }

    return Response.json(content[0]);
  } catch (error) {
    console.error(`Failed to fetch markdown content for slug: ${slug}`, error);

    return Response.json(
      { error: "Failed to fetch markdown content" },
      { status: 500 },
    );
  }
};
