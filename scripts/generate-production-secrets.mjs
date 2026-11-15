// Generates fresh production secrets. Never reuse the development ones.
//
//   node scripts/generate-production-secrets.mjs
//
// Writes .env.production.generated (git-ignored; delete it once the values are in Vercel and Convex).
// It prints variable NAMES only, never values.
import { generateKeyPair, exportPKCS8, exportJWK } from "jose";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

const out = ".env.production.generated";
if (existsSync(out)) {
  console.error(`${out} already exists. Delete it first if you really want new secrets (existing deployments would stop accepting old sessions).`);
  process.exit(1);
}

const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
const jwk = await exportJWK(publicKey);
jwk.kid = "cms-1";
jwk.alg = "RS256";
jwk.use = "sig";

const vars = {
  // ---- Vercel (Project > Settings > Environment Variables, scope: Production) ----
  SERVER_SECRET: randomBytes(32).toString("hex"), // also set on Convex
  SESSION_SECRET: randomBytes(32).toString("hex"),
  JWT_PRIVATE_KEY: Buffer.from(await exportPKCS8(privateKey)).toString("base64"),
  // ---- Convex production (Dashboard > Production > Settings > Environment Variables) ----
  JWT_JWKS: JSON.stringify({ keys: [jwk] }),
};

const header = [
  "# Fresh production secrets. Keep private. Delete this file after use.",
  "# Vercel needs: SERVER_SECRET, SESSION_SECRET, JWT_PRIVATE_KEY, NEXT_PUBLIC_CONVEX_URL (your PRODUCTION .convex.cloud address)",
  "# Convex production needs: SERVER_SECRET (same value as Vercel), JWT_JWKS",
  "",
].join("\n");
writeFileSync(out, header + Object.entries(vars).map(([k, v]) => `${k}=${v}`).join("\n") + "\n", { mode: 0o600 });
console.log(`Wrote ${out} with: ${Object.keys(vars).join(", ")}`);
