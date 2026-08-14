import english from "./locales/en/ui.json";

export const locales = ["en", "zh-TW"] as const;

export type Locale = (typeof locales)[number];

export type Message = keyof typeof english;
export type Translator = (message: Message) => string;

export const defaultLocale: Locale = "zh-TW";

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
    return (message) => locale === "en" ? english[message] : message;
}
