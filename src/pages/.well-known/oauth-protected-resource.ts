import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site, url }) => {
  const origin = (site ?? url).origin;
  return Response.json({
    resource: `${origin}/api/`,
    authorization_servers: [origin],
    scopes_supported: ["openid"],
    bearer_methods_supported: ["header"],
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
};
