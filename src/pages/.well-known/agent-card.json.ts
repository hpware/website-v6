import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site, url }) => {
  const origin = (site ?? url).origin;
  return Response.json({
    name: "yuanhau.com agent",
    version: "1.0.0",
    description: "An agent interface for discovering and reading public yuanhau.com content.",
    supportedInterfaces: [{ url: `${origin}/api/agent`, protocolBinding: "HTTP+JSON", transportProtocol: "HTTP+JSON" }],
    capabilities: { streaming: false, pushNotifications: false },
    skills: [
      { id: "read-content", name: "Read content", description: "Retrieve published markdown content." },
      { id: "discover-apis", name: "Discover APIs", description: "Inspect the public API catalog and OpenAPI document." },
    ],
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
};
