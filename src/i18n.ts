export const locales = ["en", "zh-TW"] as const;

export type Locale = (typeof locales)[number];

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

export const translations = {
    en: {
        siteDescription: "Welcome to my website!",
        nav: {
            home: "Home",
            blog: "Blog",
            contributions: "Contributions",
            contributionsShort: "Contrib.",
            hosting: "Hosting",
            language: "Language",
        },
        themeToggle: "Toggle theme",
        footer: {
            profileAlt: "Profile picture",
            quote: "Take risks in life. Your great-great-great-grandchildren won't remember you, so why not try, take a few risks, and learn even more?",
            links: "Links",
            home: "Home",
            blog: "Blog",
            contributions: "Contributions",
            about: "About",
            v5Website: "v5 website",
            v4Website: "v4.1.3 website",
            oldBlog: "v4.1.2 old blog",
            sourceCode: "Website source code",
            email: "Email",
            status: "Status page",
            statusHl: "Status page (HL)",
            licensePrefix: "This website is licensed under",
        },
        home: {
            title: "Home",
            achievements: "Achievements",
        },
        blog: {
            title: "Blog",
            heading: "Posts",
            publishedOn: "Published on",
            back: "Back",
        },
        contributions: {
            title: "Contributions",
            description:
                "Projects, research, bug findings, and other things I have worked on.",
            metaDescription:
                "Projects, security research, bug findings, and other contributions by Howard.",
            unmaintained: "Unmaintained",
        },
        hosting: {
            title: "Free hosting",
            description: "Free IPv6-only virtual machine hosting.",
            heading: "Free hosting",
            limit: "Limited to one HE IPv6 address and a virtual machine with 1 CPU core and 1 GB of memory per person",
            manage: "Manage VM",
            reportAbuse: "Report abuse",
            footnote:
                "Availability is not guaranteed, and I reserve the right to remove virtual machines.",
        },
        pricing: {
            title: "Hosting pricing",
            description: "Pricing for the free IPv6-only hosting service.",
            heading: "VM hosting",
            price: "Price?",
        },
        abuse: {
            title: "Report abuse",
            heading: "Report abuse",
        },
        notFound: {
            title: "404 Page not found",
            heading: "404 Page not found",
            description: "Sorry, the page you requested does not exist.",
            instruction: "Check the URL, or return to the home page to continue.",
            home: "home page",
        },
        pages: {
            archived: "This page has been archived by",
            unavailable: "Content not available",
            learnMore: "Learn more",
            heroAlt: "A hero image for",
            loading: "Loading this page...",
        },
    },
    "zh-TW": {
        siteDescription: "歡迎來到我的網站！",
        nav: {
            home: "首頁",
            blog: "部落格",
            contributions: "貢獻",
            contributionsShort: "貢獻",
            hosting: "免費架",
            language: "語言",
        },
        themeToggle: "切換深淺色主題",
        footer: {
            profileAlt: "Howard 的大頭貼",
            quote: "人生就是要冒險。你的曾曾曾孫不會記得你，那何不放手試試、多冒一點險，也多學一點東西？",
            links: "連結",
            home: "首頁",
            blog: "部落格",
            contributions: "貢獻",
            about: "關於",
            v5Website: "v5 網站",
            v4Website: "v4.1.3 網站",
            oldBlog: "v4.1.2 舊版部落格",
            sourceCode: "網站原始碼",
            email: "電子郵件",
            status: "服務狀態",
            statusHl: "服務狀態（HL）",
            licensePrefix: "此網站採用",
        },
        home: {
            title: "首頁",
            achievements: "成就",
        },
        blog: {
            title: "部落格",
            heading: "貼文",
            publishedOn: "發佈於",
            back: "返回",
        },
        contributions: {
            title: "貢獻",
            description: "專案、研究、問題回報，以及其他我做過的東西。",
            metaDescription:
                "Howard 做過的專案、資安研究、問題回報與其他貢獻。",
            unmaintained: "停止維護",
        },
        hosting: {
            title: "免費架",
            description: "免費的伺服器（只有 IPv6）。",
            heading: "免費架",
            limit: "限制每人 1 個 HE IPv6，以及 1 核心、1 GB 記憶體的主機",
            manage: "管理主機",
            reportAbuse: "舉報濫用行為",
            footnote: "伺服器爆掉就沒有了，我也有權利移除伺服器。",
        },
        pricing: {
            title: "免費架價格",
            description: "免費 IPv6 主機服務的價格。",
            heading: "VM hosting",
            price: "價格？",
        },
        abuse: {
            title: "舉報濫用行為",
            heading: "檢舉濫用行為",
        },
        notFound: {
            title: "404 找不到這個頁面",
            heading: "404 找不到這個頁面",
            description: "抱歉，您訪問的頁面不存在。",
            instruction: "請檢查網址是否正確，或返回首頁繼續瀏覽。",
            home: "首頁",
        },
        pages: {
            archived: "此頁面已封存，作者：",
            unavailable: "無法顯示內容",
            learnMore: "了解更多",
            heroAlt: "主視覺圖片：",
            loading: "正在載入頁面……",
        },
    },
} as const;
