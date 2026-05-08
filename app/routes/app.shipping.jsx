import { useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";

const DEFAULT_COURIERS = [
  { id: "shiprocket", name: "Shiprocket", icon: "🚀", connected: false, apiKey: "", recommended: true },
  { id: "delhivery", name: "Delhivery", icon: "📦", connected: false, apiKey: "", recommended: true },
  { id: "bluedart", name: "Blue Dart", icon: "🔵", connected: false, apiKey: "", recommended: false },
  { id: "xpressbees", name: "Xpressbees", icon: "🐝", connected: false, apiKey: "", recommended: false },
  { id: "dtdc", name: "DTDC", icon: "🟡", connected: false, apiKey: "", recommended: false },
  { id: "fedex", name: "FedEx", icon: "🌐", connected: false, apiKey: "", recommended: false },
];

const DEFAULT_ZONES = [
  { id: 1, name: "Local (Same City)", rate: 40, freeAbove: 499, enabled: true },
  { id: 2, name: "Metro Cities", rate: 60, freeAbove: 699, enabled: true },
  { id: 3, name: "Rest of India", rate: 80, freeAbove: 999, enabled: true },
  { id: 4, name: "International", rate: 500, freeAbove: 5000, enabled: false },
];

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  let settings = null;
  try {
    settings = await db.shippingSettings.findUnique({ where: { shop: session.shop } });
  } catch (e) {
    console.warn("ShippingSettings not found:", e.message);
  }

  return {
    settings: {
      defaultWeight: settings?.defaultWeight ?? 500,
      autoSelectCourier: settings?.autoSelectCourier ?? true,
      showRatesInCart: settings?.showRatesInCart ?? true,
      codExtraCharge: settings?.codExtraCharge ?? 30,
      couriers: settings?.couriers ? JSON.parse(settings.couriers) : DEFAULT_COURIERS,
      zones: settings?.zones ? JSON.parse(settings.zones) : DEFAULT_ZONES,
    }
  };
};

export const action = async ({ request }) => {
  await authenticate.admin(request);
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  try {
    await db.shippingSettings.upsert({
      where: { shop: session.shop },
      update: {
        defaultWeight: parseInt(data.defaultWeight || 500),
        autoSelectCourier: data.autoSelectCourier === "true",
        showRatesInCart: data.showRatesInCart === "true",
        codExtraCharge: parseFloat(data.codExtraCharge || 30),
        couriers: data.couriers,
        zones: data.zones,
      },
      create: {
        shop: session.shop,
        defaultWeight: parseInt(data.defaultWeight || 500),
        autoSelectCourier: data.autoSelectCourier === "true",
        showRatesInCart: data.showRatesInCart === "true",
        codExtraCharge: parseFloat(data.codExtraCharge || 30),
        couriers: data.couriers,
        zones: data.zones,
      },
    });
  } catch (e) {
    console.error("Failed to save shipping settings:", e.message);
    return { success: false, message: "Database error." };
  }

  return { success: true };
};

export default function ShippingPage() {
  const { settings: initial } = useLoaderData();
  const fetcher = useFetcher();
  const isSaving = fetcher.state === "submitting";

  const [couriers, setCouriers] = useState(initial.couriers);
  const [zones, setZones] = useState(initial.zones);
  const [defaultWeight, setDefaultWeight] = useState(initial.defaultWeight);
  const [autoSelectCourier, setAutoSelectCourier] = useState(initial.autoSelectCourier);
  const [showRatesInCart, setShowRatesInCart] = useState(initial.showRatesInCart);
  const [codExtraCharge, setCodExtraCharge] = useState(initial.codExtraCharge);
  const [calcPincode, setCalcPincode] = useState("");
  const [calcWeight, setCalcWeight] = useState(500);
  const [calcResults, setCalcResults] = useState(null);

  const toggleCourier = (id) =>
    setCouriers(couriers.map(c => c.id === id ? { ...c, connected: !c.connected } : c));

  const updateCourierKey = (id, value) =>
    setCouriers(couriers.map(c => c.id === id ? { ...c, apiKey: value } : c));

  const updateZone = (id, field, value) =>
    setZones(zones.map(z => z.id === id ? { ...z, [field]: value } : z));

  const simulateRates = () => {
    if (!calcPincode) return;
    setCalcResults([
      { courier: "Shiprocket", price: 45, eta: "2-3 days", recommended: true },
      { courier: "Delhivery", price: 52, eta: "2-4 days", recommended: false },
      { courier: "Blue Dart", price: 78, eta: "1-2 days", recommended: false },
      { courier: "DTDC", price: 38, eta: "3-5 days", recommended: false },
    ]);
  };

  const handleSave = () => {
    fetcher.submit(
      {
        couriers: JSON.stringify(couriers),
        zones: JSON.stringify(zones),
        defaultWeight,
        autoSelectCourier: String(autoSelectCourier),
        showRatesInCart: String(showRatesInCart),
        codExtraCharge,
      },
      { method: "POST" }
    );
  };

  return (
    <s-page heading="Shipping Settings">
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

      {/* Courier Partners */}
      <s-section heading="🚚 Courier Partners">
        <s-paragraph>Connect your courier accounts to enable real-time shipping rates.</s-paragraph>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginTop: "16px" }}>
          {couriers.map((courier) => (
            <div key={courier.id} style={{
              border: `1px solid ${courier.connected ? "#008060" : "#e1e3e5"}`,
              borderRadius: "10px", padding: "16px",
              background: courier.connected ? "#f1f8f5" : "white",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "24px" }}>{courier.icon}</span>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>{courier.name}</div>
                    {courier.recommended && (
                      <span style={{ fontSize: "11px", background: "#e3f1eb", color: "#008060", padding: "2px 6px", borderRadius: "99px", fontWeight: "600" }}>
                        ⭐ Recommended
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleCourier(courier.id)}
                  style={{
                    padding: "6px 14px", borderRadius: "6px", border: "none", cursor: "pointer",
                    fontSize: "12px", fontWeight: "600",
                    background: courier.connected ? "#008060" : "#f6f6f7",
                    color: courier.connected ? "white" : "#6d7175",
                  }}
                >
                  {courier.connected ? "✓ Connected" : "Connect"}
                </button>
              </div>
              {courier.connected && (
                <div>
                  <input
                    type="text"
                    value={courier.apiKey}
                    onChange={(e) => updateCourierKey(courier.id, e.target.value)}
                    placeholder={`Enter ${courier.name} API Key`}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #c9cccf", fontSize: "13px", boxSizing: "border-box", fontFamily: "monospace" }}
                  />
                  <div style={{ fontSize: "11px", color: "#6d7175", marginTop: "4px" }}>
                    Get API key from {courier.name} dashboard → Settings → API
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </s-section>

      {/* Shipping Zones */}
      <s-section heading="🗺️ Shipping Zones & Rates">
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px 60px", gap: "12px", padding: "8px 12px", fontSize: "12px", fontWeight: "600", color: "#6d7175" }}>
            <span>ZONE NAME</span><span>RATE (₹)</span><span>FREE ABOVE (₹)</span><span>STATUS</span><span></span>
          </div>
          {zones.map((zone) => (
            <div key={zone.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px 60px", gap: "12px", alignItems: "center", padding: "12px", background: "#f6f6f7", borderRadius: "8px", border: "1px solid #e1e3e5" }}>
              <input type="text" value={zone.name} onChange={(e) => updateZone(zone.id, "name", e.target.value)} style={inputStyle} />
              <input type="number" value={zone.rate} onChange={(e) => updateZone(zone.id, "rate", Number(e.target.value))} style={inputStyle} />
              <input type="number" value={zone.freeAbove} onChange={(e) => updateZone(zone.id, "freeAbove", Number(e.target.value))} style={inputStyle} />
              <label style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={zone.enabled} onChange={(e) => updateZone(zone.id, "enabled", e.target.checked)} style={{ display: "none" }} />
                <div style={{ ...toggleStyle, background: zone.enabled ? "#008060" : "#c9cccf" }}>
                  <div style={{ ...toggleDotStyle, transform: zone.enabled ? "translateX(20px)" : "translateX(2px)" }} />
                </div>
              </label>
              <span style={{ fontSize: "11px", fontWeight: "600", color: zone.enabled ? "#008060" : "#6d7175" }}>{zone.enabled ? "Active" : "Off"}</span>
            </div>
          ))}
        </div>
      </s-section>

      {/* General Settings */}
      <s-section heading="⚙️ General Settings">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Auto-Select Best Courier</div>
              <div style={hintStyle}>Automatically pick the cheapest + fastest courier per order</div>
            </div>
            <label style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={autoSelectCourier} onChange={(e) => setAutoSelectCourier(e.target.checked)} style={{ display: "none" }} />
              <div style={{ ...toggleStyle, background: autoSelectCourier ? "#008060" : "#c9cccf" }}>
                <div style={{ ...toggleDotStyle, transform: autoSelectCourier ? "translateX(20px)" : "translateX(2px)" }} />
              </div>
            </label>
          </div>
          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Show Rates in Cart</div>
              <div style={hintStyle}>Display estimated shipping cost before checkout</div>
            </div>
            <label style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={showRatesInCart} onChange={(e) => setShowRatesInCart(e.target.checked)} style={{ display: "none" }} />
              <div style={{ ...toggleStyle, background: showRatesInCart ? "#008060" : "#c9cccf" }}>
                <div style={{ ...toggleDotStyle, transform: showRatesInCart ? "translateX(20px)" : "translateX(2px)" }} />
              </div>
            </label>
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Default Product Weight (grams)</label>
            <input type="number" value={defaultWeight} onChange={(e) => setDefaultWeight(Number(e.target.value))} style={{ ...inputStyle, maxWidth: "200px" }} />
            <div style={hintStyle}>Used when product weight is not set</div>
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>COD Extra Charge (₹)</label>
            <input type="number" value={codExtraCharge} onChange={(e) => setCodExtraCharge(Number(e.target.value))} style={{ ...inputStyle, maxWidth: "200px" }} />
            <div style={hintStyle}>Additional fee added for Cash on Delivery orders</div>
          </div>
        </div>
      </s-section>

      {/* Rate Calculator */}
      <s-section heading="🧮 Rate Calculator (Test Tool)">
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", alignItems: "flex-end" }}>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Destination Pincode</label>
            <input type="text" value={calcPincode} onChange={(e) => setCalcPincode(e.target.value)} placeholder="e.g. 110001" style={{ ...inputStyle, width: "160px" }} maxLength={6} />
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Weight (grams)</label>
            <input type="number" value={calcWeight} onChange={(e) => setCalcWeight(Number(e.target.value))} style={{ ...inputStyle, width: "130px" }} />
          </div>
          <button onClick={simulateRates} style={calcButtonStyle}>🔍 Check Rates</button>
        </div>
        {calcResults && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#6d7175", marginBottom: "10px" }}>AVAILABLE RATES FOR {calcPincode}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {calcResults.map((result, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "8px", background: result.recommended ? "#f1f8f5" : "#f6f6f7", border: `1px solid ${result.recommended ? "#008060" : "#e1e3e5"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontWeight: "600", fontSize: "14px" }}>{result.courier}</span>
                    {result.recommended && <span style={{ fontSize: "11px", background: "#008060", color: "white", padding: "2px 8px", borderRadius: "99px", fontWeight: "600" }}>Best Pick</span>}
                  </div>
                  <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#6d7175" }}>🕐 {result.eta}</span>
                    <span style={{ fontSize: "16px", fontWeight: "700" }}>₹{result.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </s-section>

      <s-section slot="aside" heading="📋 Setup Checklist">
        {[
          { label: "Connect 1+ courier", done: couriers.some(c => c.connected) },
          { label: "Set shipping zones", done: true },
          { label: "Configure COD charge", done: codExtraCharge > 0 },
          { label: "Test rate calculator", done: !!calcResults },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", borderBottom: "1px solid #f1f1f1", fontSize: "13px" }}>
            <span style={{ color: item.done ? "#008060" : "#c9cccf", fontSize: "16px" }}>{item.done ? "✅" : "⭕"}</span>
            <span style={{ color: item.done ? "#202223" : "#6d7175" }}>{item.label}</span>
          </div>
        ))}
      </s-section>

      <s-section slot="aside" heading="💡 Pro Tips">
        <s-paragraph>Connect Shiprocket first — it aggregates 25+ couriers under one API key.</s-paragraph>
        <s-paragraph>Set COD extra charge to ₹25-50 to nudge customers toward prepaid.</s-paragraph>
        <s-paragraph>Use auto-select courier to always get the best rate per order automatically.</s-paragraph>
      </s-section>
    </s-page>
  );
}

const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #c9cccf", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "white" };
const fieldGroupStyle = { display: "flex", flexDirection: "column", gap: "4px" };
const labelStyle = { fontSize: "13px", fontWeight: "600", color: "#202223", display: "block" };
const hintStyle = { fontSize: "12px", color: "#6d7175" };
const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "#f6f6f7", borderRadius: "8px" };
const toggleStyle = { width: "44px", height: "24px", borderRadius: "99px", position: "relative", transition: "background 0.2s", cursor: "pointer" };
const toggleDotStyle = { position: "absolute", top: "2px", width: "20px", height: "20px", borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "transform 0.2s" };
const calcButtonStyle = { padding: "8px 20px", background: "#008060", color: "white", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap", height: "36px" };

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};