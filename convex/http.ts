import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Callbacks from Africa's Talking. They cannot sign their requests, so each URL carries a secret
 * (AT_CALLBACK_SECRET) that only the dashboard configuration knows. Without the secret set, they are refused.
 */
function allowed(req: Request) {
  const secret = process.env.AT_CALLBACK_SECRET;
  const given = new URL(req.url).searchParams.get("key") ?? "";
  if (!secret || secret.length < 16 || given.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= secret.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

const http = httpRouter();

http.route({
  path: "/sms/delivery",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!allowed(req)) return new Response("Not allowed", { status: 403 });
    const f = await req.formData();
    const id = String(f.get("id") ?? "");
    const status = String(f.get("status") ?? "");
    if (id && status) await ctx.runMutation(internal.smsSend.deliveryReport, { id, status, failureReason: f.get("failureReason") ? String(f.get("failureReason")) : undefined });
    return new Response("OK");
  }),
});

http.route({
  path: "/sms/incoming",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!allowed(req)) return new Response("Not allowed", { status: 403 });
    const f = await req.formData();
    const from = String(f.get("from") ?? "");
    const text = String(f.get("text") ?? "");
    if (from && text) await ctx.runMutation(internal.smsSend.incomingReply, { from, text });
    return new Response("OK");
  }),
});

export default http;
