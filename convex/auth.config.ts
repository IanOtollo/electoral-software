// Convex trusts JWTs minted by our Next.js server (see src/lib/server/auth.ts).
// The public key is supplied through the Convex env var JWT_JWKS so no key
// material lives in source control.
const jwks = process.env.JWT_JWKS;

const config = {
  providers: [
    {
      type: "customJwt",
      applicationID: "cms-web",
      issuer: "https://cms.internal",
      jwks: `data:text/plain;charset=utf-8;base64,${btoa(jwks ?? "{\"keys\":[]}")}`,
      algorithm: "RS256",
    },
  ],
};

export default config;
