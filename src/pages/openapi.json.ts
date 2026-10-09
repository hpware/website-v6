import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site, url }) => {
  const origin = (site ?? url).origin;
  return Response.json({
    openapi: "3.1.0",
    info: {
      title: "Yuan Hau API",
      version: "1.0.0",
      description: "Public content APIs for yuanhau.com.",
    },
    servers: [{ url: origin }],
    paths: {
      "/api/health": {
        get: {
          operationId: "health",
          summary: "Check API health",
          responses: { "200": { description: "The API is healthy." } },
        },
      },
      "/api/ask": {
        get: {
          operationId: "ask",
          summary: "API availability notice",
          responses: { "200": { description: "Current API availability." } },
        },
      },
      "/api/mdcontent/{slug}": {
        get: {
          operationId: "getMarkdownContent",
          summary: "Get published markdown content",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Published content." },
            "404": { description: "Content not found." },
          },
        },
      },
    },
  });
};
