// Asks an AI model on OpenRouter for JSON that matches a schema, retrying a few times.
// Used by the background jobs in photoMeta.ts and translations.ts.
// Needs OPENROUTER_API_KEY in the Convex env; OPENROUTER_MODEL is optional, and the
// model has to support JSON schemas (and images, for photoMeta.ts).

const DEFAULT_MODEL = "openai/gpt-6-luna";
const ATTEMPTS = 3;

export type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

// OpenRouter can answer 200 with an error, or with no text at all, so none of it is assumed.
type Completion = {
  error?: { message?: string };
  choices?: {
    finish_reason?: string | null;
    error?: { message?: string };
    message?: { content?: string | null; refusal?: string | null };
  }[];
};

export async function ask<T>(name: string, schema: object, instructions: string, content: Part[]): Promise<T> {
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
      // These jobs don't need it, and it made the photo requests about 4x the price.
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

export function errorText(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(0, 200);
}
