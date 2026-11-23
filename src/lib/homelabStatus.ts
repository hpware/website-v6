// The home lab status page (/hl/status/) puts three sources together:
// - Kener (KENER_URL): is each service up, day by day,
// - the private Beszel hub: how busy each server is,
// - incidents written in /system-admin/status (convex/statusIncidents.ts).
// Each source fails on its own; the page shows what it could get.

import { BESZEL_EMAIL, BESZEL_PASSWORD, BESZEL_URL, KENER_URL } from "astro:env/server";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { convex } from "./convex";

export const kenerUrl = KENER_URL.replace(/\/+$/, "");
const TIMEOUT = 5000;
/** Daily bars per monitor. */
const DAYS = 30;

export type Health = "up" | "degraded" | "down" | "pending" | "maintenance" | "unknown";

export interface Day {
    health: Health;
    /** Start of the day (Asia/Taipei), ms. */
    at: number;
    /** 0–1, undefined without data. */
    uptime?: number;
}

export interface Monitor {
    tag: string;
    name: string;
    health: Health;
    /** 0–1 over the last DAYS days, if Kener knows it. */
    uptime?: number;
    days: Day[];
}

export interface Server {
    name: string;
    health: Health;
    /** Percentages. */
    cpu?: number;
    memory?: number;
    disk?: number;
    /** Seconds. */
    uptime?: number;
}

export type Incident = Doc<"status_incidents">;

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) });
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
    return (await response.json()) as T;
}

// Kener's /api/v4 needs an API key with full write access, so this reads what
// its own public page reads instead: the home page's data (which monitors are
// public) and /dashboard-apis/monitor-bars (their state and daily counts).
// Hidden monitors stay hidden.

/** The public monitor tags from SvelteKit's flattened page data. */
async function getKenerTags() {
    const page = await getJson<{ nodes?: ({ data?: unknown[] } | null)[] }>(`${kenerUrl}/__data.json`);
    for (const node of page.nodes ?? []) {
        const data = node?.data;
        const root = data?.[0] as Record<string, number> | undefined;
        if (data && root && typeof root.monitorTags === "number") {
            return (data[root.monitorTags] as number[]).map((index) => data[index] as string);
        }
    }
    throw new Error("Kener's page data has no monitor tags.");
}

interface KenerCount {
    ts: number;
    countOfUp: number;
    countOfDown: number;
    countOfDegraded: number;
    countOfMaintenance: number;
}
interface KenerBars {
    data: Record<string, { name: string; currentStatus: string; uptime: string; uptimeData: KenerCount[] }>;
}

const KENER_HEALTH: Record<string, Health> = {
    UP: "up",
    DEGRADED: "degraded",
    DOWN: "down",
    MAINTENANCE: "maintenance",
};

function dayOf(count: KenerCount): Day {
    const total = count.countOfUp + count.countOfDown + count.countOfDegraded + count.countOfMaintenance;
    const health: Health =
        total === 0
            ? "unknown"
            : count.countOfDown > 0
              ? "down"
              : count.countOfDegraded > 0
                ? "degraded"
                : count.countOfMaintenance > 0
                  ? "maintenance"
                  : "up";
    return { health, at: count.ts * 1000, uptime: total ? (total - count.countOfDown) / total : undefined };
}

async function getKener(): Promise<Monitor[]> {
    const tags = await getKenerTags();
    if (tags.length === 0) return [];
    // Days end at midnight in Taipei, so each bar is one local day.
    const offset = 8 * 3600;
    const endOfToday = Math.ceil((Date.now() / 1000 + offset) / 86400) * 86400 - offset;
    const query = new URLSearchParams({ tags: tags.join(","), days: String(DAYS), endOfDayTodayAtTz: String(endOfToday) });
    const bars = await getJson<KenerBars>(`${kenerUrl}/dashboard-apis/monitor-bars?${query}`);
    return tags
        .filter((tag) => bars.data[tag])
        .map((tag) => {
            const bar = bars.data[tag];
            const uptime = Number.parseFloat(bar.uptime);
            return {
                tag,
                name: bar.name,
                health: KENER_HEALTH[bar.currentStatus] ?? "unknown",
                uptime: Number.isFinite(uptime) ? uptime / 100 : undefined,
                days: bar.uptimeData.map(dayOf),
            };
        });
}

// Beszel is PocketBase underneath. The token lasts for days; keep it for an
// hour in this server instance instead of signing in on every render.
let beszelToken: { value: string; until: number } | undefined;

async function beszelSignIn(base: string) {
    if (beszelToken && beszelToken.until > Date.now()) return beszelToken.value;
    const { token } = await getJson<{ token: string }>(`${base}/api/collections/users/auth-with-password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identity: BESZEL_EMAIL, password: BESZEL_PASSWORD }),
    });
    beszelToken = { value: token, until: Date.now() + 60 * 60 * 1000 };
    return token;
}

interface BeszelSystem {
    name: string;
    status: string;
    info?: { cpu?: number; mp?: number; dp?: number; u?: number };
}

const BESZEL_HEALTH: Record<string, Health> = { up: "up", down: "down", pending: "pending", paused: "maintenance" };

async function getBeszel(): Promise<Server[] | undefined> {
    if (!BESZEL_URL || !BESZEL_EMAIL || !BESZEL_PASSWORD) return undefined;
    const base = BESZEL_URL.replace(/\/+$/, "");
    // Only these fields leave Beszel: never host, port or the owner list.
    const url = `${base}/api/collections/systems/records?perPage=200&sort=name&fields=name,status,info`;
    const read = async () =>
        getJson<{ items: BeszelSystem[] }>(url, { headers: { Authorization: await beszelSignIn(base) } });
    let result;
    try {
        result = await read();
    } catch {
        // The kept token may have expired; sign in again once.
        beszelToken = undefined;
        result = await read();
    }
    return result.items.map((system) => ({
        name: system.name,
        health: BESZEL_HEALTH[system.status] ?? "unknown",
        cpu: system.info?.cpu,
        memory: system.info?.mp,
        disk: system.info?.dp,
        uptime: system.info?.u,
    }));
}

async function settle<T>(promise: Promise<T>, label: string) {
    try {
        return { ok: true as const, value: await promise };
    } catch (error) {
        console.error(`Status page: ${label} failed`, error);
        return { ok: false as const };
    }
}

export async function getHomelabStatus() {
    const [kener, beszel, incidents] = await Promise.all([
        settle(getKener(), "Kener"),
        settle(getBeszel(), "Beszel"),
        settle(convex.query(api.statusIncidents.recent, {}), "incidents"),
    ]);
    const monitors = kener.ok ? kener.value : [];
    // undefined = Beszel isn't configured; that's not an outage.
    const servers = beszel.ok ? beszel.value : [];
    const allIncidents = incidents.ok ? incidents.value : [];
    const active = allIncidents.filter((incident) => incident.status !== "resolved");
    const health = [...monitors, ...(servers ?? [])].map((item) => item.health);

    let overall: "operational" | "degraded" | "outage" | "maintenance" | "unknown" = "operational";
    if (!kener.ok && !beszel.ok) overall = "unknown";
    else if (active.some((incident) => incident.impact === "major")) overall = "outage";
    else if (health.includes("down") || health.includes("degraded") || active.some((incident) => incident.impact === "minor")) overall = "degraded";
    else if (active.length > 0 || health.includes("maintenance")) overall = "maintenance";

    return {
        overall,
        monitors,
        servers,
        active,
        past: allIncidents.filter((incident) => incident.status === "resolved"),
        failed: {
            kener: !kener.ok,
            beszel: !beszel.ok,
            incidents: !incidents.ok,
        },
        checkedAt: Date.now(),
    };
}
