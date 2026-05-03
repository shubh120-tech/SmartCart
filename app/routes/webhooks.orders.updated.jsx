// app/routes/webhooks.orders.updated.jsx
// Fired when an order is updated
// Detects: RTO (fulfillment_status = null after being fulfilled)
// Detects: Prepaid conversion (COD order paid online)

import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[Webhook] ${topic} — shop: ${shop}, order: ${payload.name}`);

  // ── Detect RTO ────────────────────────────────────────────────────────────
  // An order is considered RTO when cancel_reason = "customer" or
  // fulfillment_status changes back to null (returned)
  const isRto =
    payload.cancel_reason === "customer" ||
    payload.tags?.toLowerCase().includes("rto") ||
    payload.fulfillment_status === null && payload.cancelled_at != null;

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

        await db.analyticsEvent.create({
          data: {
            shop,
            event: "rto_detected",
            orderId: String(payload.id),
            value: parseFloat(payload.total_price ?? 0),
            metadata: JSON.stringify({
              orderName: payload.name,
              cancelReason: payload.cancel_reason,
              tags: payload.tags,
            }),
          },
        });
      }
    } catch (e) {
      console.error(`[Webhook] RTO update failed:`, e.message);
    }
  }

  // ── Detect prepaid conversion ─────────────────────────────────────────────
  // A COD order that was later paid online (financial_status = paid,
  // payment gateway changed away from COD)
  const isPrepaidConversion =
    payload.financial_status === "paid" &&
    !payload.payment_gateway_names?.some(g =>
      g.toLowerCase().includes("cod") || g.toLowerCase().includes("cash")
    );

  if (isPrepaidConversion) {
    try {
      await db.rtoStats.update({
        where: { shop },
        data: { prepaidConversions: { increment: 1 } },
      });

      await db.analyticsEvent.create({
        data: {
          shop,
          event: "prepaid_conversion",
          orderId: String(payload.id),
          value: parseFloat(payload.total_price ?? 0),
          metadata: JSON.stringify({
            orderName: payload.name,
            gateway: payload.payment_gateway_names,
          }),
        },
      });
    } catch (e) {
      console.error(`[Webhook] Prepaid conversion update failed:`, e.message);
    }
  }

  return new Response(null, { status: 200 });
};