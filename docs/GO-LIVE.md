# Going live: replacing campaign-ims.vercel.app with the rebuild

## Why this is needed

The old site (code on `main`) and the rebuild both pointed at one Convex deployment, `blessed-condor-26`
(a **development** deployment). The rebuild replaced that deployment's functions and schema, so the old site
can no longer work, and a development deployment should not serve real traffic anyway. The fix is a separate
**production** Convex deployment for the rebuild, then pointing the Vercel project at it.

## What you do (dashboards only you can reach)

1. **Convex dashboard** > project *election-system* > **Production** deployment > Settings > create a
   **production deploy key**. Save it in a new file `.env.production.local` in this project as one line,
   `CONVEX_DEPLOY_KEY=prod:...`. Do not paste it into chat. Note the production URL (`https://<name>.convex.cloud`).
2. **Vercel dashboard** > project *campaign-ims* > Settings > Environment Variables (scope: Production). Add:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_CONVEX_URL` | the production `.convex.cloud` URL from step 1 |
   | `SERVER_SECRET` | from `.env.production.generated` |
   | `SESSION_SECRET` | from `.env.production.generated` |
   | `JWT_PRIVATE_KEY` | from `.env.production.generated` |
   | `NEXT_PUBLIC_OPERATOR_NAME` | your registered business name (shown in the footer and legal pages) |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | the public contact address for legal and corrections |
   | `NEXT_PUBLIC_OPERATOR_ADDRESS` | postal address (optional) |
   | `NEXT_PUBLIC_ODPC_REGISTRATION` | Data Protection Commissioner registration number, once issued (optional) |
   | `ADMIN_ALLOWED_IPS` | comma-separated IPs allowed to reach `/admin` (optional, recommended) |

3. **Create the platform admin** yourself so no one else sees the password (8+ characters, upper, lower, number):
   `npx convex run --prod bootstrap:createSuperAdmin '{"email":"you@example.com","name":"Your Name","password":"..."}'`

## What gets done on the Convex side (Claude, once the production key exists)

- Generate secrets: `node scripts/generate-production-secrets.mjs`
- Deploy functions and schema to production with the production deploy key
- Set `SERVER_SECRET` and `JWT_JWKS` on the production deployment
- Import the 46,096 polling stations into production
- Run the test suite against production, then remove the test data

## Switching the site over

Merge `rebuild/foundation` into `main` (or set it as the Vercel production branch). Vercel builds and the
live address starts serving the rebuild. Check: the home page shows the county map; `/admin` shows the admin
sign-in; signing up as an aspirant lands on `/<name>/campaign`.

## Rolling back

Vercel keeps previous deployments: Deployments > the old one > Promote to Production. Note the old site
needs the old backend functions, which no longer exist on `blessed-condor-26`, so it will not work again
without redeploying the old Convex code to its own deployment. Rolling back is therefore not recommended.

## Before real campaigns use it

- Legal documents reviewed by a Kenyan advocate; set the operator details above.
- Confirm the retention periods in the Privacy Policy.
- ODPC registration thresholds checked.
- Bulk SMS stays off until the approval workflow and a licensed provider are in place.
