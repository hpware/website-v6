// The home lab network drawn on /hl/status/. Columns go left to right
// (top to bottom on phones). A node can follow a Kener monitor (by tag) and/or
// a Beszel system (by name); its dot then shows that live state.

export interface TopologyNode {
    id: string;
    label: { "zh-TW": string; en: string };
    column: number;
    kener?: string;
    beszel?: string;
}

export const nodes: TopologyNode[] = [
    { id: "hinet", label: { "zh-TW": "HiNET 路由", en: "HiNET router" }, column: 0 },
    { id: "openwrt-1", label: { "zh-TW": "OpenWRT 路由 1", en: "OpenWRT router 1" }, column: 1 },
    { id: "openwrt-2", label: { "zh-TW": "OpenWRT 路由 2", en: "OpenWRT router 2" }, column: 1 },
    { id: "firewall", label: { "zh-TW": "Firewall", en: "Firewall" }, column: 2, kener: "core-firewall" },
    { id: "core-vm-1", label: { "zh-TW": "Core VM 1", en: "Core VM 1" }, column: 3 },
    { id: "rp", label: { "zh-TW": "RP", en: "RP" }, column: 3 },
    { id: "core-vm-2", label: { "zh-TW": "Core VM 2 (SSO)", en: "Core VM 2 (SSO)" }, column: 3 },
];

export const links: [from: string, to: string][] = [
    ["hinet", "firewall"],
    ["hinet", "openwrt-1"],
    ["hinet", "openwrt-2"],
    ["openwrt-1", "firewall"],
    ["openwrt-2", "firewall"],
    ["firewall", "core-vm-1"],
    ["firewall", "rp"],
    ["firewall", "core-vm-2"],
];
