import { useState } from "react";
import { useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const settings = Object.fromEntries(formData);
  // TODO: Save to DB via Prisma
  return { success: true, settings };
};

export default function SmartCartPage() {
  const fetcher = useFetcher();
  const isSaving = fetcher.state === "submitting";

  // Milestone Rewards State
  const [milestones, setMilestones] = useState([
    { id: 1, amount: 499, reward: "Free Shipping", enabled: true },
    { id: 2, amount: 999, reward: "10% Discount", enabled: true },
    { id: 3, amount: 1999, reward: "Free Gift", enabled: false },
  ]);

  // Upsell Settings
  const [upsellEnabled, setUpsellEnabled] = useState(true);
  const [upsellTitle, setUpsellTitle] = useState("You might also like");
  const [maxUpsellItems, setMaxUpsellItems] = useState(3);

  // Free Shipping Bar
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(true);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(499);
  const [freeShippingMessage, setFreeShippingMessage] = useState(
    "Add ₹{amount} more for FREE shipping! 🚚"
  );

  const addMilestone = () => {
    const newId = milestones.length + 1;
    setMilestones([
      ...milestones,
      { id: newId, amount: 0, reward: "", enabled: true },
    ]);
  };

  const removeMilestone = (id) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  const updateMilestone = (id, field, value) => {
    setMilestones(
      milestones.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleSave = () => {
    fetcher.submit(
      {
        milestones: JSON.stringify(milestones),
        upsellEnabled,
        upsellTitle,
        maxUpsellItems,
        freeShippingEnabled,
        freeShippingThreshold,
        freeShippingMessage,
      },
      { method: "POST" }
    );
  };

  return (
    <s-page heading="Smart Cart Settings">
      <s-button
        slot="primary-action"
        onClick={handleSave}
        {...(isSaving ? { loading: true } : {})}
      >
        {isSaving ? "Saving..." : "Save Settings"}
      </s-button>

      {fetcher.data?.success && (
        <s-banner tone="success">
          Settings saved successfully!
        </s-banner>
      )}

      {/* Free Shipping Progress Bar */}
      <s-section heading="🚚 Free Shipping Progress Bar">
        <s-paragraph>
          Show customers how close they are to unlocking free shipping.
          This appears as a progress bar inside the cart.
        </s-paragraph>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
          {/* Toggle */}
          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Enable Free Shipping Bar</div>
              <div style={hintStyle}>Show progress bar in cart drawer</div>
            </div>
            <label style={toggleContainerStyle}>
              <input
                type="checkbox"
                checked={freeShippingEnabled}
                onChange={(e) => setFreeShippingEnabled(e.target.checked)}
                style={{ display: "none" }}
              />
              <div style={{
                ...toggleStyle,
                background: freeShippingEnabled ? "#008060" : "#c9cccf",
              }}>
                <div style={{
                  ...toggleDotStyle,
                  transform: freeShippingEnabled ? "translateX(20px)" : "translateX(2px)",
                }} />
              </div>
            </label>
          </div>

          {/* Threshold */}
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Free Shipping Threshold (₹)</label>
            <input
              type="number"
              value={freeShippingThreshold}
              onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
              style={inputStyle}
              placeholder="499"
            />
            <div style={hintStyle}>Customers need to spend this amount to get free shipping</div>
          </div>

          {/* Message */}
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Progress Message</label>
            <input
              type="text"
              value={freeShippingMessage}
              onChange={(e) => setFreeShippingMessage(e.target.value)}
              style={inputStyle}
              placeholder="Add ₹{amount} more for FREE shipping! 🚚"
            />
            <div style={hintStyle}>Use {"{amount}"} to show the remaining amount dynamically</div>
          </div>

          {/* Preview */}
          <div style={previewBoxStyle}>
            <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "10px", color: "#6d7175" }}>
              PREVIEW
            </div>
            <div style={{ fontSize: "13px", color: "#202223", marginBottom: "8px" }}>
              {freeShippingMessage.replace("{amount}", `₹${freeShippingThreshold - 299}`)}
            </div>
            <div style={{ background: "#e1e3e5", borderRadius: "99px", height: "8px", overflow: "hidden" }}>
              <div style={{
                background: "#008060",
                width: "60%",
                height: "100%",
                borderRadius: "99px",
                transition: "width 0.3s",
              }} />
            </div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "6px" }}>
              ₹299 / ₹{freeShippingThreshold} — 60% there!
            </div>
          </div>
        </div>
      </s-section>

      {/* Milestone Rewards */}
      <s-section heading="🏆 Milestone Rewards">
        <s-paragraph>
          Reward customers when their cart value hits certain amounts.
          Great for increasing average order value.
        </s-paragraph>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
          {milestones.map((milestone, index) => (
            <div key={milestone.id} style={milestoneCardStyle}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: milestone.enabled ? "#008060" : "#e1e3e5",
                color: milestone.enabled ? "white" : "#6d7175",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "700", fontSize: "13px", flexShrink: 0,
              }}>
                {index + 1}
              </div>

              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Cart Amount (₹)</label>
                  <input
                    type="number"
                    value={milestone.amount}
                    onChange={(e) => updateMilestone(milestone.id, "amount", Number(e.target.value))}
                    style={inputStyle}
                    placeholder="999"
                  />
                </div>
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Reward</label>
                  <input
                    type="text"
                    value={milestone.reward}
                    onChange={(e) => updateMilestone(milestone.id, "reward", e.target.value)}
                    style={inputStyle}
                    placeholder="Free Shipping / 10% Off / Free Gift"
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={toggleContainerStyle}>
                  <input
                    type="checkbox"
                    checked={milestone.enabled}
                    onChange={(e) => updateMilestone(milestone.id, "enabled", e.target.checked)}
                    style={{ display: "none" }}
                  />
                  <div style={{
                    ...toggleStyle,
                    background: milestone.enabled ? "#008060" : "#c9cccf",
                  }}>
                    <div style={{
                      ...toggleDotStyle,
                      transform: milestone.enabled ? "translateX(20px)" : "translateX(2px)",
                    }} />
                  </div>
                </label>
                <button
                  onClick={() => removeMilestone(milestone.id)}
                  style={deleteButtonStyle}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          <button onClick={addMilestone} style={addButtonStyle}>
            + Add Milestone
          </button>
        </div>
      </s-section>

      {/* Upsell Settings */}
      <s-section heading="⬆️ Upsell Offers">
        <s-paragraph>
          Show related product suggestions inside the cart to increase order value.
        </s-paragraph>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
          {/* Toggle */}
          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Enable Upsell in Cart</div>
              <div style={hintStyle}>Show product recommendations in the cart drawer</div>
            </div>
            <label style={toggleContainerStyle}>
              <input
                type="checkbox"
                checked={upsellEnabled}
                onChange={(e) => setUpsellEnabled(e.target.checked)}
                style={{ display: "none" }}
              />
              <div style={{
                ...toggleStyle,
                background: upsellEnabled ? "#008060" : "#c9cccf",
              }}>
                <div style={{
                  ...toggleDotStyle,
                  transform: upsellEnabled ? "translateX(20px)" : "translateX(2px)",
                }} />
              </div>
            </label>
          </div>

          {/* Title */}
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Section Title</label>
            <input
              type="text"
              value={upsellTitle}
              onChange={(e) => setUpsellTitle(e.target.value)}
              style={inputStyle}
              placeholder="You might also like"
            />
          </div>

          {/* Max Items */}
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Max Products to Show</label>
            <select
              value={maxUpsellItems}
              onChange={(e) => setMaxUpsellItems(Number(e.target.value))}
              style={inputStyle}
            >
              <option value={1}>1 product</option>
              <option value={2}>2 products</option>
              <option value={3}>3 products</option>
              <option value={4}>4 products</option>
            </select>
            <div style={hintStyle}>Recommended: 2-3 products for best conversion</div>
          </div>
        </div>
      </s-section>

      {/* Aside */}
      <s-section slot="aside" heading="💡 Tips">
        <s-paragraph>
          Set your free shipping threshold 20-30% above your average order value for best results.
        </s-paragraph>
        <s-paragraph>
          Milestone rewards work best when spaced evenly — e.g. ₹499, ₹999, ₹1999.
        </s-paragraph>
        <s-paragraph>
          Upsell products are automatically picked based on what's in the cart. You can manually pin products in the next update.
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="📊 Impact">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { label: "Avg AOV Increase", value: "+23%" },
            { label: "Free Shipping Conversion", value: "+18%" },
            { label: "Upsell Accept Rate", value: "12%" },
          ].map((stat) => (
            <div key={stat.label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "10px", background: "#f6f6f7",
              borderRadius: "6px", fontSize: "13px",
            }}>
              <span style={{ color: "#6d7175" }}>{stat.label}</span>
              <span style={{ fontWeight: "700", color: "#008060" }}>{stat.value}</span>
            </div>
          ))}
        </div>
      </s-section>
    </s-page>
  );
}

// Styles
const rowStyle = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", padding: "12px",
  background: "#f6f6f7", borderRadius: "8px",
};
const labelStyle = { fontSize: "13px", fontWeight: "600", color: "#202223", marginBottom: "4px", display: "block" };
const hintStyle = { fontSize: "12px", color: "#6d7175", marginTop: "4px" };
const inputStyle = {
  width: "100%", padding: "8px 12px", borderRadius: "6px",
  border: "1px solid #c9cccf", fontSize: "14px",
  outline: "none", boxSizing: "border-box", background: "white",
};
const fieldGroupStyle = { display: "flex", flexDirection: "column" };
const toggleContainerStyle = { cursor: "pointer" };
const toggleStyle = {
  width: "44px", height: "24px", borderRadius: "99px",
  position: "relative", transition: "background 0.2s", cursor: "pointer",
};
const toggleDotStyle = {
  position: "absolute", top: "2px", width: "20px", height: "20px",
  borderRadius: "50%", background: "white",
  boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "transform 0.2s",
};
const milestoneCardStyle = {
  display: "flex", alignItems: "center", gap: "16px",
  padding: "16px", background: "#f6f6f7",
  borderRadius: "8px", border: "1px solid #e1e3e5",
};
const deleteButtonStyle = {
  background: "none", border: "none",
  cursor: "pointer", fontSize: "16px", padding: "4px",
};
const addButtonStyle = {
  padding: "10px", background: "white",
  border: "2px dashed #c9cccf", borderRadius: "8px",
  fontSize: "14px", color: "#6d7175", cursor: "pointer",
  fontWeight: "600", transition: "border-color 0.2s",
};
const previewBoxStyle = {
  background: "#f6f6f7", borderRadius: "8px",
  padding: "16px", border: "1px solid #e1e3e5",
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};