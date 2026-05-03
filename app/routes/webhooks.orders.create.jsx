// app/routes/webhooks.orders.create.jsx
// Fired when a new order is placed
// Updates: RtoStats (codOrders, totalOrders)
// Logs:    AnalyticsEvent for COD vs prepaid

import { authenticate } from "../shopify.server";
import db from "../db.server";

const isCodOrder = (order) => {
  const gateways = order.payment_gateway_names ?? [];
  return gateways.some(g =>
    g.toLowerCase().includes("cod") || g.toLowerCase().includes("cash")
  );
};

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[Webhook] ${topic} — shop: ${shop}, order: ${payload.name}`);

  const isCod = isCodOrder(payload);
  const orderValue = parseFloat(payload.total_price ?? 0);

  // ── Update RTO stats ──────────────────────────────────────────────────────
  try {
    const existing = await db.rtoStats.findUnique({ where: { shop } });

    if (existing) {
      await db.rtoStats.update({
        where: { shop },
        data: {
          totalOrders: { increment: 1 },
          codOrders: isCod ? { increment: 1 } : undefined,
          // Recalculate RTO rate
          rtoRate: existing.totalOrders > 0
            ? parseFloat(((existing.rtoCount / (existing.totalOrders + 1)) * 100).toFixed(2))
            : 0,
        },
      });
    } else {
      await db.rtoStats.create({
        data: {
          shop,
          totalOrders: 1,
          codOrders: isCod ? 1 : 0,
          rtoCount: 0,
          rtoRate: 0,
          savedByVerification: 0,
          prepaidConversions: 0,
        },
      });
    }
  } catch (e) {
    console.error(`[Webhook] RtoStats update failed:`, e.message);
  }

  // ── Log analytics event ───────────────────────────────────────────────────
  try {
    await db.analyticsEvent.create({
      data: {
        shop,
        event: isCod ? "cod_order" : "prepaid_order",
        orderId: String(payload.id),
        value: orderValue,
        metadata: JSON.stringify({
          orderName: payload.name,
          gateway: payload.payment_gateway_names,
          currency: payload.currency,
        }),
      },
    });
  } catch (e) {
    console.error(`[Webhook] AnalyticsEvent create failed:`, e.message);
  }

  return new Response(null, { status: 200 });
};