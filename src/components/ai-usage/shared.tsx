import { useState, type PointerEvent, type ReactNode } from "react";
import type { Vendor } from "../../lib/tokscale";

export function formatters(locale: string) {
    return {
        usd: new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
        }),
        // For small amounts, where rounding to whole dollars would show $0.
        usdCents: new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 2,
        }),
        compact: new Intl.NumberFormat(locale, {
            notation: "compact",
            maximumFractionDigits: 1,
        }),
        number: new Intl.NumberFormat(locale),
        day: new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeZone: "UTC",
        }),
        weekday: new Intl.DateTimeFormat(locale, {
            weekday: "short",
            timeZone: "UTC",
        }),
        month: new Intl.DateTimeFormat(locale, {
            month: "short",
            year: "numeric",
            timeZone: "UTC",
        }),
        monthShort: new Intl.DateTimeFormat(locale, {
            month: "short",
            timeZone: "UTC",
        }),
    };
}

export const money = (formats: ReturnType<typeof formatters>, value: number) =>
    value > 0 && value < 10 ? formats.usdCents.format(value) : formats.usd.format(value);

export const vendorColor: Record<Vendor, string> = {
    openai: "var(--series-openai)",
    anthropic: "var(--series-anthropic)",
    other: "var(--series-other)",
};

// A hover tooltip that follows the pointer. Charts spread `bind(content)` onto each mark.
export function useTooltip() {
    const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);

    const bind = (content: ReactNode) => ({
        onPointerMove: (event: PointerEvent) =>
            setTip({ x: event.clientX, y: event.clientY, content }),
        onPointerLeave: () => setTip(null),
    });

    const flipLeft = tip !== null && tip.x > window.innerWidth - 240;
    const element =
        tip === null ? null : (
            <div
                role="tooltip"
                className="pointer-events-none fixed z-50 min-w-40 rounded-lg border border-accent bg-background px-3 py-2 text-sm shadow-lg"
                style={{
                    left: tip.x + (flipLeft ? -12 : 12),
                    top: tip.y + 12,
                    transform: flipLeft ? "translateX(-100%)" : undefined,
                }}
            >
                {tip.content}
            </div>
        );

    return { bind, element, hide: () => setTip(null) };
}

// One tooltip row: a short line in the series color, the value, then its label.
export function TipRow({ color, value, label }: { color?: string; value: string; label: string }) {
    return (
        <div className="flex items-center gap-2">
            {color && <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: color }} />}
            <strong className="font-bold">{value}</strong>
            <span className="text-muted-foreground">{label}</span>
        </div>
    );
}
