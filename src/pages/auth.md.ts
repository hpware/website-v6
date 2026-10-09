import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site, url }) => {
  const origin = (site ?? url).origin;
  return new Response(`# Agent authentication\n\nThis site currently exposes public APIs and does not require credentials. If an API requires authentication in the future, discover the issuer and protected-resource metadata at:\n\n- ${origin}/.well-known/oauth-authorization-server\n- ${origin}/.well-known/oauth-protected-resource\n\nAgents should use OAuth 2.0 Authorization Code or Client Credentials as advertised by the authorization server.`, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
};
