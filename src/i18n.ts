import english from "./locales/en/ui.json";

export const locales = ["en", "zh-TW"] as const;

export type Locale = (typeof locales)[number];

export type Message = keyof typeof english;
export type TranslationVariant = "default" | "short";
export type Translator = (
    message: Message,
    variant?: TranslationVariant,
) => string;

export const defaultLocale: Locale = "en";

export function preferredLocaleFromHeader(
    acceptLanguage: string | null,
): Locale {
    const preferences = (acceptLanguage ?? "")
        .split(",")
        .map((part, index) => {
            const [tag = "", ...parameters] = part.trim().split(";");
            const qualityParameter = parameters.find((parameter) =>
                parameter.trim().toLowerCase().startsWith("q="),
            );
            const quality = qualityParameter
                ? Number(qualityParameter.split("=")[1])
                : 1;

            return {
                index,
                quality: Number.isFinite(quality) ? quality : 0,
                tag: tag.toLowerCase(),
            };
        })
        .filter(({ quality }) => quality > 0)
        .sort(
            (left, right) =>
                right.quality - left.quality || left.index - right.index,
        );

    for (const { tag } of preferences) {
        const language = tag.split("-")[0];

        if (language === "zh") return "zh-TW";
        if (language === "en") return "en";
    }

    return "en";
}

export function isLocale(value: string | undefined): value is Locale {
    return locales.some((locale) => locale === value);
}

export function localizedPath(locale: Locale, pathname = "/") {
    const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
    const withoutLocale = path.replace(/^\/(?:en|zh-TW)(?=\/|$)/, "");
    const normalizedPath = withoutLocale === "" ? "/" : withoutLocale;

    return `/${locale}${normalizedPath}`.replace(/\/{2,}/g, "/");
}

export function createTranslator(locale: Locale): Translator {
    return (message, variant = "default") => {
        if (locale === "zh-TW") return message;

        const translation = english[message];
        return typeof translation === "string"
            ? translation
            : translation[variant];
    };
}
