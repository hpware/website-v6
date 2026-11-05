// Writes a photo pack's meta description and missing alt text with an AI model, as a
// background job. It runs here on Convex instead of Vercel, so it keeps going after the
// admin page has responded and isn't limited by a Vercel function's time limit.
// Needs OPENROUTER_API_KEY in the Convex env; OPENROUTER_MODEL is optional, and the
// model has to support images and JSON schemas.
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery, mutation, type MutationCtx } from "./_generated/server";
import { requireAdmin } from "./adminAuth";

const DEFAULT_MODEL = "deepseek/deepseek-v4.1-flash-1017";
const PARALLEL_REQUESTS = 4;
const ATTEMPTS = 3;
// Convex stops actions after 10 minutes, so a job still running after this has died.
const JOB_TIMEOUT_MS = 15 * 60 * 1000;

const photoValidator = v.object({ id: v.id("gallery_images"), url: v.string() });

// ============ STARTING AND TRACKING THE JOB ============

/** Starts the job. `photos` are the ones missing alt text, as URLs small enough to send to the model. */
export const start = mutation({
  args: { secret: v.string(), id: v.id("galleries"), photos: v.array(photoValidator) },
  handler: async (ctx, { secret, id, photos }) => {
    requireAdmin(secret);
    const gallery = await ctx.db.get(id);
    if (!gallery) throw new ConvexError("Gallery not found");
    if (gallery.meta_job?.status === "running") {
      throw new ConvexError("The meta tags are already being generated.");
    }

    const started_at = Date.now();
    await ctx.db.patch(id, {
      meta_job: { status: "running", done: 0, total: photos.length, started_at },
    });
    await ctx.scheduler.runAfter(0, internal.photoMeta.generate, { id, photos });
    // So a job that dies without reporting back can't block new ones forever.
    await ctx.scheduler.runAfter(JOB_TIMEOUT_MS, internal.photoMeta.expire, { id, started_at });
  },
});

export const expire = internalMutation({
  args: { id: v.id("galleries"), started_at: v.number() },
  handler: async (ctx, { id, started_at }) => {
    const job = (await ctx.db.get(id))?.meta_job;
    if (job?.status === "running" && job.started_at === started_at) {
      await ctx.db.patch(id, { meta_job: { ...job, status: "failed", error: "The job stopped unexpectedly." } });
    }
  },
});

export const getPack = internalQuery({
  args: { id: v.id("galleries") },
  handler: async (ctx, { id }) => {
    const gallery = await ctx.db.get(id);
    if (!gallery) return null;
    const images = await ctx.db
      .query("gallery_images")
      .withIndex("by_gallery_sort", (q) => q.eq("gallery_id", id))
      .order("asc")
      .collect();
    return { name: gallery.name, description: gallery.description, alts: images.map((image) => image.name).filter(Boolean) };
  },
});

/** Saved as each photo finishes, so a failed job keeps its progress. */
export const savePhotoAlt = internalMutation({
  args: { id: v.id("galleries"), imageId: v.id("gallery_images"), alt: v.string() },
  handler: async (ctx, { id, imageId, alt }) => {
    // The photo may have been removed, or given alt text by hand, in the meantime.
    const image = await ctx.db.get(imageId);
    if (image && !image.name) await ctx.db.patch(imageId, { name: alt });
    await bumpProgress(ctx, id);
  },
});

export const photoFailed = internalMutation({
  args: { id: v.id("galleries") },
  handler: async (ctx, { id }) => bumpProgress(ctx, id),
});

async function bumpProgress(ctx: MutationCtx, id: Id<"galleries">) {
  const job = (await ctx.db.get(id))?.meta_job;
  if (job) await ctx.db.patch(id, { meta_job: { ...job, done: job.done + 1 } });
}

export const finish = internalMutation({
  args: {
    id: v.id("galleries"),
    meta_description: v.optional(v.object({ zh: v.string(), en: v.string() })),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { id, meta_description, error }) => {
    const gallery = await ctx.db.get(id);
    if (!gallery) return;
    await ctx.db.patch(id, {
      ...(meta_description && { meta_description, updated_at: Date.now() }),
      meta_job: error && gallery.meta_job ? { ...gallery.meta_job, status: "failed", error } : undefined,
    });
  },
});

// ============ THE JOB ============

export const generate = internalAction({
  args: { id: v.id("galleries"), photos: v.array(photoValidator) },
  handler: async (ctx, { id, photos }) => {
    let failed = 0;
    let lastError = "";
    const queue = [...photos];
    const worker = async () => {
      for (let photo = queue.shift(); photo; photo = queue.shift()) {
        try {
          const alt = await writeAlt(photo.url);
          await ctx.runMutation(internal.photoMeta.savePhotoAlt, { id, imageId: photo.id, alt });
        } catch (error) {
          // One bad photo shouldn't throw away the rest of them.
          failed++;
          lastError = errorText(error);
          await ctx.runMutation(internal.photoMeta.photoFailed, { id });
        }
      }
    };
    await Promise.all(Array.from({ length: PARALLEL_REQUESTS }, worker));

    let error = failed > 0 ? `${failed} of ${photos.length} photos got no alt text. Last error: ${lastError}` : undefined;
    let meta_description: { zh: string; en: string } | undefined;
    try {
      const pack = await ctx.runQuery(internal.photoMeta.getPack, { id });
      if (pack && pack.alts.length > 0) meta_description = await writeDescription(pack.name, pack.alts);
      else error ??= "There are no photos to describe.";
    } catch (caught) {
      error = `The description failed: ${errorText(caught)}`;
    }
    await ctx.runMutation(internal.photoMeta.finish, { id, meta_description, error });
  },
});

async function writeAlt(url: string) {
  const { alt } = await ask<{ alt: string }>(
    "photo_alt",
    { type: "object", properties: { alt: { type: "string" } }, required: ["alt"], additionalProperties: false },
    "Write alt text in Traditional Chinese as used in Taiwan for this photo. " +
      "Describe what is visible in one short phrase under 60 characters. Don't guess at specifics you can't see.",
    [{ type: "image_url", image_url: { url: await toDataUrl(url) } }],
  );
  if (!alt?.trim()) throw new Error("The model returned empty alt text.");
  return alt.trim();
}

async function writeDescription(album: string, photos: string[]) {
  const description = await ask<{ zh: string; en: string }>(
    "photo_pack_description",
    {
      type: "object",
      properties: { zh: { type: "string" }, en: { type: "string" } },
      required: ["zh", "en"],
      additionalProperties: false,
    },
    "Write a meta description for a photo album on a personal website, using only the details given. " +
      "Return it in Traditional Chinese as used in Taiwan (zh) and natural English (en), each under 150 characters.",
    [{ type: "text", text: JSON.stringify({ album, photos }) }],
  );
  if (!description.zh?.trim() || !description.en?.trim()) throw new Error("The model returned an empty description.");
  return { zh: description.zh.trim(), en: description.en.trim() };
}

async function toDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Couldn't download ${url} (${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  const CHUNK = 0x8000; // String.fromCharCode can't take a whole photo's bytes at once.
  for (let start = 0; start < bytes.length; start += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(start, start + CHUNK));
  }
  return `data:${response.headers.get("content-type") ?? "image/jpeg"};base64,${btoa(binary)}`;
}

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

// OpenRouter can answer 200 with an error, or with no text at all, so none of it is assumed.
type Completion = {
  error?: { message?: string };
  choices?: {
    finish_reason?: string | null;
    error?: { message?: string };
    message?: { content?: string | null; refusal?: string | null };
  }[];
};

async function ask<T>(name: string, schema: object, instructions: string, content: Part[]): Promise<T> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY isn't set in the Convex env.");

  let lastError: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      return await request<T>(key, name, schema, instructions, content);
    } catch (error) {
      lastError = error;
      if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
}

async function request<T>(key: string, name: string, schema: object, instructions: string, content: Part[]): Promise<T> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content },
      ],
      response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
      // Only use providers that actually support the JSON format above.
      provider: { require_parameters: true },
      // Describing a photo doesn't need it, and it made these requests about 4x the price.
      reasoning: { enabled: false },
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter returned ${response.status}: ${(await response.text()).slice(0, 200)}`);

  const completion: Completion = await response.json();
  const choice = completion.choices?.[0];
  const text = choice?.message?.content;
  if (!text) {
    const reason =
      completion.error?.message ?? choice?.error?.message ?? choice?.message?.refusal ?? `finish_reason: ${choice?.finish_reason}`;
    throw new Error(`The model returned no text (${reason}).`);
  }
  return JSON.parse(text) as T;
}

function errorText(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(0, 200);
}
