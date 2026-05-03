import { useState } from "react";
import { useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";

const DEFAULT_SETTINGS = {
  enabled: true,
  minOrderValue: 0,
  maxOrderValue: 10000,
  extraFee: 0,
  extraFeeType: "flat",
  blockedPincodes: "",
  blockedStates: "",
  requireOtp: false,
  autoVerifyReturningCustomers: true,
  rtoProtection: true,
  rtoRiskThreshold: "medium",
  prepaidDiscount: 0,
  prepaidDiscountType: "flat",
  partialCodEnabled: false,
  partialCodMinPrepaid: 20,
};

const DEFAULT_RTO_STATS = {
  totalOrders: 0,
  codOrders: 0,
  rtoCount: 0,
  rtoRate: 0,
  savedByVerification: 0,
  prepaidConversions: 0,
};

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  let settings = DEFAULT_SETTINGS;
  let rtoStats = DEFAULT_RTO_STATS;

  try {
    const row = await db.codSettings.findUnique({ where: { shop: session.shop } });
    if (row) settings = row;
  } catch (e) {
    console.warn("CodSettings table not found. Run: npx prisma migrate dev --name add-smartcart-models");
  }

  try {
    const stats = await db.rtoStats.findUnique({ where: { shop: session.shop } });
    if (stats) rtoStats = stats;
  } catch (e) {
    console.warn("RtoStats table not found. Run: npx prisma migrate dev --name add-smartcart-models");
  }

  return { settings, rtoStats };
};

export const action = async ({ request }) => {
  await authenticate.admin(request);
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  const parsed = {
    enabled: data.enabled === "true",
    minOrderValue: parseFloat(data.minOrderValue || 0),
    maxOrderValue: parseFloat(data.maxOrderValue || 10000),
    extraFee: parseFloat(data.extraFee || 0),
    extraFeeType: data.extraFeeType || "flat",
    blockedPincodes: data.blockedPincodes || "",
    blockedStates: data.blockedStates || "",
    requireOtp: data.requireOtp === "true",
    autoVerifyReturningCustomers: data.autoVerifyReturningCustomers === "true",
    rtoProtection: data.rtoProtection === "true",
    rtoRiskThreshold: data.rtoRiskThreshold || "medium",
    prepaidDiscount: parseFloat(data.prepaidDiscount || 0),
    prepaidDiscountType: data.prepaidDiscountType || "flat",
    partialCodEnabled: data.partialCodEnabled === "true",
    partialCodMinPrepaid: parseFloat(data.partialCodMinPrepaid || 20),
  };

  try {
    await db.codSettings.upsert({
      where: { shop: session.shop },
      update: parsed,
      create: { shop: session.shop, ...parsed },
    });
  } catch (e) {
    console.error("Failed to save COD settings:", e.message);
    return { success: false, message: "Database error. Run: npx prisma migrate dev" };
  }

  return { success: true, settings: parsed };
};

export default function CodManagement() {
  const fetcher = useFetcher();
  const isSaving = fetcher.state === "submitting";

  // COD General
  const [enabled, setEnabled] = useState(true);
  const [minOrderValue, setMinOrderValue] = useState(0);
  const [maxOrderValue, setMaxOrderValue] = useState(10000);
  const [extraFee, setExtraFee] = useState(0);
  const [extraFeeType, setExtraFeeType] = useState("flat");
  const [blockedPincodes, setBlockedPincodes] = useState("");
  const [blockedStates, setBlockedStates] = useState("");

  // RTO
  const [rtoProtection, setRtoProtection] = useState(true);
  const [rtoRiskThreshold, setRtoRiskThreshold] = useState("medium");
  const [requireOtp, setRequireOtp] = useState(false);
  const [autoVerify, setAutoVerify] = useState(true);

  // Prepaid incentive
  const [prepaidDiscount, setPrepaidDiscount] = useState(0);
  const [prepaidDiscountType, setPrepaidDiscountType] = useState("flat");

  // Partial COD
  const [partialCodEnabled, setPartialCodEnabled] = useState(false);
  const [partialCodMinPrepaid, setPartialCodMinPrepaid] = useState(20);

  // Simulated RTO stats strip
  const rtoStats = { codOrders: 480, rtoCount: 62, rtoRate: 12.9, prepaidConversions: 34 };
  const rtoRateColor = rtoStats.rtoRate < 10 ? "#008060" : rtoStats.rtoRate < 20 ? "#b5731d" : "#d72c0d";

  const handleSave = () => {
    fetcher.submit(
      {
        enabled: String(enabled),
        minOrderValue,
        maxOrderValue,
        extraFee,
        extraFeeType,
        blockedPincodes,
        blockedStates,
        requireOtp: String(requireOtp),
        autoVerifyReturningCustomers: String(autoVerify),
        rtoProtection: String(rtoProtection),
        rtoRiskThreshold,
        prepaidDiscount,
        prepaidDiscountType,
        partialCodEnabled: String(partialCodEnabled),
        partialCodMinPrepaid,
      },
      { method: "POST" }
    );
  };

  return (
    <s-page heading="COD Management">
      <s-button
        slot="primary-action"
        onClick={handleSave}
        {...(isSaving ? { loading: true } : {})}
      >
        {isSaving ? "Saving..." : "Save Settings"}
      </s-button>

      {fetcher.data?.success && (
        <s-banner tone="success">COD settings saved successfully!</s-banner>
      )}
      {fetcher.data?.success === false && (
        <s-banner tone="critical">{fetcher.data.message}</s-banner>
      )}

      {/* RTO Stats Strip */}
      <s-section heading="📊 RTO Overview">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[
            { label: "Total COD Orders", value: rtoStats.codOrders, color: "#202223" },
            { label: "RTO Count", value: rtoStats.rtoCount, color: rtoRateColor },
            { label: "RTO Rate", value: `${rtoStats.rtoRate}%`, color: rtoRateColor },
            { label: "Prepaid Conversions", value: rtoStats.prepaidConversions, color: "#008060" },
          ].map(stat => (
            <div key={stat.label} style={{
              background: "#f6f6f7", borderRadius: "8px", padding: "16px",
              border: "1px solid #e1e3e5",
            }}>
              <div style={{ fontSize: "12px", color: "#6d7175", marginBottom: "6px" }}>{stat.label}</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </s-section>

      {/* COD Availability */}
      <s-section heading="💵 COD Availability" description="Control when and where COD is offered.">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Enable Cash on Delivery</div>
              <div style={hintStyle}>Offer COD as a payment option at checkout</div>
            </div>
            <label style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} style={{ display: "none" }} />
              <div style={{ ...toggleStyle, background: enabled ? "#008060" : "#c9cccf" }}>
                <div style={{ ...toggleDotStyle, transform: enabled ? "translateX(20px)" : "translateX(2px)" }} />
              </div>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Minimum order value (₹)</label>
              <input type="number" value={minOrderValue} onChange={e => setMinOrderValue(Number(e.target.value))} style={inputStyle} />
              <div style={hintStyle}>COD available only above this amount</div>
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Maximum order value (₹)</label>
              <input type="number" value={maxOrderValue} onChange={e => setMaxOrderValue(Number(e.target.value))} style={inputStyle} />
              <div style={hintStyle}>COD blocked above this amount</div>
            </div>
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Blocked pincodes</label>
            <textarea value={blockedPincodes} onChange={e => setBlockedPincodes(e.target.value)}
              placeholder="110001, 400001, 600001"
              rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace" }} />
            <div style={hintStyle}>Comma-separated pincodes where COD is unavailable</div>
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Blocked states</label>
            <textarea value={blockedStates} onChange={e => setBlockedStates(e.target.value)}
              placeholder="J&K, Manipur, Nagaland"
              rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            <div style={hintStyle}>Comma-separated state names</div>
          </div>
        </div>
      </s-section>

      {/* COD Fee */}
      <s-section heading="🏷️ COD Handling Fee" description="Charge a small fee to offset COD processing costs.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Extra fee amount</label>
            <input type="number" value={extraFee} onChange={e => setExtraFee(Number(e.target.value))} style={inputStyle} />
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Fee type</label>
            <select value={extraFeeType} onChange={e => setExtraFeeType(e.target.value)} style={inputStyle}>
              <option value="flat">Flat (₹)</option>
              <option value="percent">Percentage (%)</option>
            </select>
          </div>
        </div>
      </s-section>

      {/* RTO Reduction */}
      <s-section heading="🔄 RTO Reduction" description="Reduce Return-to-Origin with smart verification and risk scoring.">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Enable RTO protection</div>
              <div style={hintStyle}>Automatically flag high-risk COD orders for review</div>
            </div>
            <label style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={rtoProtection} onChange={e => setRtoProtection(e.target.checked)} style={{ display: "none" }} />
              <div style={{ ...toggleStyle, background: rtoProtection ? "#008060" : "#c9cccf" }}>
                <div style={{ ...toggleDotStyle, transform: rtoProtection ? "translateX(20px)" : "translateX(2px)" }} />
              </div>
            </label>
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Risk threshold</label>
            <select value={rtoRiskThreshold} onChange={e => setRtoRiskThreshold(e.target.value)} style={{ ...inputStyle, maxWidth: "320px" }}>
              <option value="low">Low — flag only very high risk</option>
              <option value="medium">Medium — balanced (recommended)</option>
              <option value="high">High — flag aggressively</option>
            </select>
            <div style={hintStyle}>Orders above this risk level will be held for verification</div>
          </div>

          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Require OTP verification for COD</div>
              <div style={hintStyle}>Send OTP to customer's phone before confirming COD order</div>
            </div>
            <label style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={requireOtp} onChange={e => setRequireOtp(e.target.checked)} style={{ display: "none" }} />
              <div style={{ ...toggleStyle, background: requireOtp ? "#008060" : "#c9cccf" }}>
                <div style={{ ...toggleDotStyle, transform: requireOtp ? "translateX(20px)" : "translateX(2px)" }} />
              </div>
            </label>
          </div>

          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Auto-verify returning customers</div>
              <div style={hintStyle}>Skip OTP for customers with a good delivery history</div>
            </div>
            <label style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={autoVerify} onChange={e => setAutoVerify(e.target.checked)} style={{ display: "none" }} />
              <div style={{ ...toggleStyle, background: autoVerify ? "#008060" : "#c9cccf" }}>
                <div style={{ ...toggleDotStyle, transform: autoVerify ? "translateX(20px)" : "translateX(2px)" }} />
              </div>
            </label>
          </div>
        </div>
      </s-section>

      {/* Prepaid Incentive */}
      <s-section heading="💳 Prepaid Incentive" description="Encourage customers to switch from COD to prepaid.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Prepaid discount</label>
            <input type="number" value={prepaidDiscount} onChange={e => setPrepaidDiscount(Number(e.target.value))} style={inputStyle} />
            <div style={hintStyle}>Shown at checkout when customer selects COD</div>
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Discount type</label>
            <select value={prepaidDiscountType} onChange={e => setPrepaidDiscountType(e.target.value)} style={inputStyle}>
              <option value="flat">Flat (₹)</option>
              <option value="percent">Percentage (%)</option>
            </select>
          </div>
        </div>
      </s-section>

      {/* Partial COD */}
      <s-section heading="🔀 Partial COD" description="Let customers pay part prepaid, part on delivery.">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Enable partial COD</div>
              <div style={hintStyle}>Customer pays a % upfront, rest on delivery</div>
            </div>
            <label style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={partialCodEnabled} onChange={e => setPartialCodEnabled(e.target.checked)} style={{ display: "none" }} />
              <div style={{ ...toggleStyle, background: partialCodEnabled ? "#008060" : "#c9cccf" }}>
                <div style={{ ...toggleDotStyle, transform: partialCodEnabled ? "translateX(20px)" : "translateX(2px)" }} />
              </div>
            </label>
          </div>
          {partialCodEnabled && (
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Minimum prepaid percentage (%)</label>
              <input type="number" value={partialCodMinPrepaid} onChange={e => setPartialCodMinPrepaid(Number(e.target.value))}
                style={{ ...inputStyle, maxWidth: "200px" }} />
              <div style={hintStyle}>Customer must pay at least this % upfront</div>
            </div>
          )}
        </div>
      </s-section>

      {/* Aside checklist */}
      <s-section slot="aside" heading="📋 COD Checklist">
        {[
          { label: "COD is enabled", done: enabled },
          { label: "Order limits configured", done: maxOrderValue > 0 },
          { label: "RTO protection on", done: rtoProtection },
          { label: "Prepaid incentive set", done: prepaidDiscount > 0 },
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
        <s-paragraph>Set OTP verification for orders above ₹2000 to cut RTO significantly.</s-paragraph>
        <s-paragraph>Offer ₹50 prepaid discount — most customers will switch, reducing your RTO to near zero.</s-paragraph>
        <s-paragraph>Block high-RTO pincodes after 30 days of data. Check Analytics for patterns.</s-paragraph>
      </s-section>
    </s-page>
  );
}

// ── Styles (matching shipping page) ──────────────────────────────────────────
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