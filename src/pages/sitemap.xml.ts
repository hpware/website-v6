import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { api } from "../../convex/_generated/api";
import { convex } from "../lib/convex";

const SITE = "https://v6.yuanhau.com";

type SitemapEntry = {
  url: string;
  lastmod?: Date;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

const LOCALES = ["en", "zh-TW"] as const;

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function absoluteUrl(pathname: string) {
  return new URL(pathname, SITE).toString();
}

function renderSitemap(entries: SitemapEntry[]) {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod
        ? `<lastmod>${entry.lastmod.toISOString()}</lastmod>`
        : "";
      const changefreq = entry.changefreq
        ? `<changefreq>${entry.changefreq}</changefreq>`
        : "";
      const priority = entry.priority ? `<priority>${entry.priority.toFixed(1)}</priority>` : "";

      return `  <url><loc>${xmlEscape(entry.url)}</loc>${lastmod}${changefreq}${priority}</url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export const GET: APIRoute = async () => {
  const entries: SitemapEntry[] = LOCALES.flatMap((locale) => [
    {
      url: absoluteUrl(`/${locale}/`),
      changefreq: "weekly" as const,
      priority: 1.0,
    },
    {
      url: absoluteUrl(`/${locale}/blog/`),
      changefreq: "weekly" as const,
      priority: 0.8,
    },
    {
      url: absoluteUrl(`/${locale}/hosting/`),
      changefreq: "monthly" as const,
      priority: 0.7,
    },
    {
      url: absoluteUrl(`/${locale}/hosting/pricing/`),
      changefreq: "monthly" as const,
      priority: 0.6,
    },
    {
      url: absoluteUrl(`/${locale}/abuse/`),
      changefreq: "yearly" as const,
      priority: 0.5,
    },
    {
      url: absoluteUrl(`/${locale}/contributions/`),
      changefreq: "monthly" as const,
      priority: 0.8,
    },
  ]);

  const posts = await getCollection("blog", ({ data }) => data.status === "published");

  entries.push(
    ...LOCALES.flatMap((locale) =>
      posts.map((post) => ({
        url: absoluteUrl(`/${locale}/blog/${post.id}/`),
        lastmod: post.data.updatedDate ?? post.data.pubDate,
        changefreq: "monthly" as const,
        priority: 0.6,
      })),
    ),
  );

  try {
    const pages = await convex.query(api.pages.listPublished, {});
    entries.push(
      ...LOCALES.flatMap((locale) =>
        pages.map((page) => ({
          url: absoluteUrl(`/${locale}/pages/${page.slug}/`),
          lastmod: new Date(page.updated_at),
          changefreq: "monthly" as const,
          priority: 0.6,
        })),
      ),
    );
  } catch {
    // Keep the sitemap buildable even when Convex is unavailable locally.
  }

  return new Response(renderSitemap(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
