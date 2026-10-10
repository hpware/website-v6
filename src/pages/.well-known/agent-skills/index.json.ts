import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site, url }) => {
  const origin = (site ?? url).origin;
  return Response.json({
    $schema: "https://raw.githubusercontent.com/cloudflare/agent-skills-discovery-rfc/main/schema/agent-skills.schema.json",
    skills: [
      { name: "api-catalog", type: "skill-md", description: "Discover public APIs published by yuanhau.com.", url: `${origin}/.well-known/agent-skills/api-catalog/SKILL.md`, sha256: "ce3170b1d983f8969df84f45be3206a18a80d7c0151f561a85ba86dd2f6e4a6e" },
      { name: "oauth-discovery", type: "skill-md", description: "Discover OAuth authorization metadata.", url: `${origin}/.well-known/agent-skills/oauth-discovery/SKILL.md`, sha256: "cef1d00795d6673e4678ae00f86ee006cde73406524eda1bdba3010e7a115202" },
    ],
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
};
