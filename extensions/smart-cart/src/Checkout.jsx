import '@shopify/ui-extensions/preact';
import { render } from "preact";
import { useState } from "preact/hooks";

// ─────────────────────────────────────────────────────────────────────────────
// SmartCart Pro — Checkout UI Extension
// Target: purchase.checkout.block.render
// ─────────────────────────────────────────────────────────────────────────────

export default async () => {
  render(<SmartCartExtension />, document.body);
};

function SmartCartExtension() {
  const settings = shopify.settings.value;

  // Total cost of items in cart (excluding shipping/tax)
  const subtotal = shopify.cost.subtotalAmount.value;
  const cartTotal = subtotal?.amount ?? 0;
  const currency = subtotal?.currencyCode ?? "INR";

  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <s-stack gap="base">
      <FreeShippingBar cartTotal={cartTotal} settings={settings} fmt={fmt} />
      <MilestoneRewards cartTotal={cartTotal} settings={settings} fmt={fmt} />
      <PrepaidNudge settings={settings} fmt={fmt} />
      <TrustBadges settings={settings} />
    </s-stack>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. FREE SHIPPING BAR
// ─────────────────────────────────────────────────────────────────────────────
function FreeShippingBar({ cartTotal, settings, fmt }) {
  const enabled = settings.freeShippingEnabled !== false;
  if (!enabled) return null;

  const threshold = parseFloat(settings.freeShippingThreshold ?? 499);
  const message = settings.freeShippingMessage ?? "Add {amount} more for FREE shipping 🚚";
  const successMessage = settings.freeShippingSuccessMessage ?? "🎉 You've unlocked FREE shipping!";

  const remaining = Math.max(0, threshold - cartTotal);
  const progress = Math.min(100, Math.round((cartTotal / threshold) * 100));
  const isUnlocked = remaining === 0;

  const displayMessage = isUnlocked
    ? successMessage
    : message.replace("{amount}", fmt(remaining));

  return (
    <s-banner tone={isUnlocked ? "success" : "info"} heading={displayMessage}>
      <s-stack gap="small">
        <div style={{ width: "100%", height: "6px", background: "#e1e3e5", borderRadius: "99px" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "#008060", borderRadius: "99px", transition: "width 0.3s ease" }} />
        </div>
        {!isUnlocked && (
          <s-text>
            {progress}% of the way there
          </s-text>
        )}
      </s-stack>
    </s-banner>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MILESTONE REWARDS
// ─────────────────────────────────────────────────────────────────────────────
function MilestoneRewards({ cartTotal, settings, fmt }) {
  const enabled = settings.milestonesEnabled !== false;
  if (!enabled) return null;

  let milestones = [];
  try {
    milestones = JSON.parse(settings.milestones ?? "[]");
  } catch {
    milestones = [
      { threshold: 500,  reward: "Free Gift 🎁",             description: "Mystery gift added to your order" },
      { threshold: 999,  reward: "10% OFF 🏷️",               description: "Discount applied at checkout" },
      { threshold: 1999, reward: "Free Express Shipping ⚡",  description: "Delivered in 1-2 days" },
    ];
  }

  if (milestones.length === 0) return null;

  const nextMilestone = milestones.find(m => m.threshold > cartTotal);
  const unlockedMilestones = milestones.filter(m => m.threshold <= cartTotal);

  return (
    <s-banner heading="🏆 Milestone Rewards" tone="info">
      <s-stack gap="small">
        {unlockedMilestones.map((m, i) => (
          <s-text key={i}>
            ✅ <s-text type="emphasis">{m.reward}</s-text> unlocked — {m.description}
          </s-text>
        ))}
        {nextMilestone && (
          <s-text>
            🔒 Add {fmt(nextMilestone.threshold - cartTotal)} more to unlock{" "}
            <s-text type="emphasis">{nextMilestone.reward}</s-text>
          </s-text>
        )}
        <s-stack direction="inline" gap="small">
          {milestones.map((m, i) => (
            <s-text key={i}>
              {m.threshold <= cartTotal ? "●" : "○"}
            </s-text>
          ))}
        </s-stack>
      </s-stack>
    </s-banner>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PREPAID COD NUDGE
// ─────────────────────────────────────────────────────────────────────────────
function PrepaidNudge({ settings, fmt }) {
  const enabled = settings.prepaidNudgeEnabled !== false;
  const [dismissed, setDismissed] = useState(false);

  if (!enabled || dismissed) return null;

  const discount = settings.prepaidDiscount ?? 50;
  const discountType = settings.prepaidDiscountType ?? "flat";
  const discountLabel = discountType === "flat" ? `${fmt(discount)} off` : `${discount}% off`;

  return (
    <s-banner
      heading={`💳 Pay online & save ${discountLabel}!`}
      tone="success"
      onDismiss={() => setDismissed(true)}
    >
      <s-text>
        Switch from COD to an online payment and get an instant discount at checkout.
      </s-text>
    </s-banner>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TRUST BADGES
// ─────────────────────────────────────────────────────────────────────────────
function TrustBadges({ settings }) {
  const enabled = settings.trustBadgesEnabled !== false;
  if (!enabled) return null;

  return (
    <s-stack direction="inline" gap="base">
      {["🔒 Secure Checkout", "🚚 Easy Returns", "✅ 100% Safe Pay", "⭐ 4.8 Rated"].map(badge => (
        <s-text key={badge}>{badge}</s-text>
      ))}
    </s-stack>
  );
}