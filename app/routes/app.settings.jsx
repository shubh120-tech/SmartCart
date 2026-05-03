import { useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";

const DEFAULT_SETTINGS = {
  storeName: "",
  currency: "INR",
  timezone: "Asia/Kolkata",
  plan: "free",
  isActive: true,
};

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  // Fetch shop info from Shopify GraphQL
  let shopInfo = { name: "", email: "", domain: "", currencyCode: "INR" };
  try {
    const res = await admin.graphql(`
      query getShopInfo {
        shop {
          name
          email
          myshopifyDomain
          primaryDomain { url }
          currencyCode
          timezoneAbbreviation
          plan { displayName }
        }
      }
    `);
    const data = await res.json();
    const shop = data?.data?.shop;
    if (shop) {
      shopInfo = {
        name: shop.name,
        email: shop.email,
        domain: shop.primaryDomain?.url ?? shop.myshopifyDomain,
        myshopifyDomain: shop.myshopifyDomain,
        currencyCode: shop.currencyCode,
        timezone: shop.timezoneAbbreviation,
        plan: shop.plan?.displayName ?? "Unknown",
      };
    }
  } catch (e) {
    console.error("Failed to fetch shop info:", e.message);
  }

  // Load app settings from DB
  let settings = DEFAULT_SETTINGS;
  try {
    const row = await db.appSettings.findUnique({ where: { shop: session.shop } });
    if (row) settings = row;
  } catch (e) {
    console.warn("AppSettings table not found. Run: npx prisma migrate dev");
  }

  return { settings, shopInfo, shop: session.shop };
};

export const action = async ({ request }) => {
  await authenticate.admin(request);
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  const parsed = {
    storeName: data.storeName || "",
    currency: data.currency || "INR",
    timezone: data.timezone || "Asia/Kolkata",
    plan: data.plan || "free",
    isActive: data.isActive === "true",
  };

  try {
    await db.appSettings.upsert({
      where: { shop: session.shop },
      update: parsed,
      create: { shop: session.shop, ...parsed },
    });
  } catch (e) {
    console.error("Failed to save app settings:", e.message);
    return { success: false, message: "Database error. Run: npx prisma migrate dev" };
  }

  return { success: true };
};

const CURRENCIES = [
  { label: "INR — Indian Rupee (₹)", value: "INR" },
  { label: "USD — US Dollar ($)", value: "USD" },
  { label: "EUR — Euro (€)", value: "EUR" },
  { label: "GBP — British Pound (£)", value: "GBP" },
  { label: "AED — UAE Dirham (د.إ)", value: "AED" },
  { label: "SGD — Singapore Dollar (S$)", value: "SGD" },
  { label: "AUD — Australian Dollar (A$)", value: "AUD" },
];

const TIMEZONES = [
  { label: "Asia/Kolkata (IST, UTC+5:30)", value: "Asia/Kolkata" },
  { label: "Asia/Dubai (GST, UTC+4)", value: "Asia/Dubai" },
  { label: "Asia/Singapore (SGT, UTC+8)", value: "Asia/Singapore" },
  { label: "America/New_York (EST, UTC-5)", value: "America/New_York" },
  { label: "America/Los_Angeles (PST, UTC-8)", value: "America/Los_Angeles" },
  { label: "Europe/London (GMT, UTC+0)", value: "Europe/London" },
  { label: "Europe/Berlin (CET, UTC+1)", value: "Europe/Berlin" },
  { label: "Australia/Sydney (AEST, UTC+10)", value: "Australia/Sydney" },
];

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    color: "#6d7175",
    features: [
      "Free shipping bar",
      "Basic COD management",
      "Up to 100 orders/month",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹999",
    period: "per month",
    color: "#008060",
    recommended: true,
    features: [
      "Everything in Free",
      "Milestone rewards",
      "Upsell blocks",
      "RTO protection + OTP",
      "Branded tracking page",
      "WhatsApp notifications",
      "Up to 2,000 orders/month",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "₹2,999",
    period: "per month",
    color: "#5C6AC4",
    features: [
      "Everything in Pro",
      "Unlimited orders",
      "Custom courier integrations",
      "Dedicated account manager",
      "SLA support",
      "Custom NDR workflows",
    ],
  },
];

export default function SettingsPage() {
  const { settings: initial, shopInfo, shop } = useLoaderData();

  const fetcher = useFetcher();
  const isSaving = fetcher.state === "submitting";

  const [storeName, setStoreName] = useState(initial?.storeName ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "INR");
  const [timezone, setTimezone] = useState(initial?.timezone ?? "Asia/Kolkata");
  const [plan, setPlan] = useState(initial?.plan ?? "free");
  const [activeTab, setActiveTab] = useState("general");

  const handleSave = () => {
    fetcher.submit(
      { storeName, currency, timezone, plan, isActive: "true" },
      { method: "POST" }
    );
  };

  const tabs = ["general", "store-info", "plan"];
  const tabLabels = {
    general: "⚙️ General",
    "store-info": "🏪 Store Info",
    plan: "💎 Plan & Billing",
  };

  return (
    <s-page heading="Settings">
      <s-button
        slot="primary-action"
        onClick={handleSave}
        {...(isSaving ? { loading: true } : {})}
      >
        {isSaving ? "Saving..." : "Save Settings"}
      </s-button>

      {fetcher.data?.success && (
        <s-banner tone="success">Settings saved successfully!</s-banner>
      )}
      {fetcher.data?.success === false && (
        <s-banner tone="critical">{fetcher.data.message}</s-banner>
      )}

      {/* Tab bar */}
      <s-section>
        <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid #e1e3e5" }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 16px", border: "none", cursor: "pointer",
                fontSize: "13px", fontWeight: activeTab === tab ? "600" : "400",
                background: "transparent",
                color: activeTab === tab ? "#202223" : "#6d7175",
                borderBottom: activeTab === tab ? "2px solid #202223" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </s-section>

      {/* ── TAB: General ─────────────────────────────────────────────────── */}
      {activeTab === "general" && (
        <s-section heading="General Settings" description="Basic configuration for SmartCart Pro on your store.">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Store display name</label>
              <input
                type="text"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                placeholder={shopInfo?.name ?? "Your Store Name"}
                style={inputStyle}
              />
              <div style={hintStyle}>Used in notifications and the branded tracking page</div>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ ...inputStyle, maxWidth: "320px" }}>
                {CURRENCIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <div style={hintStyle}>Used for formatting prices in the cart widget and notifications</div>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ ...inputStyle, maxWidth: "320px" }}>
                {TIMEZONES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <div style={hintStyle}>Used for scheduling and analytics date grouping</div>
            </div>

          </div>
        </s-section>
      )}

      {/* ── TAB: Store Info ──────────────────────────────────────────────── */}
      {activeTab === "store-info" && (
        <>
          <s-section heading="Store Information" description="Details pulled directly from your Shopify store.">
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {[
                { label: "Store name", value: shopInfo?.name ?? "—" },
                { label: "Store email", value: shopInfo?.email ?? "—" },
                { label: "Primary domain", value: shopInfo?.domain ?? "—" },
                { label: "Myshopify domain", value: shopInfo?.myshopifyDomain ?? shop ?? "—" },
                { label: "Shopify currency", value: shopInfo?.currencyCode ?? "—" },
                { label: "Shopify plan", value: shopInfo?.plan ?? "—" },
              ].map(item => (
                <div key={item.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 0", borderBottom: "1px solid #f1f1f1",
                }}>
                  <span style={{ fontSize: "13px", color: "#6d7175" }}>{item.label}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#202223" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </s-section>

          <s-section heading="App Information">
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {[
                { label: "App", value: "SmartCart Pro" },
                { label: "Version", value: "1.0.0" },
                { label: "Current plan", value: plan.charAt(0).toUpperCase() + plan.slice(1) },
                { label: "Status", value: "Active ✅" },
              ].map(item => (
                <div key={item.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 0", borderBottom: "1px solid #f1f1f1",
                }}>
                  <span style={{ fontSize: "13px", color: "#6d7175" }}>{item.label}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#202223" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </s-section>
        </>
      )}

      {/* ── TAB: Plan & Billing ──────────────────────────────────────────── */}
      {activeTab === "plan" && (
        <s-section heading="Plan & Billing" description="Choose the plan that fits your store's needs.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {PLANS.map(p => (
              <div
                key={p.id}
                onClick={() => setPlan(p.id)}
                style={{
                  border: `2px solid ${plan === p.id ? p.color : "#e1e3e5"}`,
                  borderRadius: "12px", padding: "20px", cursor: "pointer",
                  background: plan === p.id ? `${p.color}08` : "white",
                  position: "relative", transition: "all 0.15s",
                }}
              >
                {p.recommended && (
                  <div style={{
                    position: "absolute", top: "-12px", left: "50%",
                    transform: "translateX(-50%)",
                    background: p.color, color: "white",
                    fontSize: "11px", fontWeight: 700,
                    padding: "3px 12px", borderRadius: "99px",
                    whiteSpace: "nowrap",
                  }}>
                    ⭐ RECOMMENDED
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#202223" }}>{p.name}</div>
                    <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "2px" }}>{p.period}</div>
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: p.color }}>{p.price}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "13px" }}>
                      <span style={{ color: p.color, flexShrink: 0 }}>✓</span>
                      <span style={{ color: "#202223" }}>{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={e => { e.stopPropagation(); setPlan(p.id); }}
                  style={{
                    width: "100%", padding: "9px",
                    borderRadius: "7px", border: "none",
                    cursor: "pointer", fontSize: "13px", fontWeight: 600,
                    background: plan === p.id ? p.color : "#f6f6f7",
                    color: plan === p.id ? "white" : "#202223",
                    transition: "all 0.15s",
                  }}
                >
                  {plan === p.id ? "✓ Current Plan" : `Switch to ${p.name}`}
                </button>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: "20px", padding: "14px 16px",
            background: "#f0f7ff", border: "1px solid #b3d4ff",
            borderRadius: "8px", fontSize: "13px", color: "#0c4a8f",
          }}>
            💡 Plan changes are billed through Shopify. You won't be charged until you confirm via Shopify's billing flow.
          </div>
        </s-section>
      )}

      {/* Aside */}
      <s-section slot="aside" heading="🔗 Quick Links">
        {[
          { label: "Smart Cart", url: "/app/smart-cart" },
          { label: "COD Management", url: "/app/cod" },
          { label: "Shipping Settings", url: "/app/shipping" },
          { label: "Order Tracking", url: "/app/tracking" },
          { label: "Analytics", url: "/app/analytics" },
        ].map(link => (
          <div key={link.label} style={{
            padding: "9px 0", borderBottom: "1px solid #f1f1f1",
          }}>
            <a href={link.url} style={{
              fontSize: "13px", color: "#2c6ecb",
              textDecoration: "none", fontWeight: 500,
            }}>
              {link.label} →
            </a>
          </div>
        ))}
      </s-section>

      <s-section slot="aside" heading="🆘 Support">
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { label: "📧 Email Support", hint: "support@smartcartpro.app" },
            { label: "📖 Documentation", hint: "docs.smartcartpro.app" },
            { label: "💬 Live Chat", hint: "Available Mon–Fri, 9am–6pm IST" },
          ].map(item => (
            <div key={item.label} style={{ padding: "8px 0", borderBottom: "1px solid #f1f1f1" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#202223" }}>{item.label}</div>
              <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "2px" }}>{item.hint}</div>
            </div>
          ))}
        </div>
      </s-section>
    </s-page>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", padding: "8px 10px", borderRadius: "6px",
  border: "1px solid #c9cccf", fontSize: "13px",
  outline: "none", boxSizing: "border-box", background: "white",
};
const fieldGroupStyle = { display: "flex", flexDirection: "column", gap: "4px" };
const labelStyle = { fontSize: "13px", fontWeight: "600", color: "#202223", display: "block" };
const hintStyle = { fontSize: "12px", color: "#6d7175" };

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};