import { vendors, type MonthUsage, type Vendor } from "../../lib/tokscale";
import { formatters, money, TipRow, useTooltip, vendorColor } from "./shared";

type Props = {
    months: MonthUsage[];
    locale: string;
    labels: { vendors: Record<Vendor, string>; total: string; tokens: string };
};

const HEIGHT = 200;

// Rounds a step up to 1, 2 or 5 times a power of ten, for gridlines on round numbers.
function niceStep(raw: number) {
    const power = 10 ** Math.floor(Math.log10(raw));
    return ([1, 2, 5, 10].find((m) => m * power >= raw) ?? 10) * power;
}

// Spend per month as bars stacked by provider.
export default function MonthlyChart({ months, locale, labels }: Props) {
    const formats = formatters(locale);
    const { bind, element } = useTooltip();
    const totals = months.map((month) => vendors.reduce((sum, v) => sum + month.cost[v], 0));
    const peak = Math.max(1, ...totals);
    const step = niceStep(peak / 4);
    const top = Math.ceil(peak / step) * step;
    const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
    const peakIndex = totals.indexOf(peak);

    return (
        <div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {vendors.map((vendor) => (
                    <li key={vendor} className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-[2px]" style={{ background: vendorColor[vendor] }} />
                        {labels.vendors[vendor]}
                    </li>
                ))}
            </ul>

            <div className="mt-6 flex gap-2">
                <div className="relative w-12 shrink-0 text-right text-xs text-muted-foreground" style={{ height: HEIGHT }}>
                    {ticks.map((tick) => (
                        <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ bottom: (tick / top) * HEIGHT }}>
                            ${formats.compact.format(tick)}
                        </span>
                    ))}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="relative" style={{ height: HEIGHT }}>
                        {ticks.map((tick) => (
                            <div
                                key={tick}
                                className="absolute inset-x-0 border-t border-foreground/10"
                                style={{ bottom: (tick / top) * HEIGHT }}
                            />
                        ))}
                        <div className="absolute inset-0 flex items-end gap-[2px]">
                            {months.map((month, index) => (
                                <div
                                    key={month.month}
                                    className="group relative flex h-full flex-1 flex-col-reverse gap-[2px] hover:opacity-80"
                                    {...bind(
                                        <>
                                            <div className="mb-1 text-muted-foreground">
                                                {formats.month.format(new Date(`${month.month}-01`))}
                                            </div>
                                            <TipRow value={money(formats, totals[index])} label={labels.total} />
                                            {vendors.map((vendor) => (
                                                <TipRow
                                                    key={vendor}
                                                    color={vendorColor[vendor]}
                                                    value={money(formats, month.cost[vendor])}
                                                    label={labels.vendors[vendor]}
                                                />
                                            ))}
                                            <TipRow value={formats.compact.format(month.tokens)} label={labels.tokens} />
                                        </>,
                                    )}
                                >
                                    {vendors
                                        .filter((vendor) => month.cost[vendor] > 0)
                                        .map((vendor, i, shown) => (
                                            <div
                                                key={vendor}
                                                className={i === shown.length - 1 ? "rounded-t-[4px]" : ""}
                                                style={{
                                                    height: `${(month.cost[vendor] / top) * 100}%`,
                                                    background: vendorColor[vendor],
                                                }}
                                            />
                                        ))}
                                    {index === peakIndex && (
                                        <span
                                            className="absolute left-1/2 -translate-x-1/2 -translate-y-full pb-1 text-xs whitespace-nowrap"
                                            style={{ bottom: `${(peak / top) * 100}%` }}
                                        >
                                            {formats.usd.format(peak)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-1 flex gap-[2px] text-xs text-muted-foreground">
                        {months.map((month, index) => {
                            const date = new Date(`${month.month}-01`);
                            const show = index === 0 || date.getUTCMonth() % 3 === 0;
                            return (
                                <span key={month.month} className="flex-1 overflow-visible whitespace-nowrap">
                                    {show &&
                                        (date.getUTCMonth() === 0 || index === 0
                                            ? date.getUTCFullYear()
                                            : formats.monthShort.format(date))}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>
            {element}
        </div>
    );
}
