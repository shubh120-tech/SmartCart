import { useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  let settings = null;
  try {
    settings = await db.smartCartSettings.findUnique({ where: { shop: session.shop } });
  } catch (e) {
    console.warn("SmartCartSettings not found:", e.message);
  }

  return { settings };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  const parsed = {
    freeShippingEnabled: data.freeShippingEnabled === "true",
    freeShippingThreshold: parseFloat(data.freeShippingThreshold || 499),
    freeShippingMessage: data.freeShippingMessage || "Add {amount} more for FREE shipping 🚚",
    freeShippingSuccessMessage: data.freeShippingSuccessMessage || "🎉 You've unlocked FREE shipping!",
    milestonesEnabled: data.milestonesEnabled === "true",
    milestones: data.milestones || "[]",
    upsellEnabled: data.upsellEnabled === "true",
    upsellProductVariantId: data.upsellProductVariantId || "",
    upsellProductTitle: data.upsellProductTitle || "",
    upsellProductPrice: parseFloat(data.upsellProductPrice || 0),
    upsellProductImage: data.upsellProductImage || "",
    upsellTitle: data.upsellTitle || "Complete your order",
    upsellBadgeText: data.upsellBadgeText || "Frequently bought together",
    prepaidNudgeEnabled: data.prepaidNudgeEnabled === "true",
    prepaidDiscount: parseFloat(data.prepaidDiscount || 50),
    prepaidDiscountType: data.prepaidDiscountType || "flat",
    trustBadgesEnabled: data.trustBadgesEnabled === "true",
  };

  try {
    await db.smartCartSettings.upsert({
      where: { shop: session.shop },
      update: parsed,
      create: { shop: session.shop, ...parsed },
    });
  } catch (e) {
    console.error("Failed to save SmartCart settings:", e.message);
    return { success: false, message: "Database error." };
  }

  return { success: true };
};

export default function SmartCartPage() {
  const { settings: s } = useLoaderData();
  const fetcher = useFetcher();
  const isSaving = fetcher.state === "submitting";

  // Free Shipping Bar — from DB
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(s?.freeShippingEnabled ?? true);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(s?.freeShippingThreshold ?? 499);
  const [freeShippingMessage, setFreeShippingMessage] = useState(s?.freeShippingMessage ?? "Add {amount} more for FREE shipping 🚚");
  const [freeShippingSuccessMessage, setFreeShippingSuccessMessage] = useState(s?.freeShippingSuccessMessage ?? "🎉 You've unlocked FREE shipping!");

  // Milestones — from DB
  const [milestonesEnabled, setMilestonesEnabled] = useState(s?.milestonesEnabled ?? true);
  const [milestones, setMilestones] = useState(s?.milestones ?? JSON.stringify([
    { threshold: 500,  reward: "Free Gift 🎁",            description: "Mystery gift added to your order" },
    { threshold: 999,  reward: "10% OFF 🏷️",              description: "Discount applied at checkout" },
    { threshold: 1999, reward: "Free Express Shipping ⚡", description: "Delivered in 1-2 days" },
  ], null, 2));

  // Upsell — from DB
  const [upsellEnabled, setUpsellEnabled] = useState(s?.upsellEnabled ?? false);
  const [upsellProductVariantId, setUpsellProductVariantId] = useState(s?.upsellProductVariantId ?? "");
  const [upsellProductTitle, setUpsellProductTitle] = useState(s?.upsellProductTitle ?? "");
  const [upsellProductPrice, setUpsellProductPrice] = useState(s?.upsellProductPrice ?? 0);
  const [upsellProductImage, setUpsellProductImage] = useState(s?.upsellProductImage ?? "");
  const [upsellTitle, setUpsellTitle] = useState(s?.upsellTitle ?? "Complete your order");
  const [upsellBadgeText, setUpsellBadgeText] = useState(s?.upsellBadgeText ?? "Frequently bought together");

  // Prepaid nudge — from DB
  const [prepaidNudgeEnabled, setPrepaidNudgeEnabled] = useState(s?.prepaidNudgeEnabled ?? true);
  const [prepaidDiscount, setPrepaidDiscount] = useState(s?.prepaidDiscount ?? 50);
  const [prepaidDiscountType, setPrepaidDiscountType] = useState(s?.prepaidDiscountType ?? "flat");

  // Trust badges — from DB
  const [trustBadgesEnabled, setTrustBadgesEnabled] = useState(s?.trustBadgesEnabled ?? true);

  const [activeTab, setActiveTab] = useState("freeshipping");

  const handleSave = () => {
    fetcher.submit(
      {
        freeShippingEnabled: String(freeShippingEnabled),
        freeShippingThreshold,
        freeShippingMessage,
        freeShippingSuccessMessage,
        milestonesEnabled: String(milestonesEnabled),
        milestones,
        upsellEnabled: String(upsellEnabled),
        upsellProductVariantId,
        upsellProductTitle,
        upsellProductPrice,
        upsellProductImage,
        upsellTitle,
        upsellBadgeText,
        prepaidNudgeEnabled: String(prepaidNudgeEnabled),
        prepaidDiscount,
        prepaidDiscountType,
        trustBadgesEnabled: String(trustBadgesEnabled),
      },
      { method: "POST" }
    );
  };

  const tabs = ["freeshipping", "milestones", "upsell", "prepaid", "trust"];
  const tabLabels = {
    freeshipping: "🚚 Free Shipping",
    milestones: "🏆 Milestones",
    upsell: "📈 Upsell",
    prepaid: "💳 Prepaid Nudge",
    trust: "✅ Trust Badges",
  };

  return (
    <s-page heading="Smart Cart Settings">
      <s-button slot="primary-action" onClick={handleSave} {...(isSaving ? { loading: true } : {})}>
        {isSaving ? "Saving..." : "Save Settings"}
      </s-button>

      {fetcher.data?.success && <s-banner tone="success">Smart Cart settings saved!</s-banner>}
      {fetcher.data?.success === false && <s-banner tone="critical">{fetcher.data.message}</s-banner>}

      {/* Tab bar */}
      <s-section>
        <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid #e1e3e5" }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "10px 16px", border: "none", cursor: "pointer", fontSize: "13px",
              fontWeight: activeTab === tab ? "600" : "400", background: "transparent",
              color: activeTab === tab ? "#202223" : "#6d7175",
              borderBottom: activeTab === tab ? "2px solid #202223" : "2px solid transparent",
              marginBottom: "-1px",
            }}>
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </s-section>

      {/* Free Shipping Bar */}
      {activeTab === "freeshipping" && (
        <s-section heading="Free Shipping Bar" description="Show a progress bar that nudges customers to spend more to unlock free shipping.">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Enable free shipping bar</div>
                <div style={hintStyle}>Shown in checkout to motivate customers</div>
              </div>
              <label style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={freeShippingEnabled} onChange={e => setFreeShippingEnabled(e.target.checked)} style={{ display: "none" }} />
                <div style={{ ...toggleStyle, background: freeShippingEnabled ? "#008060" : "#c9cccf" }}>
                  <div style={{ ...toggleDotStyle, transform: freeShippingEnabled ? "translateX(20px)" : "translateX(2px)" }} />
                </div>
              </label>
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Free shipping threshold (₹)</label>
              <input type="number" value={freeShippingThreshold} onChange={e => setFreeShippingThreshold(Number(e.target.value))} style={{ ...inputStyle, maxWidth: "200px" }} />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Progress message</label>
              <input type="text" value={freeShippingMessage} onChange={e => setFreeShippingMessage(e.target.value)} style={inputStyle} />
              <div style={hintStyle}>Use {"{amount}"} as placeholder for the remaining amount</div>
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Success message</label>
              <input type="text" value={freeShippingSuccessMessage} onChange={e => setFreeShippingSuccessMessage(e.target.value)} style={inputStyle} />
              <div style={hintStyle}>Shown when customer has unlocked free shipping</div>
            </div>
          </div>
        </s-section>
      )}

      {/* Milestones */}
      {activeTab === "milestones" && (
        <s-section heading="Milestone Rewards" description="Reward customers at cart value thresholds to boost AOV.">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Enable milestone rewards</div>
                <div style={hintStyle}>Show unlockable rewards as customers add to cart</div>
              </div>
              <label style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={milestonesEnabled} onChange={e => setMilestonesEnabled(e.target.checked)} style={{ display: "none" }} />
                <div style={{ ...toggleStyle, background: milestonesEnabled ? "#008060" : "#c9cccf" }}>
                  <div style={{ ...toggleDotStyle, transform: milestonesEnabled ? "translateX(20px)" : "translateX(2px)" }} />
                </div>
              </label>
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Milestones (JSON)</label>
              <textarea
                value={milestones}
                onChange={e => setMilestones(e.target.value)}
                rows={10}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: "12px" }}
              />
              <div style={hintStyle}>
                Format: [{`{"threshold": 500, "reward": "Free Gift", "description": "Mystery gift"}`}]
              </div>
            </div>
          </div>
        </s-section>
      )}

      {/* Upsell */}
      {activeTab === "upsell" && (
        <s-section heading="Upsell Block" description="Show a product recommendation before checkout to increase order value.">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Enable upsell block</div>
                <div style={hintStyle}>Show a product recommendation at checkout</div>
              </div>
              <label style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={upsellEnabled} onChange={e => setUpsellEnabled(e.target.checked)} style={{ display: "none" }} />
                <div style={{ ...toggleStyle, background: upsellEnabled ? "#008060" : "#c9cccf" }}>
                  <div style={{ ...toggleDotStyle, transform: upsellEnabled ? "translateX(20px)" : "translateX(2px)" }} />
                </div>
              </label>
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Product variant ID</label>
              <input type="text" value={upsellProductVariantId} onChange={e => setUpsellProductVariantId(e.target.value)} placeholder="gid://shopify/ProductVariant/123456789" style={inputStyle} />
              <div style={hintStyle}>Find this in Shopify Admin → Products → your product → copy variant ID</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Product title</label>
                <input type="text" value={upsellProductTitle} onChange={e => setUpsellProductTitle(e.target.value)} style={inputStyle} />
              </div>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Product price (₹)</label>
                <input type="number" value={upsellProductPrice} onChange={e => setUpsellProductPrice(Number(e.target.value))} style={inputStyle} />
              </div>
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Product image URL</label>
              <input type="text" value={upsellProductImage} onChange={e => setUpsellProductImage(e.target.value)} placeholder="https://cdn.shopify.com/..." style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Upsell heading</label>
                <input type="text" value={upsellTitle} onChange={e => setUpsellTitle(e.target.value)} style={inputStyle} />
              </div>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Badge text</label>
                <input type="text" value={upsellBadgeText} onChange={e => setUpsellBadgeText(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>
        </s-section>
      )}

      {/* Prepaid Nudge */}
      {activeTab === "prepaid" && (
        <s-section heading="Prepaid COD Nudge" description="Encourage customers to switch from COD to prepaid with a discount incentive.">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Enable prepaid nudge</div>
                <div style={hintStyle}>Show a banner encouraging online payment at checkout</div>
              </div>
              <label style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={prepaidNudgeEnabled} onChange={e => setPrepaidNudgeEnabled(e.target.checked)} style={{ display: "none" }} />
                <div style={{ ...toggleStyle, background: prepaidNudgeEnabled ? "#008060" : "#c9cccf" }}>
                  <div style={{ ...toggleDotStyle, transform: prepaidNudgeEnabled ? "translateX(20px)" : "translateX(2px)" }} />
                </div>
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Discount amount</label>
                <input type="number" value={prepaidDiscount} onChange={e => setPrepaidDiscount(Number(e.target.value))} style={inputStyle} />
              </div>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Discount type</label>
                <select value={prepaidDiscountType} onChange={e => setPrepaidDiscountType(e.target.value)} style={inputStyle}>
                  <option value="flat">Flat (₹)</option>
                  <option value="percent">Percentage (%)</option>
                </select>
              </div>
            </div>
          </div>
        </s-section>
      )}

      {/* Trust Badges */}
      {activeTab === "trust" && (
        <s-section heading="Trust Badges" description="Show security and trust indicators to reduce checkout anxiety.">
          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Enable trust badges</div>
              <div style={hintStyle}>Show secure checkout, easy returns, and rating badges</div>
            </div>
            <label style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={trustBadgesEnabled} onChange={e => setTrustBadgesEnabled(e.target.checked)} style={{ display: "none" }} />
              <div style={{ ...toggleStyle, background: trustBadgesEnabled ? "#008060" : "#c9cccf" }}>
                <div style={{ ...toggleDotStyle, transform: trustBadgesEnabled ? "translateX(20px)" : "translateX(2px)" }} />
              </div>
            </label>
          </div>
          {trustBadgesEnabled && (
            <div style={{ marginTop: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {["🔒 Secure Checkout", "🚚 Easy Returns", "✅ 100% Safe Pay", "⭐ 4.8 Rated"].map(badge => (
                <div key={badge} style={{ padding: "8px 16px", background: "#f6f6f7", borderRadius: "99px", fontSize: "13px", border: "1px solid #e1e3e5" }}>
                  {badge}
                </div>
              ))}
            </div>
          )}
        </s-section>
      )}

      <s-section slot="aside" heading="📋 Setup Checklist">
        {[
          { label: "Free shipping bar enabled", done: freeShippingEnabled },
          { label: "Milestones configured", done: milestonesEnabled },
          { label: "Prepaid nudge enabled", done: prepaidNudgeEnabled },
          { label: "Upsell product set", done: !!upsellProductVariantId },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", borderBottom: "1px solid #f1f1f1", fontSize: "13px" }}>
            <span style={{ color: item.done ? "#008060" : "#c9cccf", fontSize: "16px" }}>{item.done ? "✅" : "⭕"}</span>
            <span style={{ color: item.done ? "#202223" : "#6d7175" }}>{item.label}</span>
          </div>
        ))}
      </s-section>

      <s-section slot="aside" heading="💡 Pro Tips">
        <s-paragraph>Set free shipping threshold 20-30% above your average order value for best results.</s-paragraph>
        <s-paragraph>Use 3 milestones — gift at ₹500, discount at ₹999, express shipping at ₹1999.</s-paragraph>
        <s-paragraph>A prepaid discount of ₹50-100 converts 30-40% of COD orders to prepaid.</s-paragraph>
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

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};