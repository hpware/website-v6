// The home lab networks drawn on /hl/status/, one diagram per site. Columns go
// left to right (top to bottom on phones). A node can follow a Kener monitor
// (by tag) and/or a Beszel system (by name); its dot then shows that live state.

export interface TopologyNode {
    id: string;
    label: { "zh-TW": string; en: string };
    column: number;
    kener?: string;
    beszel?: string;
}

export interface TopologySite {
    id: string;
    nodes: TopologyNode[];
    links: [from: string, to: string][];
}

const same = (text: string) => ({ "zh-TW": text, en: text });

export const sites: TopologySite[] = [
    {
        id: "main",
        nodes: [
            { id: "hinet", label: { "zh-TW": "HiNET 路由 1", en: "HiNET router 1" }, column: 0 },
            { id: "openwrt-1", label: { "zh-TW": "OpenWRT 路由 1", en: "OpenWRT router 1" }, column: 1, kener: "internal-gw1" },
            { id: "openwrt-2", label: { "zh-TW": "OpenWRT 路由 2", en: "OpenWRT router 2" }, column: 1, kener: "gw2" },
            { id: "firewall", label: same("Firewall"), column: 2, kener: "core-firewall" },
            { id: "core-vm-1", label: same("Core VM 1"), column: 3 },
            { id: "rp", label: same("RP"), column: 3 },
            { id: "core-vm-2", label: same("Core VM 2 (SSO)"), column: 3 },
        ],
        links: [
            ["hinet", "firewall"],
            ["hinet", "openwrt-1"],
            ["hinet", "openwrt-2"],
            ["openwrt-1", "firewall"],
            ["openwrt-2", "firewall"],
            ["firewall", "core-vm-1"],
            ["firewall", "rp"],
            ["firewall", "core-vm-2"],
        ],
    },
    {
        id: "second",
        nodes: [
            { id: "hinet", label: { "zh-TW": "HiNET 路由 2", en: "HiNET router 2" }, column: 0 },
            { id: "firewall", label: same("Firewall"), column: 1 },
            { id: "relayoo", label: same("Relayoo"), column: 2 },
            { id: "rp", label: same("RP"), column: 2 },
        ],
        links: [
            ["hinet", "firewall"],
            ["firewall", "relayoo"],
            ["firewall", "rp"],
        ],
    },
    {
        id: "vultr",
        nodes: [
            { id: "vultr-jp", label: same("Vultr JP VM"), column: 0, kener: "jp-vultr" },
            { id: "analytics", label: same("Analytics"), column: 1, kener: "analytics" },
        ],
        links: [["vultr-jp", "analytics"]],
    },
];
