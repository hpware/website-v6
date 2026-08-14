import english from "./locales/en/ui.json";
import traditionalChinese from "./locales/zh-TW/ui.json";

export const locales = ["en", "zh-TW"] as const;

export type Locale = (typeof locales)[number];

type TranslationSchema = typeof english;

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

export const translations: Record<Locale, TranslationSchema> = {
    en: english,
    "zh-TW": traditionalChinese,
};
