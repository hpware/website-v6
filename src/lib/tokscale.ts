// Fetches a Tokscale profile (https://tokscale.ai) and boils it down to what the AI usage page shows.

export const TOKSCALE_USERNAME = "hpware";
export const TOKSCALE_PROFILE_URL = `https://tokscale.ai/u/${TOKSCALE_USERNAME}`;

interface TokenCounts {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    reasoning: number;
}

// Only the fields of https://tokscale.ai/api/users/<username> used here.
interface TokscaleProfile {
    user: { rank: number | null };
    stats: {
        totalTokens: number;
        totalCost: number;
        inputTokens: number;
        outputTokens: number;
        cacheReadTokens: number;
        cacheWriteTokens: number;
        reasoningTokens: number;
        activeDays: number;
        sessionCount: number;
    };
    chartRange: { start: string; end: string };
    updatedAt: string;
    contributions: {
        date: string;
        totals: { tokens: number; cost: number };
        clients: {
            client: string;
            cost: number;
            messages: number;
            models: Record<
                string,
                TokenCounts & { cost: number; tokens: number; messages: number }
            >;
        }[];
    }[];
}

export const vendors = ["openai", "anthropic", "other"] as const;
export type Vendor = (typeof vendors)[number];

export function vendorOf(model: string): Vendor {
    if (/claude|anthropic/i.test(model)) return "anthropic";
    if (/gpt|codex|openai/i.test(model)) return "openai";
    return "other";
}

export interface DayUsage {
    date: string;
    cost: number;
    tokens: number;
    topModels: { model: string; cost: number }[];
}

export interface MonthUsage {
    month: string; // YYYY-MM
    cost: Record<Vendor, number>;
    tokens: number;
}

export interface ModelUsage {
    model: string;
    vendor: Vendor;
    cost: number;
    tokens: number;
    messages: number;
    days: number;
    lastUsed: string;
}

export interface ClientUsage {
    client: string;
    cost: number;
    tokens: number;
    messages: number;
    days: number;
    topModel: string;
}

export interface AiUsage {
    rank: number | null;
    updatedAt: string;
    firstDay: string;
    totals: TokscaleProfile["stats"];
    past30Days: number;
    biggestDay: DayUsage;
    longestStreak: number;
    currentStreak: number;
    // Every day in the chart range (the past year), including ones with no usage.
    days: DayUsage[];
    months: MonthUsage[];
    weekdays: number[]; // total cost, Sunday first
    vendorCost: Record<Vendor, number>;
    models: ModelUsage[];
    clients: ClientUsage[];
}

const DAY_MS = 86_400_000;
const isoDay = (time: number) => new Date(time).toISOString().slice(0, 10);
const dayTime = (date: string) => Date.parse(`${date}T00:00:00Z`);

export async function getAiUsage(): Promise<AiUsage | null> {
    try {
        const response = await fetch(
            `https://tokscale.ai/api/users/${TOKSCALE_USERNAME}`,
            { signal: AbortSignal.timeout(5000) },
        );
        if (!response.ok) return null;
        return summarize((await response.json()) as TokscaleProfile);
    } catch {
        // Tokscale is down or slow; the page shows a fallback message instead.
        return null;
    }
}

function summarize(profile: TokscaleProfile): AiUsage {
    const contributions = profile.contributions
        .filter((day) => day.totals.cost > 0 || day.totals.tokens > 0)
        .sort((a, b) => a.date.localeCompare(b.date));

    const byDate = new Map<string, DayUsage>();
    const months = new Map<string, MonthUsage>();
    const models = new Map<string, ModelUsage>();
    const clients = new Map<
        string,
        ClientUsage & { modelCost: Map<string, number> }
    >();
    const weekdays = [0, 0, 0, 0, 0, 0, 0];
    const vendorCost: Record<Vendor, number> = { openai: 0, anthropic: 0, other: 0 };

    for (const day of contributions) {
        const dayModels = new Map<string, number>();
        const monthKey = day.date.slice(0, 7);
        const month = months.get(monthKey) ?? {
            month: monthKey,
            cost: { openai: 0, anthropic: 0, other: 0 },
            tokens: 0,
        };
        month.tokens += day.totals.tokens;
        months.set(monthKey, month);
        weekdays[new Date(dayTime(day.date)).getUTCDay()] += day.totals.cost;

        for (const entry of day.clients) {
            const client = clients.get(entry.client) ?? {
                client: entry.client,
                cost: 0,
                tokens: 0,
                messages: 0,
                days: 0,
                topModel: "",
                modelCost: new Map(),
            };
            client.days += 1;
            clients.set(entry.client, client);

            for (const [name, usage] of Object.entries(entry.models)) {
                const vendor = vendorOf(name);
                const model = models.get(name) ?? {
                    model: name,
                    vendor,
                    cost: 0,
                    tokens: 0,
                    messages: 0,
                    days: 0,
                    lastUsed: "",
                };
                model.cost += usage.cost;
                model.tokens += usage.tokens;
                model.messages += usage.messages;
                if (model.lastUsed !== day.date) model.days += 1;
                model.lastUsed = day.date;
                models.set(name, model);

                client.cost += usage.cost;
                client.tokens += usage.tokens;
                client.messages += usage.messages;
                client.modelCost.set(
                    name,
                    (client.modelCost.get(name) ?? 0) + usage.cost,
                );

                month.cost[vendor] += usage.cost;
                vendorCost[vendor] += usage.cost;
                dayModels.set(name, (dayModels.get(name) ?? 0) + usage.cost);
            }
        }

        byDate.set(day.date, {
            date: day.date,
            cost: day.totals.cost,
            tokens: day.totals.tokens,
            topModels: [...dayModels]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([model, cost]) => ({ model, cost })),
        });
    }

    // Streaks of consecutive days with any usage.
    let longestStreak = 0;
    let streak = 0;
    let previous = Number.NaN;
    for (const day of contributions) {
        const time = dayTime(day.date);
        streak = time - previous === DAY_MS ? streak + 1 : 1;
        longestStreak = Math.max(longestStreak, streak);
        previous = time;
    }
    const end = dayTime(profile.chartRange.end);
    const lastActive = contributions.at(-1)?.date;
    const currentStreak =
        lastActive !== undefined && end - dayTime(lastActive) <= DAY_MS
            ? streak
            : 0;

    // The heatmap's year, with empty days filled in.
    const days: DayUsage[] = [];
    for (let time = dayTime(profile.chartRange.start); time <= end; time += DAY_MS) {
        const date = isoDay(time);
        days.push(byDate.get(date) ?? { date, cost: 0, tokens: 0, topModels: [] });
    }

    const allDays = [...byDate.values()];
    const biggestDay = allDays.reduce(
        (top, day) => (day.cost > top.cost ? day : top),
        allDays[0] ?? { date: profile.chartRange.end, cost: 0, tokens: 0, topModels: [] },
    );

    return {
        rank: profile.user.rank,
        updatedAt: profile.updatedAt,
        firstDay: contributions[0]?.date ?? profile.chartRange.start,
        totals: profile.stats,
        past30Days: days.slice(-30).reduce((sum, day) => sum + day.cost, 0),
        biggestDay,
        longestStreak,
        currentStreak,
        days,
        months: fillMonths(months, profile.chartRange.end),
        weekdays,
        vendorCost,
        models: [...models.values()]
            .filter((model) => model.tokens > 0)
            .sort((a, b) => b.cost - a.cost || b.tokens - a.tokens),
        clients: [...clients.values()]
            .filter((client) => client.tokens > 0)
            .map(({ modelCost, ...client }) => ({
                ...client,
                topModel:
                    [...modelCost].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
            }))
            .sort((a, b) => b.cost - a.cost || b.tokens - a.tokens),
    };
}

// Every month from the first one with usage to the current one, so gaps show as empty bars.
function fillMonths(months: Map<string, MonthUsage>, end: string) {
    const filled: MonthUsage[] = [];
    const first = [...months.keys()].sort()[0];
    if (first === undefined) return filled;
    const cursor = new Date(`${first}-01T00:00:00Z`);
    while (cursor.toISOString().slice(0, 7) <= end.slice(0, 7)) {
        const month = cursor.toISOString().slice(0, 7);
        filled.push(
            months.get(month) ?? {
                month,
                cost: { openai: 0, anthropic: 0, other: 0 },
                tokens: 0,
            },
        );
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return filled;
}
