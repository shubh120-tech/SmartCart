import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  const shopify = useAppBridge();
  const [activeTab, setActiveTab] = useState("overview");

  const stats = [
    { label: "Orders Today", value: "0", icon: "📦" },
    { label: "COD Orders", value: "0", icon: "💵" },
    { label: "Avg Cart Value", value: "₹0", icon: "🛒" },
    { label: "RTO Rate", value: "0%", icon: "🔄" },
  ];

  const features = [
    {
      id: "smart-cart",
      title: "Smart Cart",
      description: "Milestone rewards, upsell offers & free shipping progress bar",
      icon: "🛒",
      status: "Configure",
      color: "#008060",
    },
    {
      id: "shipping",
      title: "Shipping Calculator",
      description: "Real-time rates from 25+ couriers. Smart courier recommendation",
      icon: "🚚",
      status: "Configure",
      color: "#0070f3",
    },
    {
      id: "cod",
      title: "COD Management",
      description: "COD verification, prepaid conversion & RTO reduction",
      icon: "💵",
      status: "Configure",
      color: "#e67e22",
    },
    {
      id: "tracking",
      title: "Order Tracking",
      description: "Branded tracking page & automated WhatsApp/SMS updates",
      icon: "📍",
      status: "Coming Soon",
      color: "#9b59b6",
    },
  ];

  return (
    <s-page heading="SmartCart Pro">
      {/* Header Banner */}
      <s-section>
        <div style={{
          background: "linear-gradient(135deg, #008060 0%, #004c3f 100%)",
          borderRadius: "12px",
          padding: "32px",
          color: "white",
          marginBottom: "4px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700" }}>
                🛒 SmartCart Pro
              </h1>
              <p style={{ margin: "8px 0 0", opacity: 0.85, fontSize: "14px" }}>
                Smart Cart · Shipping · COD Management · Order Tracking
              </p>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: "8px",
              padding: "12px 20px",
              fontSize: "13px",
              fontWeight: "600",
            }}>
              ✅ App Connected
            </div>
          </div>
        </div>
      </s-section>

      {/* Stats Row */}
      <s-section heading="Today's Overview">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
        }}>
          {stats.map((stat) => (
            <div key={stat.label} style={{
              background: "#f6f6f7",
              borderRadius: "10px",
              padding: "20px",
              textAlign: "center",
              border: "1px solid #e1e3e5",
            }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>{stat.icon}</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#202223" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "13px", color: "#6d7175", marginTop: "4px" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </s-section>

      {/* Feature Cards */}
      <s-section heading="Features">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "16px",
        }}>
          {features.map((feature) => (
            <div key={feature.id} style={{
              border: "1px solid #e1e3e5",
              borderRadius: "12px",
              padding: "24px",
              background: "white",
              borderLeft: `4px solid ${feature.color}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "28px", marginBottom: "10px" }}>{feature.icon}</div>
                  <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: "600", color: "#202223" }}>
                    {feature.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#6d7175", lineHeight: "1.5" }}>
                    {feature.description}
                  </p>
                </div>
              </div>
              <div style={{ marginTop: "16px" }}>
                <button
                  style={{
                    background: feature.status === "Coming Soon" ? "#f6f6f7" : feature.color,
                    color: feature.status === "Coming Soon" ? "#6d7175" : "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: feature.status === "Coming Soon" ? "default" : "pointer",
                  }}
                >
                  {feature.status === "Coming Soon" ? "🔜 Coming Soon" : `⚙️ ${feature.status}`}
                </button>
              </div>
            </div>
          ))}
        </div>
      </s-section>

      {/* Quick Setup Guide */}
      <s-section heading="Quick Setup Guide">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { step: "1", title: "Configure Smart Cart", desc: "Set milestone targets and upsell products", done: false },
            { step: "2", title: "Connect Courier Partners", desc: "Add Shiprocket, Delhivery or custom courier API keys", done: false },
            { step: "3", title: "Enable COD Rules", desc: "Set COD limits, blocked pincodes and prepaid incentives", done: false },
            { step: "4", title: "Install Cart Extension", desc: "Add the SmartCart widget to your storefront theme", done: false },
          ].map((item) => (
            <div key={item.step} style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "16px",
              background: "#f6f6f7",
              borderRadius: "8px",
              border: "1px solid #e1e3e5",
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: item.done ? "#008060" : "#e1e3e5",
                color: item.done ? "white" : "#6d7175",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                fontSize: "14px",
                flexShrink: 0,
              }}>
                {item.done ? "✓" : item.step}
              </div>
              <div>
                <div style={{ fontWeight: "600", fontSize: "14px", color: "#202223" }}>{item.title}</div>
                <div style={{ fontSize: "13px", color: "#6d7175", marginTop: "2px" }}>{item.desc}</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <button style={{
                  background: "white",
                  border: "1px solid #c9cccf",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  fontSize: "13px",
                  cursor: "pointer",
                  color: "#202223",
                }}>
                  Start →
                </button>
              </div>
            </div>
          ))}
        </div>
      </s-section>

      {/* Aside */}
      <s-section slot="aside" heading="App Status">
        <s-paragraph>
          <s-text>Version: </s-text>
          <s-text>1.0.0 (Dev)</s-text>
        </s-paragraph>
        <s-paragraph>
          <s-text>Store: </s-text>
          <s-text>Quickstart (18a8b3fd)</s-text>
        </s-paragraph>
        <s-paragraph>
          <s-text>Environment: </s-text>
          <s-text>Development</s-text>
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="Need Help?">
        <s-unordered-list>
          <s-list-item>
            <s-link href="https://shopify.dev/docs/apps" target="_blank">
              Shopify App Docs
            </s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="https://shopify.dev/docs/api/admin-graphql" target="_blank">
              GraphQL API Reference
            </s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="https://shopify.dev/docs/apps/build/cart-checkout" target="_blank">
              Cart & Checkout APIs
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};