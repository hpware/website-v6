export type AchievementIcon = "scroll" | "award" | "flag" | "building";

export interface AchievementData {
    icon: AchievementIcon;
    title: string;
    date: string;
    description: string;
}

export const achievements: AchievementData[] = [
    {
        icon: "scroll",
        title: "電腦軟題應用丙級證照",
        date: "2025",
        description: "爛爛的證照",
    },
    {
        icon: "scroll",
        title: "電腦硬體裝修丙級證照",
        date: "2025",
        description: "還算簡單",
    },
    {
        icon: "scroll",
        title: "工業電子丙級證照",
        date: "2026",
        description: "沒有爆炸 :)\n然後悍的很爛",
    },
];
