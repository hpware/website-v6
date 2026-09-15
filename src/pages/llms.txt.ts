import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { locales, type Locale, createTranslator } from "../i18n";
import { SITE_NAME } from "../consts";
import contributions from "../data/contributions.json";
import { achievements } from "../data/achievements";

export const prerender = false;

function link(
  origin: string,
  title: string,
  pathname: string,
  description?: string,
) {
  const url = new URL(pathname, origin).toString();
  return `- [${title}](${url})${description ? `: ${description}` : ""}`;
}

function byNewest<T extends { data: { pubDate: Date; updatedDate?: Date } }>(
  a: T,
  b: T,
) {
  const aDate = a.data.updatedDate ?? a.data.pubDate;
  const bDate = b.data.updatedDate ?? b.data.pubDate;
  return bDate.getTime() - aDate.getTime();
}

export const GET: APIRoute = async (context) => {
  const origin = (context.site ?? new URL(context.url)).origin;
  const lang = context.url.searchParams.get("lang");
  const LOCALE: Locale = locales.includes(lang as Locale)
    ? (lang as Locale)
    : "en";
  const T = createTranslator(LOCALE);

  const posts = (
    await getCollection("blog", ({ data }) => data.status === "published")
  ).sort(byNewest);
  const reviews = (
    await getCollection("food", ({ data }) => data.status === "published")
  ).sort(byNewest);

  const sections = [
    `# ${SITE_NAME}`,
    `> ${T("歡迎來到我的網站！")}`,
    T("本文件的連結指向繁體中文版。使用 ?lang=en 或 ?lang=zh-TW 切換語言。"),
    [
      `## ${T("主要頁面")}`,
      link(origin, T("首頁"), `/${LOCALE}/`),
      link(origin, T("部落格"), `/${LOCALE}/blog/`),
      link(origin, T("食記"), `/${LOCALE}/food/`),
      link(origin, T("專案"), `/${LOCALE}/projects/`),
      link(origin, T("貢獻"), `/${LOCALE}/contributions/`),
      link(origin, T("主機服務"), `/${LOCALE}/hosting/`),
      link(origin, T("主機服務價格"), `/${LOCALE}/hosting/pricing/`),
      link(origin, T("濫用回報"), `/${LOCALE}/abuse/`),
      link(origin, T("RSS 訂閱"), "/rss.xml"),
    ].join("\n"),
  ];

  if (posts.length) {
    sections.push(
      [
        `## ${T("部落格")}`,
        ...posts.map((post) =>
          link(
            origin,
            post.data.title,
            `/${LOCALE}/blog/${post.id}/`,
            post.data.description,
          ),
        ),
      ].join("\n"),
    );
  }

  if (reviews.length) {
    sections.push(
      [
        `## ${T("食記")}`,
        ...reviews.map((review) =>
          link(
            origin,
            review.data.title,
            `/${LOCALE}/food/${review.id}/`,
            review.data.description,
          ),
        ),
      ].join("\n"),
    );
  }

  if (achievements.length) {
    sections.push(
      [
        `## ${T("成就")}`,
        ...achievements.map(
          (item) =>
            `- ${item.title} (${item.date}): ${item.description.replaceAll("\n", " ")}`,
        ),
      ].join("\n"),
    );
  }

  for (const group of contributions) {
    sections.push(
      [
        `## ${T("貢獻：")}${group.title}`,
        group.description,
        ...group.items.map((item) => {
          const links = item.links
            .map((l) => `[${l.label}](${l.url})`)
            .join(", ");
          const status =
            "isUnmaintained" in item && item.isUnmaintained
              ? ` (${T("已停止維護")})`
              : "";
          return `- ${item.title}${status}: ${item.description}${links ? ` — ${links}` : ""}`;
        }),
      ].join("\n"),
    );
  }

  return new Response(`${sections.join("\n\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
};
