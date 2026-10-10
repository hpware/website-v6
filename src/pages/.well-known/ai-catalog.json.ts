import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site, url }) => {
  const origin = (site ?? url).origin;
  return new Response(JSON.stringify({
    specVersion: "0.1.0",
    host: { url: origin, name: "yuanhau.com" },
    entries: [
      { identifier: `urn:air:${new URL(origin).hostname}:api:openapi`, displayName: "Public OpenAPI", type: "application/vnd.oai.openapi+json;version=3.1", url: `${origin}/openapi.json`, representativeQueries: ["What APIs are available?", "How do I read published content?"] },
      { identifier: `urn:air:${new URL(origin).hostname}:agent:a2a`, displayName: "Yuan Hau agent", type: "application/json", url: `${origin}/.well-known/agent-card.json`, representativeQueries: ["Discover the site agent", "Read public content through an agent"] },
      { identifier: `urn:air:${new URL(origin).hostname}:mcp:server-card`, displayName: "Yuan Hau MCP server", type: "application/json", url: `${origin}/.well-known/mcp/server-card.json`, representativeQueries: ["Find browser tools", "Use site tools"] },
    ],
  }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
};
