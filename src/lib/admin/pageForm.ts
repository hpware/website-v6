import { optionalText, requireHttpUrl, text } from "./utils";

const PAGE_TYPES = ["simple", "info", "landing"] as const;

/** Reads and checks the fields from PageFields.astro. */
export function readPageForm(form: FormData) {
    const title = text(form, "title");
    const markdown_content = text(form, "markdown_content");
    if (!title || !markdown_content) throw new Error("Title and content are required.");

    const page_type = PAGE_TYPES.find((type) => type === text(form, "page_type"));
    if (!page_type) throw new Error("Pick a page type.");

    const landing_image = optionalText(form, "landing_image");
    if (landing_image) requireHttpUrl(landing_image, "Landing image");
    if (page_type === "landing" && !landing_image) {
        throw new Error("Landing pages need a landing image.");
    }

    return { title, markdown_content, page_type, landing_image };
}
