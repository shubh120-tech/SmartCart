import { useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  let recentOrders = [];
  try {
    const res = await admin.graphql(`
      query getRecentOrders {
        orders(first: 20, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              name
              displayFulfillmentStatus
              fulfillments(first: 1) {
                trackingInfo(first: 1) {
                  number
                  company
                  url
                }
                estimatedDeliveryAt
              }
              shippingAddress { firstName lastName }
              cancelReason
              tags
            }
          }
        }
      }
    `);
    const data = await res.json();
    const orders = data?.data?.orders?.edges?.map(e => e.node) ?? [];

    recentOrders = orders.map(o => {
      const fulfillment = o.fulfillments?.[0];
      const tracking = fulfillment?.trackingInfo?.[0];
      const customerName = o.shippingAddress
        ? `${o.shippingAddress.firstName ?? ""} ${o.shippingAddress.lastName ?? ""}`.trim()
        : "—";

      // Map Shopify fulfillment status to display status + color
      const statusMap = {
        FULFILLED:        { label: "Delivered",        color: "#008060" },
        IN_TRANSIT:       { label: "In Transit",       color: "#b5731d" },
        OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "#1a73e8" },
        ATTEMPTED_DELIVERY: { label: "NDR Pending",   color: "#b5731d" },
        UNFULFILLED:      { label: "Pending",          color: "#6d7175" },
        PARTIALLY_FULFILLED: { label: "Partial",       color: "#b5731d" },
        SCHEDULED:        { label: "Scheduled",        color: "#6d7175" },
      };
      const statusInfo = statusMap[o.displayFulfillmentStatus] ?? { label: o.displayFulfillmentStatus, color: "#6d7175" };

      // Check for RTO
      const isRto = o.cancelReason != null || o.tags?.toLowerCase().includes("rto");
      if (isRto) {
        statusInfo.label = "RTO Initiated";
        statusInfo.color = "#d72c0d";
      }

      return {
        id: o.name,
        customer: customerName || "—",
        status: statusInfo.label,
        statusColor: statusInfo.color,
        carrier: tracking?.company ?? "—",
        awb: tracking?.number ?? "—",
        eta: fulfillment?.estimatedDeliveryAt
          ? new Date(fulfillment.estimatedDeliveryAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
          : "—",
      };
    });
  } catch (e) {
    console.error("Failed to fetch orders:", e.message);
  }

  return { recentOrders };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  // Dynamically import db to keep it server-only
  const db = (await import("../db.server")).default;

  const parsed = {
    brandedPageEnabled: data.brandedPageEnabled === "true",
    customDomain: data.customDomain || "",
    logoUrl: data.logoUrl || "",
    primaryColor: data.primaryColor || "#5C6AC4",
    accentColor: data.accentColor || "#47C1BF",
    showEstimatedDelivery: data.showEstimatedDelivery === "true",
    showOrderItems: data.showOrderItems === "true",
    showCarrierInfo: data.showCarrierInfo === "true",
    notificationsEnabled: data.notificationsEnabled === "true",
    notifyEmail: data.notifyEmail === "true",
    notifyWhatsapp: data.notifyWhatsapp === "true",
    notifySms: data.notifySms === "true",
    whatsappNumber: data.whatsappNumber || "",
    emailTemplate: data.emailTemplate || "default",
    ndrsEnabled: data.ndrsEnabled === "true",
    ndrAutoReattempt: data.ndrAutoReattempt === "true",
    ndrMaxAttempts: parseInt(data.ndrMaxAttempts || 3),
  };

  try {
    await db.trackingSettings.upsert({
      where: { shop: session.shop },
      update: parsed,
      create: { shop: session.shop, ...parsed },
    });
  } catch (e) {
    console.error("Failed to save tracking settings:", e.message);
    return { success: false, message: "Database error. Run: npx prisma migrate dev" };
  }

  return { success: true };
};

export default function TrackingPage() {
  const { recentOrders } = useLoaderData();
  const fetcher = useFetcher();
  const isSaving = fetcher.state === "submitting";

  // Branded page
  const [brandedPageEnabled, setBrandedPageEnabled] = useState(true);
  const [customDomain, setCustomDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#5C6AC4");
  const [accentColor, setAccentColor] = useState("#47C1BF");
  const [showEstimatedDelivery, setShowEstimatedDelivery] = useState(true);
  const [showOrderItems, setShowOrderItems] = useState(true);
  const [showCarrierInfo, setShowCarrierInfo] = useState(true);

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);
  const [notifySms, setNotifySms] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("default");

  // NDR
  const [ndrsEnabled, setNdrsEnabled] = useState(true);
  const [ndrAutoReattempt, setNdrAutoReattempt] = useState(true);
  const [ndrMaxAttempts, setNdrMaxAttempts] = useState(3);

  // Active tab
  const [activeTab, setActiveTab] = useState("branded");



  const handleSave = () => {
    fetcher.submit(
      {
        brandedPageEnabled: String(brandedPageEnabled),
        customDomain, logoUrl, primaryColor, accentColor,
        showEstimatedDelivery: String(showEstimatedDelivery),
        showOrderItems: String(showOrderItems),
        showCarrierInfo: String(showCarrierInfo),
        notificationsEnabled: String(notificationsEnabled),
        notifyEmail: String(notifyEmail),
        notifyWhatsapp: String(notifyWhatsapp),
        notifySms: String(notifySms),
        whatsappNumber, emailTemplate,
        ndrsEnabled: String(ndrsEnabled),
        ndrAutoReattempt: String(ndrAutoReattempt),
        ndrMaxAttempts,
      },
      { method: "POST" }
    );
  };

  const tabs = ["branded", "notifications", "ndr", "orders"];
  const tabLabels = { branded: "🎨 Branded Page", notifications: "🔔 Notifications", ndr: "⚠️ NDR Management", orders: "📦 Live Orders" };

  return (
    <s-page heading="Order Tracking">
      <s-button
        slot="primary-action"
        onClick={handleSave}
        {...(isSaving ? { loading: true } : {})}
      >
        {isSaving ? "Saving..." : "Save Settings"}
      </s-button>

      {fetcher.data?.success && (
        <s-banner tone="success">Tracking settings saved successfully!</s-banner>
      )}

      {/* Tab bar */}
      <s-section>
        <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid #e1e3e5", paddingBottom: "0" }}>
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

      {/* ── TAB: Branded Page ─────────────────────────────────────────────── */}
      {activeTab === "branded" && (
        <>
          <s-section heading="Branded Tracking Page" description="Customize the tracking page your customers see.">
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              <div style={rowStyle}>
                <div>
                  <div style={labelStyle}>Enable branded tracking page</div>
                  <div style={hintStyle}>Customers track orders at track.yourstore.com</div>
                </div>
                <label style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={brandedPageEnabled} onChange={e => setBrandedPageEnabled(e.target.checked)} style={{ display: "none" }} />
                  <div style={{ ...toggleStyle, background: brandedPageEnabled ? "#008060" : "#c9cccf" }}>
                    <div style={{ ...toggleDotStyle, transform: brandedPageEnabled ? "translateX(20px)" : "translateX(2px)" }} />
                  </div>
                </label>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Custom tracking domain</label>
                <input type="text" value={customDomain} onChange={e => setCustomDomain(e.target.value)}
                  placeholder="track.yourstore.com" style={inputStyle} />
                <div style={hintStyle}>Point a CNAME record to tracking.smartcartpro.app</div>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Logo URL</label>
                <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                  placeholder="https://yourstore.com/logo.png" style={inputStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Primary color</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                      style={{ width: "44px", height: "36px", border: "1px solid #c9cccf", borderRadius: "6px", cursor: "pointer" }} />
                    <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                      style={{ ...inputStyle, fontFamily: "monospace" }} />
                  </div>
                </div>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Accent color</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                      style={{ width: "44px", height: "36px", border: "1px solid #c9cccf", borderRadius: "6px", cursor: "pointer" }} />
                    <input type="text" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                      style={{ ...inputStyle, fontFamily: "monospace" }} />
                  </div>
                </div>
              </div>
            </div>
          </s-section>

          <s-section heading="Page Content">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Show estimated delivery date", hint: "Display predicted delivery window", value: showEstimatedDelivery, set: setShowEstimatedDelivery },
                { label: "Show order items", hint: "Display product images and names", value: showOrderItems, set: setShowOrderItems },
                { label: "Show carrier & AWB info", hint: "Show courier name and tracking number", value: showCarrierInfo, set: setShowCarrierInfo },
              ].map(item => (
                <div key={item.label} style={rowStyle}>
                  <div>
                    <div style={labelStyle}>{item.label}</div>
                    <div style={hintStyle}>{item.hint}</div>
                  </div>
                  <label style={{ cursor: "pointer" }}>
                    <input type="checkbox" checked={item.value} onChange={e => item.set(e.target.checked)} style={{ display: "none" }} />
                    <div style={{ ...toggleStyle, background: item.value ? "#008060" : "#c9cccf" }}>
                      <div style={{ ...toggleDotStyle, transform: item.value ? "translateX(20px)" : "translateX(2px)" }} />
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </s-section>
        </>
      )}

      {/* ── TAB: Notifications ───────────────────────────────────────────── */}
      {activeTab === "notifications" && (
        <>
          <s-section heading="Order Notifications" description="Keep customers informed at every shipment milestone.">
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              <div style={rowStyle}>
                <div>
                  <div style={labelStyle}>Enable order notifications</div>
                  <div style={hintStyle}>Send updates on dispatch, transit, delivery</div>
                </div>
                <label style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={notificationsEnabled} onChange={e => setNotificationsEnabled(e.target.checked)} style={{ display: "none" }} />
                  <div style={{ ...toggleStyle, background: notificationsEnabled ? "#008060" : "#c9cccf" }}>
                    <div style={{ ...toggleDotStyle, transform: notificationsEnabled ? "translateX(20px)" : "translateX(2px)" }} />
                  </div>
                </label>
              </div>

              {notificationsEnabled && (
                <>
                  <div style={rowStyle}>
                    <div>
                      <div style={labelStyle}>📧 Email notifications</div>
                      <div style={hintStyle}>Transactional shipping emails to customers</div>
                    </div>
                    <label style={{ cursor: "pointer" }}>
                      <input type="checkbox" checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)} style={{ display: "none" }} />
                      <div style={{ ...toggleStyle, background: notifyEmail ? "#008060" : "#c9cccf" }}>
                        <div style={{ ...toggleDotStyle, transform: notifyEmail ? "translateX(20px)" : "translateX(2px)" }} />
                      </div>
                    </label>
                  </div>

                  {notifyEmail && (
                    <div style={fieldGroupStyle}>
                      <label style={labelStyle}>Email template</label>
                      <select value={emailTemplate} onChange={e => setEmailTemplate(e.target.value)} style={{ ...inputStyle, maxWidth: "320px" }}>
                        <option value="default">Default (SmartCart branded)</option>
                        <option value="minimal">Minimal</option>
                        <option value="custom">Custom HTML</option>
                      </select>
                    </div>
                  )}

                  <div style={rowStyle}>
                    <div>
                      <div style={labelStyle}>💬 WhatsApp notifications</div>
                      <div style={hintStyle}>Requires WhatsApp Business API number</div>
                    </div>
                    <label style={{ cursor: "pointer" }}>
                      <input type="checkbox" checked={notifyWhatsapp} onChange={e => setNotifyWhatsapp(e.target.checked)} style={{ display: "none" }} />
                      <div style={{ ...toggleStyle, background: notifyWhatsapp ? "#008060" : "#c9cccf" }}>
                        <div style={{ ...toggleDotStyle, transform: notifyWhatsapp ? "translateX(20px)" : "translateX(2px)" }} />
                      </div>
                    </label>
                  </div>

                  {notifyWhatsapp && (
                    <div style={fieldGroupStyle}>
                      <label style={labelStyle}>WhatsApp Business number</label>
                      <input type="text" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)}
                        placeholder="+91 98765 43210" style={{ ...inputStyle, maxWidth: "240px" }} />
                    </div>
                  )}

                  <div style={rowStyle}>
                    <div>
                      <div style={labelStyle}>📱 SMS notifications</div>
                      <div style={hintStyle}>Uses DLT-registered sender ID (India)</div>
                    </div>
                    <label style={{ cursor: "pointer" }}>
                      <input type="checkbox" checked={notifySms} onChange={e => setNotifySms(e.target.checked)} style={{ display: "none" }} />
                      <div style={{ ...toggleStyle, background: notifySms ? "#008060" : "#c9cccf" }}>
                        <div style={{ ...toggleDotStyle, transform: notifySms ? "translateX(20px)" : "translateX(2px)" }} />
                      </div>
                    </label>
                  </div>
                </>
              )}
            </div>
          </s-section>
        </>
      )}

      {/* ── TAB: NDR Management ──────────────────────────────────────────── */}
      {activeTab === "ndr" && (
        <>
          <s-section heading="Non-Delivery Report (NDR) Management" description="Automatically handle failed delivery attempts to reduce RTO.">
            <div style={{
              background: "#f0f7ff", border: "1px solid #b3d4ff",
              borderRadius: "8px", padding: "14px 16px", marginBottom: "16px",
              fontSize: "13px", color: "#0c4a8f", lineHeight: "1.5",
            }}>
              <strong>What are NDRs?</strong> An NDR is raised when a delivery attempt fails — customer unavailable, wrong address, refused, etc.
              SmartCart Pro can automatically follow up and reschedule re-attempts.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={rowStyle}>
                <div>
                  <div style={labelStyle}>Enable NDR management</div>
                  <div style={hintStyle}>Intercept failed deliveries before they become RTOs</div>
                </div>
                <label style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={ndrsEnabled} onChange={e => setNdrsEnabled(e.target.checked)} style={{ display: "none" }} />
                  <div style={{ ...toggleStyle, background: ndrsEnabled ? "#008060" : "#c9cccf" }}>
                    <div style={{ ...toggleDotStyle, transform: ndrsEnabled ? "translateX(20px)" : "translateX(2px)" }} />
                  </div>
                </label>
              </div>

              {ndrsEnabled && (
                <>
                  <div style={rowStyle}>
                    <div>
                      <div style={labelStyle}>Auto-schedule reattempt on NDR</div>
                      <div style={hintStyle}>Automatically contact customer and book next delivery slot</div>
                    </div>
                    <label style={{ cursor: "pointer" }}>
                      <input type="checkbox" checked={ndrAutoReattempt} onChange={e => setNdrAutoReattempt(e.target.checked)} style={{ display: "none" }} />
                      <div style={{ ...toggleStyle, background: ndrAutoReattempt ? "#008060" : "#c9cccf" }}>
                        <div style={{ ...toggleDotStyle, transform: ndrAutoReattempt ? "translateX(20px)" : "translateX(2px)" }} />
                      </div>
                    </label>
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Max reattempt attempts</label>
                    <input type="number" value={ndrMaxAttempts} min={1} max={5}
                      onChange={e => setNdrMaxAttempts(Number(e.target.value))}
                      style={{ ...inputStyle, maxWidth: "120px" }} />
                    <div style={hintStyle}>After this many failed attempts, order is marked RTO</div>
                  </div>
                </>
              )}
            </div>
          </s-section>
        </>
      )}

      {/* ── TAB: Live Orders ─────────────────────────────────────────────── */}
      {activeTab === "orders" && (
        <s-section heading="Live Shipment Overview">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e1e3e5" }}>
                  {["Order", "Customer", "Status", "Carrier", "AWB", "ETA"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600, color: "#6d7175", fontSize: "12px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id} style={{ borderBottom: "1px solid #f1f1f1" }}>
                    <td style={{ padding: "12px", fontWeight: 600 }}>{o.id}</td>
                    <td style={{ padding: "12px" }}>{o.customer}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{
                        background: `${o.statusColor}18`, color: o.statusColor,
                        padding: "3px 10px", borderRadius: "99px",
                        fontSize: "12px", fontWeight: 600,
                      }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>{o.carrier}</td>
                    <td style={{ padding: "12px", fontFamily: "monospace", fontSize: "12px", color: "#6d7175" }}>{o.awb}</td>
                    <td style={{ padding: "12px" }}>{o.eta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </s-section>
      )}

      {/* Aside */}
      <s-section slot="aside" heading="📋 Tracking Checklist">
        {[
          { label: "Branded page enabled", done: brandedPageEnabled },
          { label: "Custom domain set", done: !!customDomain },
          { label: "Notifications enabled", done: notificationsEnabled },
          { label: "NDR management on", done: ndrsEnabled },
        ].map(item => (
          <div key={item.label} style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "8px 0", borderBottom: "1px solid #f1f1f1", fontSize: "13px",
          }}>
            <span style={{ color: item.done ? "#008060" : "#c9cccf", fontSize: "16px" }}>
              {item.done ? "✅" : "⭕"}
            </span>
            <span style={{ color: item.done ? "#202223" : "#6d7175" }}>{item.label}</span>
          </div>
        ))}
      </s-section>

      <s-section slot="aside" heading="💡 Pro Tips">
        <s-paragraph>WhatsApp notifications have 5× higher open rates than email for Indian customers.</s-paragraph>
        <s-paragraph>Set NDR max attempts to 3 — beyond that, recovery rates drop below 10%.</s-paragraph>
        <s-paragraph>Use a custom domain for tracking — it builds brand trust and reduces WISMO calls.</s-paragraph>
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
const rowStyle = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "12px", background: "#f6f6f7", borderRadius: "8px",
};
const toggleStyle = {
  width: "44px", height: "24px", borderRadius: "99px",
  position: "relative", transition: "background 0.2s", cursor: "pointer",
};
const toggleDotStyle = {
  position: "absolute", top: "2px", width: "20px", height: "20px",
  borderRadius: "50%", background: "white",
  boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "transform 0.2s",
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};