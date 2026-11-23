// The home lab status page (/hl/status/) puts three sources together:
// - Uptime Kuma's public status page (status.yhw.tw): is each service up,
// - the private Beszel hub: how busy each server is,
// - incidents written in /system-admin/status (convex/statusIncidents.ts).
// Each source fails on its own; the page shows what it could get.

import { BESZEL_EMAIL, BESZEL_PASSWORD, BESZEL_URL } from "astro:env/server";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { convex } from "./convex";

export const KUMA_URL = "https://status.yhw.tw";
const KUMA_SLUG = "page";
const TIMEOUT = 5000;
/** Heartbeat bars per monitor. */
const BEATS = 60;

export type Health = "up" | "down" | "pending" | "maintenance" | "unknown";

export interface Beat {
    health: Health;
    at: number;
}

export interface Monitor {
    id: number;
    name: string;
    health: Health;
    /** 0–1 over the last 24 hours, if Kuma knows it. */
    uptime?: number;
    beats: Beat[];
}

export interface MonitorGroup {
    name: string;
    monitors: Monitor[];
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

const KUMA_HEALTH: Record<number, Health> = { 0: "down", 1: "up", 2: "pending", 3: "maintenance" };

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) });
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
    return (await response.json()) as T;
}

interface KumaPage {
    publicGroupList: { name: string; monitorList: { id: number; name: string }[] }[];
}
interface KumaHeartbeats {
    heartbeatList: Record<string, { status: number; time: string }[]>;
    uptimeList: Record<string, number>;
}

async function getKuma(): Promise<MonitorGroup[]> {
    const [page, beats] = await Promise.all([
        getJson<KumaPage>(`${KUMA_URL}/api/status-page/${KUMA_SLUG}`),
        getJson<KumaHeartbeats>(`${KUMA_URL}/api/status-page/heartbeat/${KUMA_SLUG}`),
    ]);
    return page.publicGroupList.map((group) => ({
        name: group.name,
        monitors: group.monitorList.map((monitor) => {
            // Kuma sends UTC times without a zone: "2026-11-23 03:38:01".
            const list = (beats.heartbeatList[monitor.id] ?? []).slice(-BEATS).map((beat) => ({
                health: KUMA_HEALTH[beat.status] ?? "unknown",
                at: Date.parse(`${beat.time.replace(" ", "T")}Z`),
            }));
            return {
                id: monitor.id,
                name: monitor.name,
                health: list.at(-1)?.health ?? "unknown",
                uptime: beats.uptimeList[`${monitor.id}_24`],
                beats: list,
            };
        }),
    }));
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
    const [kuma, beszel, incidents] = await Promise.all([
        settle(getKuma(), "Uptime Kuma"),
        settle(getBeszel(), "Beszel"),
        settle(convex.query(api.statusIncidents.recent, {}), "incidents"),
    ]);
    const groups = kuma.ok ? kuma.value : [];
    // undefined = Beszel isn't configured; that's not an outage.
    const servers = beszel.ok ? beszel.value : [];
    const allIncidents = incidents.ok ? incidents.value : [];
    const active = allIncidents.filter((incident) => incident.status !== "resolved");
    const health = [...groups.flatMap((group) => group.monitors), ...(servers ?? [])].map((item) => item.health);

    let overall: "operational" | "degraded" | "outage" | "maintenance" | "unknown" = "operational";
    if (!kuma.ok && !beszel.ok) overall = "unknown";
    else if (active.some((incident) => incident.impact === "major")) overall = "outage";
    else if (health.includes("down") || active.some((incident) => incident.impact === "minor")) overall = "degraded";
    else if (active.length > 0 || health.includes("maintenance")) overall = "maintenance";

    return {
        overall,
        groups,
        servers,
        active,
        past: allIncidents.filter((incident) => incident.status === "resolved"),
        failed: {
            kuma: !kuma.ok,
            beszel: !beszel.ok,
            incidents: !incidents.ok,
        },
        checkedAt: Date.now(),
    };
}
