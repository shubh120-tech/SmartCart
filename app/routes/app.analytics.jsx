import { useLoaderData, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "30d";

  // Calculate date range
  const now = new Date();
  const daysMap = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 };
  const days = daysMap[range] ?? 30;
  const since = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

  // ── Fetch orders from Shopify GraphQL ──────────────────────────────────────
  let orders = [];
  try {
    const res = await admin.graphql(`
      query getOrderAnalytics($query: String!) {
        orders(first: 250, sortKey: CREATED_AT, reverse: true, query: $query) {
          edges {
            node {
              id
              name
              createdAt
              totalPriceSet { shopMoney { amount currencyCode } }
              paymentGatewayNames
              displayFulfillmentStatus
              cancelReason
              lineItems(first: 10) {
                edges {
                  node {
                    title
                    quantity
                    originalUnitPriceSet { shopMoney { amount } }
                  }
                }
              }
            }
          }
        }
      }
    `, { variables: { query: `created_at:>='${since}'` } });

    const data = await res.json();
    orders = data?.data?.orders?.edges?.map(e => e.node) ?? [];
  } catch (e) {
    console.error("GraphQL error:", e.message);
  }

  const isCod = o => o.paymentGatewayNames?.some(g =>
    g.toLowerCase().includes("cod") || g.toLowerCase().includes("cash")
  );

  const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.totalPriceSet?.shopMoney?.amount ?? 0), 0);
  const codOrders = orders.filter(isCod);
  const prepaidOrders = orders.filter(o => !isCod(o));
  const cancelledOrders = orders.filter(o => o.cancelReason != null);
  const fulfilledOrders = orders.filter(o => o.displayFulfillmentStatus === "FULFILLED");
  const codRevenue = codOrders.reduce((s, o) => s + parseFloat(o.totalPriceSet?.shopMoney?.amount ?? 0), 0);
  const prepaidRevenue = prepaidOrders.reduce((s, o) => s + parseFloat(o.totalPriceSet?.shopMoney?.amount ?? 0), 0);

  // ── Top products ───────────────────────────────────────────────────────────
  const productMap = {};
  orders.forEach(o => {
    o.lineItems?.edges?.forEach(({ node: item }) => {
      if (!productMap[item.title]) productMap[item.title] = { title: item.title, units: 0, revenue: 0 };
      productMap[item.title].units += item.quantity;
      productMap[item.title].revenue += parseFloat(item.originalUnitPriceSet?.shopMoney?.amount ?? 0) * item.quantity;
    });
  });
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // ── Real 7-day revenue trend from orders ───────────────────────────────────
  const trendDays = 7;
  const trendMap = {};
  for (let i = trendDays - 1; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = d.toLocaleDateString("en-IN", { weekday: "short" });
    trendMap[key] = { day: key, cod: 0, prepaid: 0 };
  }
  orders.forEach(o => {
    const d = new Date(o.createdAt);
    const key = d.toLocaleDateString("en-IN", { weekday: "short" });
    if (trendMap[key]) {
      const amount = parseFloat(o.totalPriceSet?.shopMoney?.amount ?? 0);
      if (isCod(o)) trendMap[key].cod += amount;
      else trendMap[key].prepaid += amount;
    }
  });
  const revenueTrend = Object.values(trendMap);

  // ── SmartCart feature stats from AnalyticsEvents ───────────────────────────
  let featureStats = {
    freeshippingBarConversions: 0,
    upsellConversions: 0,
    milestoneRewardsRedeemed: 0,
    prepaidIncentiveConversions: 0,
  };
  try {
    const [freeShipping, upsell, milestone, prepaidConversion] = await Promise.all([
      db.analyticsEvent.count({ where: { shop: session.shop, event: "free_shipping_bar_conversion", createdAt: { gte: new Date(since) } } }),
      db.analyticsEvent.count({ where: { shop: session.shop, event: "upsell_accepted", createdAt: { gte: new Date(since) } } }),
      db.analyticsEvent.count({ where: { shop: session.shop, event: "milestone_unlocked", createdAt: { gte: new Date(since) } } }),
      db.analyticsEvent.count({ where: { shop: session.shop, event: "prepaid_conversion", createdAt: { gte: new Date(since) } } }),
    ]);
    featureStats = {
      freeshippingBarConversions: freeShipping,
      upsellConversions: upsell,
      milestoneRewardsRedeemed: milestone,
      prepaidIncentiveConversions: prepaidConversion,
    };
  } catch (e) {
    console.warn("AnalyticsEvent query failed:", e.message);
  }

  // ── RTO stats from DB ──────────────────────────────────────────────────────
  let rtoRate = "0.0";
  try {
    const rtoStats = await db.rtoStats.findUnique({ where: { shop: session.shop } });
    if (rtoStats) rtoRate = rtoStats.rtoRate.toFixed(1);
  } catch (e) {
    console.warn("RtoStats query failed:", e.message);
  }

  return {
    range,
    revenueTrend,
    topProducts,
    stats: {
      totalOrders: orders.length,
      totalRevenue: totalRevenue.toFixed(2),
      codOrders: codOrders.length,
      prepaidOrders: prepaidOrders.length,
      codRevenue: codRevenue.toFixed(2),
      prepaidRevenue: prepaidRevenue.toFixed(2),
      cancelRate: orders.length ? ((cancelledOrders.length / orders.length) * 100).toFixed(1) : "0.0",
      fulfillmentRate: orders.length ? ((fulfilledOrders.length / orders.length) * 100).toFixed(1) : "0.0",
      avgOrderValue: orders.length ? (totalRevenue / orders.length).toFixed(2) : "0.00",
      rtoRate,
      ...featureStats,
      cartAbandonment: "0.0", // requires Shopify Plus Abandoned Checkout API
    },
  };
};

const fmt = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function AnalyticsDashboard() {
  const { stats, revenueTrend, topProducts, range } = useLoaderData();
  const navigate = useNavigate();

  const maxBar = Math.max(...revenueTrend.map(d => d.cod + d.prepaid), 1);

  const kpis = [
    { label: "Total Revenue", value: fmt(stats.totalRevenue), delta: null, icon: "💰" },
    { label: "Total Orders", value: stats.totalOrders, delta: null, icon: "📦" },
    { label: "Avg Order Value", value: fmt(stats.avgOrderValue), delta: null, icon: "🛒" },
    { label: "COD Rate", value: `${((stats.codOrders / (stats.totalOrders || 1)) * 100).toFixed(1)}%`, delta: null, icon: "💵" },
    { label: "RTO Rate", value: `${stats.rtoRate}%`, delta: null, icon: "🔄" },
    { label: "Fulfillment Rate", value: `${stats.fulfillmentRate}%`, delta: null, icon: "✅" },
  ];

  return (
    <s-page heading="Analytics">
      <s-button slot="primary-action" url="/app/analytics/export">
        Export CSV
      </s-button>

      {/* Date range tabs */}
      <s-section>
        <div style={{ display: "flex", gap: "8px" }}>
          {[{ label: "Today", value: "1d" }, { label: "7 days", value: "7d" }, { label: "30 days", value: "30d" }, { label: "90 days", value: "90d" }].map(r => (
            <button
              key={r.value}
              onClick={() => navigate(`?range=${r.value}`)}
              style={{
                padding: "7px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px",
                fontWeight: range === r.value ? "600" : "400",
                border: range === r.value ? "2px solid #202223" : "1px solid #c9cccf",
                background: range === r.value ? "#202223" : "white",
                color: range === r.value ? "white" : "#202223",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </s-section>

      {/* KPI cards */}
      <s-section heading="Overview">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {kpis.map(card => (
            <div key={card.label} style={{
              background: "white", border: "1px solid #e1e3e5",
              borderRadius: "10px", padding: "16px",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            }}>
              <div>
                <div style={{ fontSize: "12px", color: "#6d7175", marginBottom: "6px" }}>{card.label}</div>
                <div style={{ fontSize: "26px", fontWeight: 700, color: "#202223", lineHeight: 1 }}>{card.value}</div>
              </div>
              <span style={{ fontSize: "28px" }}>{card.icon}</span>
            </div>
          ))}
        </div>
      </s-section>

      {/* Revenue chart */}
      <s-section heading="Revenue Trend (Last 7 Days)">
        {revenueTrend.every(d => d.cod === 0 && d.prepaid === 0) ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#6d7175", fontSize: "13px" }}>
            No orders in this period yet.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", height: "180px", padding: "0 8px" }}>
              {revenueTrend.map(d => {
                const codH = (d.cod / maxBar) * 160;
                const prepaidH = (d.prepaid / maxBar) * 160;
                return (
                  <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <div style={{ display: "flex", gap: "2px", alignItems: "flex-end", height: "160px" }}>
                      <div title={`COD: ${fmt(d.cod)}`} style={{ width: "18px", height: `${Math.max(codH, 2)}px`, background: "#f4a423", borderRadius: "3px 3px 0 0", transition: "height 0.3s ease" }} />
                      <div title={`Prepaid: ${fmt(d.prepaid)}`} style={{ width: "18px", height: `${Math.max(prepaidH, 2)}px`, background: "#008060", borderRadius: "3px 3px 0 0", transition: "height 0.3s ease" }} />
                    </div>
                    <p style={{ margin: 0, fontSize: "11px", color: "#6d7175" }}>{d.day}</p>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "20px", marginTop: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: "#f4a423" }} />
                <span style={{ fontSize: "12px", color: "#6d7175" }}>COD Revenue</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: "#008060" }} />
                <span style={{ fontSize: "12px", color: "#6d7175" }}>Prepaid Revenue</span>
              </div>
            </div>
          </>
        )}
      </s-section>

      {/* COD vs Prepaid split */}
      <s-section heading="Payment Method Split">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[
            { label: "COD Orders", count: stats.codOrders, revenue: stats.codRevenue, color: "#f4a423" },
            { label: "Prepaid Orders", count: stats.prepaidOrders, revenue: stats.prepaidRevenue, color: "#008060" },
          ].map(item => (
            <div key={item.label} style={{ background: "#f6f6f7", borderRadius: "10px", padding: "16px", border: "1px solid #e1e3e5" }}>
              <div style={{ fontSize: "13px", color: "#6d7175", marginBottom: "4px" }}>{item.label}</div>
              <div style={{ fontSize: "22px", fontWeight: 700, marginBottom: "2px" }}>{item.count}</div>
              <div style={{ fontSize: "13px", color: "#202223", marginBottom: "12px" }}>{fmt(item.revenue)}</div>
              <div style={{ height: "6px", background: "#e1e3e5", borderRadius: "3px" }}>
                <div style={{ height: "100%", width: `${(item.count / (stats.totalOrders || 1)) * 100}%`, background: item.color, borderRadius: "3px" }} />
              </div>
            </div>
          ))}
        </div>
      </s-section>

      {/* SmartCart feature performance */}
      <s-section heading="SmartCart Pro Feature Performance">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[
            { label: "Free Shipping Bar", value: stats.freeshippingBarConversions, unit: "conversions", icon: "🚚" },
            { label: "Upsell Accepted", value: stats.upsellConversions, unit: "times", icon: "📈" },
            { label: "Rewards Redeemed", value: stats.milestoneRewardsRedeemed, unit: "orders", icon: "🎁" },
            { label: "Prepaid Incentive", value: stats.prepaidIncentiveConversions, unit: "conversions", icon: "💳" },
          ].map(f => (
            <div key={f.label} style={{ background: "#f6f6f7", borderRadius: "10px", padding: "16px", border: "1px solid #e1e3e5" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>{f.icon}</div>
              <div style={{ fontSize: "22px", fontWeight: 700, marginBottom: "2px" }}>{f.value}</div>
              <div style={{ fontSize: "11px", color: "#6d7175" }}>{f.unit}</div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#202223", marginTop: "4px" }}>{f.label}</div>
            </div>
          ))}
        </div>
      </s-section>

      {/* Top products */}
      <s-section heading="Top Products">
        {topProducts.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e1e3e5" }}>
                  {["Product", "Units Sold", "Revenue"].map(h => (
                    <th key={h} style={{ textAlign: h === "Product" ? "left" : "right", padding: "10px 12px", fontWeight: 600, color: "#6d7175", fontSize: "12px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f1f1" }}>
                    <td style={{ padding: "12px" }}>{p.title}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>{p.units}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: 600 }}>{fmt(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "32px", textAlign: "center", color: "#6d7175", fontSize: "13px" }}>
            No orders in this period yet.
          </div>
        )}
      </s-section>

      {/* Aside */}
      <s-section slot="aside" heading="📊 Quick Stats">
        {[
          { label: "Fulfillment Rate", value: `${stats.fulfillmentRate}%` },
          { label: "Cancel Rate", value: `${stats.cancelRate}%` },
          { label: "COD Rate", value: `${((stats.codOrders / (stats.totalOrders || 1)) * 100).toFixed(1)}%` },
          { label: "RTO Rate", value: `${stats.rtoRate}%` },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f1f1", fontSize: "13px" }}>
            <span style={{ color: "#6d7175" }}>{s.label}</span>
            <span style={{ fontWeight: 600, color: "#202223" }}>{s.value}</span>
          </div>
        ))}
      </s-section>

      <s-section slot="aside" heading="💡 Insights">
        {parseFloat(stats.rtoRate) > 10 && (
          <s-paragraph>Your RTO rate of {stats.rtoRate}% is above the 10% benchmark. Enable COD OTP verification.</s-paragraph>
        )}
        {stats.freeshippingBarConversions > 0 && (
          <s-paragraph>Free shipping bar drove {stats.freeshippingBarConversions} conversions this period.</s-paragraph>
        )}
        {stats.totalOrders === 0 && (
          <s-paragraph>No orders yet in this period. Data will appear as orders come in.</s-paragraph>
        )}
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};