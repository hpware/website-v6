import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

/** Wildcards alone never opt a browser into Markdown; ties favor HTML. */
export function prefersMarkdown(accept: string | null): boolean {
    const ranges = (accept ?? "").split(",").map((part) => {
        const [type = "", ...parameters] = part.trim().toLowerCase().split(";");
        const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith("q="));
        const value = qualityParameter ? qualityParameter.trim().slice(2) : "1";
        const quality = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(value) ? Number(value) : 0;
        return { type: type.trim(), quality };
    });

    const markdown = Math.max(0, ...ranges.filter(({ type }) => type === "text/markdown").map(({ quality }) => quality));
    const htmlRange = ["text/html", "text/*", "*/*"]
        .map((type) => ranges.filter((range) => range.type === type))
        .find((matches) => matches.length > 0);
    const html = Math.max(0, ...(htmlRange ?? []).map(({ quality }) => quality));
    return markdown > html;
}

export function htmlToMarkdown(html: string): string {
    const converter = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        bulletListMarker: "-",
    });
    converter.use(gfm);
    converter.remove(["head", "header", "footer", "nav", "script", "style", "button", "input", "select", "textarea"]);
    return `${converter.turndown(html).trim()}\n`;
}

export async function negotiateMarkdown(request: Request, response: Response): Promise<Response> {
    if (!['GET', 'HEAD'].includes(request.method) ||
        response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "text/html" ||
        response.status < 200 || response.status >= 300) {
        return response;
    }

    const headers = new Headers(response.headers);
    const vary = (headers.get("Vary") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    if (!vary.some((value) => value === "*" || value.toLowerCase() === "accept")) {
        vary.push("Accept");
    }
    headers.set("Vary", vary.join(", "));

    if (!prefersMarkdown(request.headers.get("Accept"))) {
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }

    headers.set("Content-Type", "text/markdown; charset=utf-8");
    for (const name of ["Content-Length", "Content-Encoding", "ETag", "Content-MD5"]) {
        headers.delete(name);
    }
    const body = request.method === "HEAD" ? null : htmlToMarkdown(await response.text());
    return new Response(body, { status: response.status, statusText: response.statusText, headers });
}
