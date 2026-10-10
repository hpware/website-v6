import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site, url }) => {
  const origin = (site ?? url).origin;
  return Response.json({
    serverInfo: { name: "yuanhau.com", version: "1.0.0" },
    description: "Public content tools for yuanhau.com.",
    transport: { type: "streamable-http", url: `${origin}/api/mcp`, endpoint: `${origin}/api/mcp` },
    capabilities: { tools: true, resources: false, prompts: false },
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
};
