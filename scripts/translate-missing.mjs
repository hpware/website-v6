import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "src");
const dictionaryPath = join(sourceRoot, "locales", "en", "ui.json");
const sourceExtensions = new Set([".astro", ".ts", ".tsx"]);
const ignoredDirectories = new Set(["content", "data", "locales"]);
const callPattern = /\bT\(\s*"((?:\\.|[^"\\])*)"(?:\s*,\s*"(default|short)")?\s*\)/g;

async function collectSourceFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const path = join(directory, entry.name);
        const relativePath = relative(sourceRoot, path);
        const topLevelDirectory = relativePath.split(sep)[0];

        if (entry.isDirectory()) {
            if (!ignoredDirectories.has(topLevelDirectory)) {
                files.push(...await collectSourceFiles(path));
            }
            continue;
        }

        if (sourceExtensions.has(extname(entry.name))) files.push(path);
    }

    return files;
}

function decodeStringLiteral(value) {
    return JSON.parse(`"${value}"`);
}

async function collectMessages() {
    const messages = new Map();

    for (const file of await collectSourceFiles(sourceRoot)) {
        const source = await readFile(file, "utf8");

        for (const match of source.matchAll(callPattern)) {
            const message = decodeStringLiteral(match[1]);
            const variant = match[2] ?? "default";
            const variants = messages.get(message) ?? new Set();
            variants.add("default");
            variants.add(variant);
            messages.set(message, variants);
        }
    }

    return messages;
}

function hasTranslation(entry, variant) {
    if (typeof entry === "string") return variant === "default";
    return Boolean(entry && typeof entry[variant] === "string");
}

function parseModelContent(content) {
    const normalized = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");
    return JSON.parse(normalized);
}

async function translate(pending) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("GITHUB_TOKEN is required when translations are pending.");

    const model = process.env.GITHUB_MODEL ?? "openai/gpt-4.1-mini";
    const response = await fetch("https://models.github.ai/inference/chat/completions", {
        method: "POST",
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2026-03-10",
        },
        body: JSON.stringify({
            model,
            temperature: 0.1,
            max_tokens: Math.min(2000, 128 + pending.length * 96),
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: [
                        "Translate website UI copy from Traditional Chinese as used in Taiwan into concise, natural English.",
                        "Preserve names, URLs, placeholders, punctuation intent, and technical terms.",
                        "For a short variant, return a compact navigation label.",
                        "Return only JSON shaped as {\"translations\":{\"source\":{\"default\":\"translation\",\"short\":\"optional translation\"}}}.",
                        "Include every requested source and only the requested variants.",
                    ].join(" "),
                },
                {
                    role: "user",
                    content: JSON.stringify(pending),
                },
            ],
        }),
    });

    if (!response.ok) {
        throw new Error(`GitHub Models returned ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("GitHub Models returned no translation content.");

    const parsed = parseModelContent(content);
    if (!parsed.translations || typeof parsed.translations !== "object") {
        throw new Error("GitHub Models returned an invalid translations object.");
    }

    return parsed.translations;
}

const dictionary = JSON.parse(await readFile(dictionaryPath, "utf8"));
const messages = await collectMessages();
const pending = [];

for (const [source, variants] of messages) {
    const missingVariants = [...variants].filter(
        (variant) => !hasTranslation(dictionary[source], variant),
    );

    if (missingVariants.length > 0) {
        pending.push({ source, variants: missingVariants });
    }
}

if (pending.length === 0) {
    console.log("No pending website UI translations.");
    process.exit(0);
}

console.log(`Translating ${pending.length} pending website UI message(s).`);
const generated = await translate(pending);

for (const item of pending) {
    const translated = generated[item.source];
    if (!translated || typeof translated !== "object") {
        throw new Error(`Missing model output for: ${item.source}`);
    }

    const current = dictionary[item.source];
    const next = typeof current === "string"
        ? { default: current }
        : { ...current };

    for (const variant of item.variants) {
        const value = translated[variant];
        if (typeof value !== "string" || value.trim() === "") {
            throw new Error(`Missing ${variant} translation for: ${item.source}`);
        }
        next[variant] = value.trim();
    }

    dictionary[item.source] = Object.keys(next).length === 1
        ? next.default
        : next;
}

await writeFile(dictionaryPath, `${JSON.stringify(dictionary, null, 2)}\n`);
console.log(`Updated ${relative(root, dictionaryPath)}.`);
