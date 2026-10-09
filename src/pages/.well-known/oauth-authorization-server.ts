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
    agent_auth: {
      register_uri: `${issuer}/auth.md`,
      supported_identity_types: ["human", "agent"],
      credential_types_supported: ["oauth2-bearer"],
      revocation_endpoint: `${issuer}/oauth/revoke`,
    },
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
};
