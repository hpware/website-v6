import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site, url }) => {
  const issuer = (site ?? url).origin;
  return Response.json({
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    grant_types_supported: ["authorization_code", "client_credentials"],
    response_types_supported: ["code"],
    scopes_supported: ["openid"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
};
