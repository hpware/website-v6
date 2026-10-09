import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site, url }) => {
  const origin = (site ?? url).origin;
  return new Response(JSON.stringify({
    linkset: [{
      anchor: `${origin}/api/`,
      link: [
        { rel: ["service-desc"], href: `${origin}/openapi.json`, type: "application/vnd.oai.openapi+json;version=3.1" },
        { rel: ["service-doc"], href: `${origin}/llms.txt`, type: "text/plain" },
        { rel: ["status"], href: `${origin}/api/health`, type: "application/json" },
      ],
      "service-desc": [{ href: `${origin}/openapi.json`, type: "application/vnd.oai.openapi+json;version=3.1" }],
      "service-doc": [{ href: `${origin}/llms.txt`, type: "text/plain" }],
      status: [{ href: `${origin}/api/health`, type: "application/json" }],
    }],
  }), { headers: { "Content-Type": "application/linkset+json", "Access-Control-Allow-Origin": "*" } });
};
