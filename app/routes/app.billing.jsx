import { useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

// ─────────────────────────────────────────────────────────────────────────────
// PLANS CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    color: "#6d7175",
    badge: null,
    features: [
      "Free shipping bar",
      "Basic COD management",
      "Up to 100 orders/month",
      "Email support",
    ],
    notIncluded: [
      "Milestone rewards",
      "Upsell blocks",
      "RTO protection",
      "Branded tracking page",
      "WhatsApp notifications",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 999,
    annualPrice: 799,
    color: "#008060",
    badge: "⭐ Most Popular",
    trialDays: 14,
    features: [
      "Everything in Free",
      "Milestone rewards",
      "Upsell blocks",
      "RTO protection + OTP",
      "Branded tracking page",
      "WhatsApp & SMS notifications",
      "Up to 2,000 orders/month",
      "NDR management",
      "Priority support",
    ],
    notIncluded: [
      "Unlimited orders",
      "Custom courier integrations",
      "Dedicated account manager",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 2999,
    annualPrice: 2399,
    color: "#5C6AC4",
    badge: "🚀 Best Value",
    trialDays: 14,
    features: [
      "Everything in Pro",
      "Unlimited orders",
      "Custom courier integrations",
      "Dedicated account manager",
      "SLA-backed support",
      "Custom NDR workflows",
      "White-label tracking page",
      "API access",
    ],
    notIncluded: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOADER — fetch current subscription from Shopify
// ─────────────────────────────────────────────────────────────────────────────
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  let currentSubscription = null;
  let billingStatus = "free";
  let trialDaysRemaining = 0;

  try {
    const res = await admin.graphql(`
      query getAppSubscription {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            trialDays
            createdAt
            currentPeriodEnd
            lineItems {
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price { amount currencyCode }
                    interval
                  }
                }
              }
            }
          }
        }
      }
    `);
    const data = await res.json();
    const subs = data?.data?.currentAppInstallation?.activeSubscriptions ?? [];

    if (subs.length > 0) {
      currentSubscription = subs[0];
      billingStatus = currentSubscription.status.toLowerCase();

      // Calculate trial days remaining
      if (currentSubscription.trialDays > 0) {
        const created = new Date(currentSubscription.createdAt);
        const now = new Date();
        const elapsed = Math.floor((now - created) / (1000 * 60 * 60 * 24));
        trialDaysRemaining = Math.max(0, currentSubscription.trialDays - elapsed);
      }
    }
  } catch (e) {
    console.error("Failed to fetch subscription:", e.message);
  }

  // Map subscription name to plan id
  const activePlanId = currentSubscription
    ? PLANS.find(p => currentSubscription.name.toLowerCase().includes(p.name.toLowerCase()))?.id ?? "free"
    : "free";

  return {
    currentSubscription,
    billingStatus,
    activePlanId,
    trialDaysRemaining,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION — create or cancel Shopify subscription
// ─────────────────────────────────────────────────────────────────────────────
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const planId = formData.get("planId");
  const interval = formData.get("interval") ?? "EVERY_30_DAYS";

  // ── SUBSCRIBE ──────────────────────────────────────────────────────────────
  if (intent === "subscribe") {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan || plan.monthlyPrice === 0) {
      return { success: false, message: "Invalid plan selected." };
    }

    const price = interval === "ANNUAL"
      ? plan.annualPrice * 12
      : plan.monthlyPrice;

    try {
      const res = await admin.graphql(`
        mutation createSubscription($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int) {
          appSubscriptionCreate(
            name: $name
            returnUrl: $returnUrl
            trialDays: $trialDays
            lineItems: $lineItems
            test: true
          ) {
            userErrors { field message }
            confirmationUrl
            appSubscription { id status }
          }
        }
      `, {
        variables: {
          name: `SmartCart Pro — ${plan.name}`,
          trialDays: plan.trialDays ?? 0,
          returnUrl: `https://${session.shop}/admin/apps/smartcart-pro/app/billing?success=true`,
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: { amount: price, currencyCode: "INR" },
                  interval: interval === "ANNUAL" ? "ANNUAL" : "EVERY_30_DAYS",
                },
              },
            },
          ],
        },
      });

      const data = await res.json();
      const result = data?.data?.appSubscriptionCreate;

      if (result?.userErrors?.length > 0) {
        return { success: false, message: result.userErrors[0].message };
      }

      // Redirect merchant to Shopify's billing confirmation page
      return { success: true, confirmationUrl: result.confirmationUrl };

    } catch (e) {
      console.error("Subscription creation failed:", e.message);
      return { success: false, message: "Failed to create subscription. Please try again." };
    }
  }

  // ── CANCEL ─────────────────────────────────────────────────────────────────
  if (intent === "cancel") {
    const subscriptionId = formData.get("subscriptionId");
    try {
      await admin.graphql(`
        mutation cancelSubscription($id: ID!) {
          appSubscriptionCancel(id: $id) {
            userErrors { field message }
            appSubscription { id status }
          }
        }
      `, { variables: { id: subscriptionId } });

      return { success: true, cancelled: true };
    } catch (e) {
      console.error("Cancellation failed:", e.message);
      return { success: false, message: "Failed to cancel subscription." };
    }
  }

  return { success: false, message: "Unknown action." };
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const { currentSubscription, billingStatus, activePlanId, trialDaysRemaining } = useLoaderData();
  const fetcher = useFetcher();
  const isSaving = fetcher.state === "submitting";

  const [interval, setInterval] = useState("EVERY_30_DAYS");
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Redirect to Shopify confirmation URL after subscribe action
  if (fetcher.data?.confirmationUrl) {
    window.location.href = fetcher.data.confirmationUrl;
  }

  const handleSubscribe = (planId) => {
    fetcher.submit(
      { intent: "subscribe", planId, interval },
      { method: "POST" }
    );
  };

  const handleCancel = () => {
    fetcher.submit(
      { intent: "cancel", subscriptionId: currentSubscription?.id },
      { method: "POST" }
    );
    setConfirmCancel(false);
  };

  const annualSaving = (plan) =>
    Math.round(((plan.monthlyPrice - plan.annualPrice) / plan.monthlyPrice) * 100);

  return (
    <s-page heading="Plan & Billing">

      {fetcher.data?.success === false && (
        <s-banner tone="critical">{fetcher.data.message}</s-banner>
      )}
      {fetcher.data?.cancelled && (
        <s-banner tone="info">Your subscription has been cancelled. You're now on the Free plan.</s-banner>
      )}

      {/* Current plan status bar */}
      {currentSubscription && (
        <s-section>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px", borderRadius: "10px",
            background: billingStatus === "active" ? "#f1f8f5" : "#fff4e5",
            border: `1px solid ${billingStatus === "active" ? "#008060" : "#b5731d"}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "28px" }}>
                {billingStatus === "active" ? "✅" : "⏳"}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#202223" }}>
                  {currentSubscription.name}
                </div>
                <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "2px" }}>
                  {billingStatus === "active"
                    ? `Active — renews ${new Date(currentSubscription.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                    : `Trial — ${trialDaysRemaining} days remaining`}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span style={{
                fontSize: "12px", fontWeight: 700,
                color: billingStatus === "active" ? "#008060" : "#b5731d",
                background: billingStatus === "active" ? "#e3f1eb" : "#fff0c7",
                padding: "4px 12px", borderRadius: "99px",
              }}>
                {billingStatus === "active" ? "ACTIVE" : "TRIAL"}
              </span>
              {!confirmCancel ? (
                <button onClick={() => setConfirmCancel(true)} style={cancelBtnStyle}>
                  Cancel plan
                </button>
              ) : (
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#d72c0d" }}>Are you sure?</span>
                  <button onClick={handleCancel} style={{ ...cancelBtnStyle, background: "#d72c0d", color: "white", border: "none" }}>
                    Yes, cancel
                  </button>
                  <button onClick={() => setConfirmCancel(false)} style={cancelBtnStyle}>
                    Keep plan
                  </button>
                </div>
              )}
            </div>
          </div>
        </s-section>
      )}

      {/* Billing interval toggle */}
      <s-section>
        <div style={{ display: "flex", justifyContent: "center", gap: "0" }}>
          <button
            onClick={() => setInterval("EVERY_30_DAYS")}
            style={{
              padding: "8px 24px", border: "1px solid #c9cccf",
              borderRadius: "6px 0 0 6px", cursor: "pointer", fontSize: "13px",
              fontWeight: interval === "EVERY_30_DAYS" ? 700 : 400,
              background: interval === "EVERY_30_DAYS" ? "#202223" : "white",
              color: interval === "EVERY_30_DAYS" ? "white" : "#202223",
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("ANNUAL")}
            style={{
              padding: "8px 24px", border: "1px solid #c9cccf",
              borderLeft: "none",
              borderRadius: "0 6px 6px 0", cursor: "pointer", fontSize: "13px",
              fontWeight: interval === "ANNUAL" ? 700 : 400,
              background: interval === "ANNUAL" ? "#202223" : "white",
              color: interval === "ANNUAL" ? "white" : "#202223",
            }}
          >
            Annual
            <span style={{
              marginLeft: "8px", fontSize: "11px", fontWeight: 700,
              color: interval === "ANNUAL" ? "#47C1BF" : "#008060",
            }}>
              SAVE 20%
            </span>
          </button>
        </div>
      </s-section>

      {/* Plan cards */}
      <s-section heading="Choose Your Plan">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {PLANS.map(plan => {
            const isActive = activePlanId === plan.id;
            const displayPrice = interval === "ANNUAL" ? plan.annualPrice : plan.monthlyPrice;
            const saving = plan.monthlyPrice > 0 ? annualSaving(plan) : 0;

            return (
              <div key={plan.id} style={{
                border: `2px solid ${isActive ? plan.color : "#e1e3e5"}`,
                borderRadius: "12px", padding: "24px",
                background: isActive ? `${plan.color}08` : "white",
                position: "relative",
              }}>
                {/* Badge */}
                {plan.badge && (
                  <div style={{
                    position: "absolute", top: "-13px", left: "50%",
                    transform: "translateX(-50%)",
                    background: plan.color, color: "white",
                    fontSize: "11px", fontWeight: 700,
                    padding: "3px 14px", borderRadius: "99px",
                    whiteSpace: "nowrap",
                  }}>
                    {plan.badge}
                  </div>
                )}

                {/* Plan name + price */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#202223" }}>{plan.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "8px" }}>
                    <span style={{ fontSize: "32px", fontWeight: 800, color: plan.color }}>
                      {displayPrice === 0 ? "Free" : `₹${displayPrice.toLocaleString("en-IN")}`}
                    </span>
                    {displayPrice > 0 && (
                      <span style={{ fontSize: "13px", color: "#6d7175" }}>
                        /{interval === "ANNUAL" ? "mo, billed annually" : "month"}
                      </span>
                    )}
                  </div>
                  {interval === "ANNUAL" && saving > 0 && (
                    <div style={{ fontSize: "12px", color: "#008060", fontWeight: 600, marginTop: "4px" }}>
                      Save {saving}% vs monthly
                    </div>
                  )}
                  {plan.trialDays && !isActive && (
                    <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
                      {plan.trialDays}-day free trial
                    </div>
                  )}
                </div>

                {/* Features */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", gap: "8px", fontSize: "13px" }}>
                      <span style={{ color: plan.color, flexShrink: 0 }}>✓</span>
                      <span style={{ color: "#202223" }}>{f}</span>
                    </div>
                  ))}
                  {plan.notIncluded?.map(f => (
                    <div key={f} style={{ display: "flex", gap: "8px", fontSize: "13px" }}>
                      <span style={{ color: "#c9cccf", flexShrink: 0 }}>✗</span>
                      <span style={{ color: "#c9cccf" }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA button */}
                {isActive ? (
                  <button disabled style={{
                    width: "100%", padding: "10px",
                    borderRadius: "7px", border: `2px solid ${plan.color}`,
                    fontSize: "13px", fontWeight: 700,
                    background: plan.color, color: "white",
                    cursor: "default",
                  }}>
                    ✓ Current Plan
                  </button>
                ) : plan.monthlyPrice === 0 ? (
                  <button disabled style={{
                    width: "100%", padding: "10px",
                    borderRadius: "7px", border: "1px solid #e1e3e5",
                    fontSize: "13px", fontWeight: 600,
                    background: "#f6f6f7", color: "#6d7175",
                    cursor: "default",
                  }}>
                    Free Forever
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isSaving}
                    style={{
                      width: "100%", padding: "10px",
                      borderRadius: "7px", border: "none",
                      fontSize: "13px", fontWeight: 700,
                      background: plan.color, color: "white",
                      cursor: isSaving ? "not-allowed" : "pointer",
                      opacity: isSaving ? 0.7 : 1,
                    }}
                  >
                    {isSaving ? "Processing..." : `Start ${plan.trialDays}-Day Free Trial`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </s-section>

      {/* FAQ */}
      <s-section heading="Frequently Asked Questions">
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {[
            {
              q: "How does the free trial work?",
              a: "You get 14 days free on Pro and Enterprise plans. No credit card required upfront — Shopify handles billing after the trial ends.",
            },
            {
              q: "Can I change plans anytime?",
              a: "Yes. Upgrades take effect immediately. Downgrades take effect at the end of your current billing cycle.",
            },
            {
              q: "How is billing handled?",
              a: "All payments go through Shopify's billing system and appear on your Shopify invoice. We never store your payment information.",
            },
            {
              q: "What happens when I uninstall the app?",
              a: "Your subscription is automatically cancelled when you uninstall. You won't be charged for the remaining period.",
            },
            {
              q: "Is there a per-order fee?",
              a: "No. All plans are flat monthly fees with no hidden per-order charges.",
            },
          ].map((faq, i) => (
            <FAQItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </s-section>

      {/* Aside */}
      <s-section slot="aside" heading="💳 Billing Info">
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {[
            { label: "Current plan", value: activePlanId.charAt(0).toUpperCase() + activePlanId.slice(1) },
            { label: "Billing via", value: "Shopify Payments" },
            { label: "Trial remaining", value: trialDaysRemaining > 0 ? `${trialDaysRemaining} days` : "—" },
            { label: "Next renewal", value: currentSubscription?.currentPeriodEnd
                ? new Date(currentSubscription.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "—" },
          ].map(item => (
            <div key={item.label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "10px 0", borderBottom: "1px solid #f1f1f1", fontSize: "13px",
            }}>
              <span style={{ color: "#6d7175" }}>{item.label}</span>
              <span style={{ fontWeight: 600, color: "#202223" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </s-section>

      <s-section slot="aside" heading="🆘 Need Help?">
        <s-paragraph>Questions about billing? Email us at billing@smartcartpro.app</s-paragraph>
        <s-paragraph>We respond within 24 hours on business days.</s-paragraph>
      </s-section>
    </s-page>
  );
}

// ── FAQ accordion item ────────────────────────────────────────────────────────
function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #e1e3e5" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", textAlign: "left", padding: "14px 0",
          border: "none", background: "none", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: "13px", fontWeight: 600, color: "#202223",
        }}
      >
        {question}
        <span style={{ fontSize: "18px", color: "#6d7175", flexShrink: 0, marginLeft: "12px" }}>
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div style={{ fontSize: "13px", color: "#6d7175", paddingBottom: "14px", lineHeight: "1.6" }}>
          {answer}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const cancelBtnStyle = {
  padding: "6px 14px", borderRadius: "6px",
  border: "1px solid #c9cccf", background: "white",
  fontSize: "12px", fontWeight: 600, cursor: "pointer", color: "#202223",
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};