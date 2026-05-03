// app/routes/webhooks.orders.cancelled.jsx
// Fired when an order is cancelled
// Updates: RtoStats, logs AnalyticsEvent

import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[Webhook] ${topic} — shop: ${shop}, order: ${payload.name}, reason: ${payload.cancel_reason}`);

  // Log analytics event for cancellation
  try {
    await db.analyticsEvent.create({
      data: {
        shop,
        event: "order_cancelled",
        orderId: String(payload.id),
        value: parseFloat(payload.total_price ?? 0),
        metadata: JSON.stringify({
          orderName: payload.name,
          cancelReason: payload.cancel_reason,
          cancelledAt: payload.cancelled_at,
        }),
      },
    });
  } catch (e) {
    console.error(`[Webhook] AnalyticsEvent create failed:`, e.message);
  }

  // If cancelled due to delivery failure — count as RTO
  const isRto = ["customer", "declined"].includes(payload.cancel_reason);
  if (isRto) {
    try {
      const existing = await db.rtoStats.findUnique({ where: { shop } });
      if (existing) {
        const newRtoCount = existing.rtoCount + 1;
        const rtoRate = existing.totalOrders > 0
          ? parseFloat(((newRtoCount / existing.totalOrders) * 100).toFixed(2))
          : 0;

        await db.rtoStats.update({
          where: { shop },
          data: { rtoCount: { increment: 1 }, rtoRate },
        });
      }
    } catch (e) {
      console.error(`[Webhook] RtoStats update failed:`, e.message);
    }
  }

  return new Response(null, { status: 200 });
};