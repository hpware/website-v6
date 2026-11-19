import { useEffect, useRef, useState } from "react";
import type { DayUsage } from "../../lib/tokscale";
import { formatters, money, TipRow, useTooltip } from "./shared";

type Metric = "cost" | "tokens";

type Props = {
    days: DayUsage[];
    locale: string;
    labels: { cost: string; tokens: string; less: string; more: string; noUsage: string };
};

const CELL = 10;
const GAP = 3;

// Past year, one column per week (Sunday on top). Shades use a log scale so a few
// heavy days don't wash out every other day.
export default function Heatmap({ days, locale, labels }: Props) {
    const formats = formatters(locale);
    const { bind, element, hide } = useTooltip();
    const [metric, setMetric] = useState<Metric>("cost");
    const scroller = useRef<HTMLDivElement>(null);

    // Start scrolled to the latest weeks on narrow screens.
    useEffect(() => {
        scroller.current?.scrollTo({ left: scroller.current.scrollWidth });
    }, []);

    const maxLog = Math.log1p(Math.max(0, ...days.map((day) => day[metric])));
    const level = (value: number) =>
        value <= 0 || maxLog === 0 ? 0 : Math.max(1, Math.ceil((Math.log1p(value) / maxLog) * 4));

    // Pad the start so the first column begins on a Sunday.
    const lead = days.length > 0 ? new Date(`${days[0].date}T00:00:00Z`).getUTCDay() : 0;
    const cells: (DayUsage | null)[] = [...Array<null>(lead).fill(null), ...days];
    const weeks: (DayUsage | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    // A month label above the first week that contains that month's 1st.
    const monthLabels = weeks.map((week, index) => {
        const first = week.find((day) => day?.date.endsWith("-01"));
        return first && index < weeks.length - 1
            ? formats.monthShort.format(new Date(`${first.date}T00:00:00Z`))
            : null;
    });

    return (
        <div>
            <div className="inline-flex rounded-lg border border-foreground/10 p-0.5 text-sm" role="group">
                {(["cost", "tokens"] as const).map((option) => (
                    <button
                        key={option}
                        type="button"
                        aria-pressed={metric === option}
                        onClick={() => setMetric(option)}
                        className="rounded-md px-3 py-1 transition-colors hover:bg-foreground/10 hover:cursor-pointer aria-pressed:bg-foreground/10"
                    >
                        {labels[option]}
                    </button>
                ))}
            </div>

            <div ref={scroller} className="mt-4 overflow-x-auto pb-2" onScroll={hide}>
                <div className="flex w-max gap-2">
                    <div
                        className="grid shrink-0 text-xs text-muted-foreground"
                        style={{ gridTemplateRows: `${CELL + 6}px repeat(7, ${CELL}px)`, rowGap: GAP }}
                    >
                        {[1, 3, 5].map((weekday) => (
                            <span
                                key={weekday}
                                className="leading-none"
                                style={{ gridRow: weekday + 2 }}
                            >
                                {formats.weekday.format(new Date(Date.UTC(2023, 0, 1 + weekday)))}
                            </span>
                        ))}
                    </div>
                    <div className="flex" style={{ gap: GAP }}>
                        {weeks.map((week, index) => (
                            <div key={index} className="flex flex-col" style={{ gap: GAP }}>
                                <span className="relative text-xs leading-none text-muted-foreground" style={{ height: CELL + 6 - GAP }}>
                                    {monthLabels[index] && (
                                        <span className="absolute whitespace-nowrap">{monthLabels[index]}</span>
                                    )}
                                </span>
                                {week.map((day, row) =>
                                    day === null ? (
                                        <span key={row} style={{ width: CELL, height: CELL }} />
                                    ) : (
                                        <span
                                            key={day.date}
                                            className="rounded-[2px] hover:outline-2 hover:outline-foreground"
                                            style={{
                                                width: CELL,
                                                height: CELL,
                                                background: `var(--seq-${level(day[metric])})`,
                                            }}
                                            {...bind(
                                                <>
                                                    <div className="mb-1 text-muted-foreground">
                                                        {formats.day.format(new Date(`${day.date}T00:00:00Z`))}
                                                    </div>
                                                    {day.tokens === 0 ? (
                                                        <div>{labels.noUsage}</div>
                                                    ) : (
                                                        <>
                                                            <TipRow value={money(formats, day.cost)} label={labels.cost} />
                                                            <TipRow value={formats.compact.format(day.tokens)} label={labels.tokens} />
                                                            {day.topModels.length > 0 && (
                                                                <div className="mt-1 border-t border-foreground/10 pt-1">
                                                                    {day.topModels.map((model) => (
                                                                        <TipRow
                                                                            key={model.model}
                                                                            value={money(formats, model.cost)}
                                                                            label={model.model}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </>,
                                            )}
                                        />
                                    ),
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-2 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                {labels.less}
                {[0, 1, 2, 3, 4].map((step) => (
                    <span
                        key={step}
                        className="rounded-[2px]"
                        style={{ width: CELL, height: CELL, background: `var(--seq-${step})` }}
                    />
                ))}
                {labels.more}
            </div>
            {element}
        </div>
    );
}
