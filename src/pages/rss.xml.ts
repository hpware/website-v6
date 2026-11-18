import { getCollection } from "astro:content";
import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { SITE_DESCRIPTION, SITE_NAME } from "../consts";

// The feed is generated at build time from the content collections.
export const prerender = true;

export const GET: APIRoute = async (context) => {
  const posts = await getCollection(
    "blog",
    ({ data }) => data.status === "published",
  );
  return rss({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    site: context.site ?? new URL(context.url).origin,
    items: posts.map((post) => ({
      ...post.data,
      link: `/zh-TW/blog/${post.id}/`,
    })),
  });
};
