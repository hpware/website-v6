import { useState } from "react";
import type { ModelUsage, Vendor } from "../../lib/tokscale";
import { formatters, money, vendorColor } from "./shared";

type SortKey = "model" | "cost" | "tokens";

type Props = {
    models: ModelUsage[];
    locale: string;
    labels: {
        search: string;
        columns: Record<SortKey, string>;
        vendors: Record<Vendor, string>;
        showAll: string;
        showLess: string;
        noMatch: string;
    };
};

const COLLAPSED_ROWS = 15;

// Every model, sortable by any column and searchable by name.
export default function ModelTable({ models, locale, labels }: Props) {
    const formats = formatters(locale);
    const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({
        key: "cost",
        descending: true,
    });
    const [query, setQuery] = useState("");
    const [expanded, setExpanded] = useState(false);

    const rows = models
        .filter((model) => model.model.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => {
            const order =
                typeof a[sort.key] === "string"
                    ? String(a[sort.key]).localeCompare(String(b[sort.key]))
                    : Number(a[sort.key]) - Number(b[sort.key]);
            return sort.descending ? -order : order;
        });
    const visible = expanded || query !== "" ? rows : rows.slice(0, COLLAPSED_ROWS);

    const header = (key: SortKey, align: "left" | "right") => (
        <th
            scope="col"
            aria-sort={sort.key === key ? (sort.descending ? "descending" : "ascending") : "none"}
            className={`px-2 py-2 font-normal whitespace-nowrap ${align === "right" ? "text-right" : "text-left"}`}
        >
            <button
                type="button"
                className="hover:cursor-pointer hover:underline"
                onClick={() =>
                    setSort((current) => ({
                        key,
                        descending: current.key === key ? !current.descending : key !== "model",
                    }))
                }
            >
                {labels.columns[key]}
                {sort.key === key && (sort.descending ? " ↓" : " ↑")}
            </button>
        </th>
    );

    return (
        <div>
            <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.search}
                aria-label={labels.search}
                className="w-full rounded-lg border border-accent bg-transparent px-3 py-2 text-sm sm:w-72"
            />

            <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b border-muted-foreground/30 text-muted-foreground">
                        <tr>
                            {header("model", "left")}
                            {header("cost", "right")}
                            {header("tokens", "right")}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((model) => (
                            <tr key={model.model} className="border-b border-muted-foreground/10">
                                <td className="px-2 py-2 whitespace-nowrap">
                                    <span className="flex items-center gap-2">
                                        <span
                                            className="size-2 shrink-0 rounded-full"
                                            style={{ background: vendorColor[model.vendor] }}
                                            title={labels.vendors[model.vendor]}
                                        />
                                        <code>{model.model}</code>
                                    </span>
                                </td>
                                <td className="px-2 py-2 text-right whitespace-nowrap">{money(formats, model.cost)}</td>
                                <td className="px-2 py-2 text-right whitespace-nowrap">{formats.compact.format(model.tokens)}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-2 py-6 text-center text-muted-foreground">
                                    {labels.noMatch}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {query === "" && rows.length > COLLAPSED_ROWS && (
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="mt-3 text-sm underline hover:cursor-pointer"
                >
                    {expanded ? labels.showLess : labels.showAll.replace("{count}", String(rows.length))}
                </button>
            )}
        </div>
    );
}
