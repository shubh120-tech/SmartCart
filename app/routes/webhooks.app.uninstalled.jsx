// app/routes/webhooks.app.uninstalled.jsx
// Fired when a merchant uninstalls SmartCart Pro
// Cleans up all shop data from the database

import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`[Webhook] ${topic} — shop: ${shop}`);

  // Delete all sessions for this shop
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  // Clean up all shop settings
  const cleanupTasks = [
    db.codSettings.deleteMany({ where: { shop } }).catch(() => {}),
    db.rtoStats.deleteMany({ where: { shop } }).catch(() => {}),
    db.trackingSettings.deleteMany({ where: { shop } }).catch(() => {}),
    db.smartCartSettings.deleteMany({ where: { shop } }).catch(() => {}),
    db.shippingSettings.deleteMany({ where: { shop } }).catch(() => {}),
    db.appSettings.deleteMany({ where: { shop } }).catch(() => {}),
    db.analyticsEvent.deleteMany({ where: { shop } }).catch(() => {}),
  ];

  await Promise.all(cleanupTasks);

  console.log(`[Webhook] Cleanup complete for shop: ${shop}`);

  return new Response(null, { status: 200 });
};