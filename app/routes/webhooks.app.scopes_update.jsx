// app/routes/webhooks.app.scopes_update.jsx
// Fired when app scopes change — re-authenticate the session

import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`[Webhook] ${topic} — shop: ${shop}`);
  // No action needed — Shopify handles re-auth automatically

  return new Response(null, { status: 200 });
};