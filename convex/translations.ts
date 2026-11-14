// Translates a blog post / food review with an AI model (through openrouter.ts), as a
// background job, when a reader asks for it. The website's server sends the post (it lives
// in src/content, not here) and the result is saved, so each post and language is only
// translated once, until the post changes.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { requireAdmin } from "./adminAuth";
import { ask, errorText } from "./openrouter";

// Convex stops actions after 10 minutes, so a job still running after this has died.
const JOB_TIMEOUT_MS = 15 * 60 * 1000;

const postArgs = {
  collection: v.union(v.literal("blog"), v.literal("food")),
  slug: v.string(),
  locale: v.union(v.literal("en"), v.literal("zh-TW")),
};

const LANGUAGES = { en: "natural English", "zh-TW": "Traditional Chinese as used in Taiwan" };

export const get = query({
  args: postArgs,
  handler: async (ctx, { collection, slug, locale }) => {
    const translation = await ctx.db
      .query("translations")
      .withIndex("by_post", (q) => q.eq("collection", collection).eq("slug", slug).eq("locale", locale))
      .unique();
    if (translation?.status === "running" && Date.now() - translation.started_at > JOB_TIMEOUT_MS) {
      return { ...translation, status: "failed" as const, error: "The job stopped unexpectedly." };
    }
    return translation;
  },
});

/** Starts translating the post, unless it's already translated (or being translated) as it is now. */
export const start = mutation({
  args: {
    ...postArgs,
    secret: v.string(),
    source_hash: v.string(),
    title: v.string(),
    description: v.string(),
    markdown: v.string(),
  },
  handler: async (ctx, { secret, title, description, markdown, ...post }) => {
    requireAdmin(secret);
    const existing = await ctx.db
      .query("translations")
      .withIndex("by_post", (q) =>
        q.eq("collection", post.collection).eq("slug", post.slug).eq("locale", post.locale),
      )
      .unique();
    if (existing?.source_hash === post.source_hash) {
      if (existing.status === "done") return;
      if (existing.status === "running" && Date.now() - existing.started_at < JOB_TIMEOUT_MS) return;
    }

    const job = { ...post, status: "running" as const, started_at: Date.now() };
    const id = existing ? (await ctx.db.replace(existing._id, job), existing._id) : await ctx.db.insert("translations", job);
    await ctx.scheduler.runAfter(0, internal.translations.translate, {
      id,
      started_at: job.started_at,
      locale: post.locale,
      post: { title, description, markdown },
    });
  },
});

const resultValidator = v.object({ title: v.string(), description: v.string(), markdown: v.string() });

export const finish = internalMutation({
  args: {
    id: v.id("translations"),
    started_at: v.number(),
    result: v.optional(resultValidator),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { id, started_at, result, error }) => {
    // A newer job may have replaced this one (the post changed while it was running).
    const translation = await ctx.db.get(id);
    if (translation?.started_at !== started_at) return;
    await ctx.db.patch(id, result ? { status: "done", ...result } : { status: "failed", error });
  },
});

export const translate = internalAction({
  args: {
    id: v.id("translations"),
    started_at: v.number(),
    locale: postArgs.locale,
    post: resultValidator,
  },
  handler: async (ctx, { id, started_at, locale, post }) => {
    try {
      const result = await translatePost(locale, post);
      await ctx.runMutation(internal.translations.finish, { id, started_at, result });
    } catch (error) {
      await ctx.runMutation(internal.translations.finish, { id, started_at, error: errorText(error) });
    }
  },
});

type Post = { title: string; description: string; markdown: string };

async function translatePost(locale: keyof typeof LANGUAGES, post: Post) {
  const result = await ask<Post>(
    "post_translation",
    {
      type: "object",
      properties: { title: { type: "string" }, description: { type: "string" }, markdown: { type: "string" } },
      required: ["title", "description", "markdown"],
      additionalProperties: false,
    },
    `Translate this post from a personal website into ${LANGUAGES[locale]}. ` +
      "Keep the author's tone and the Markdown exactly as it is: headings, lists, links, HTML, " +
      "and image paths and URLs stay unchanged, and code blocks are not translated. " +
      "Text already in the target language stays as it is. Don't add or leave out anything.",
    [{ type: "text", text: JSON.stringify(post) }],
  );
  if (!result.title?.trim() || !result.markdown?.trim()) throw new Error("The model returned an empty translation.");
  return { title: result.title.trim(), description: result.description?.trim() ?? "", markdown: result.markdown };
}
