import { redirect, Form, useLoaderData } from "react-router";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  // Always show the login form — login may not be exported in all versions
  return { showForm: true };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .sc-root {
          min-height: 100vh;
          background: #0a0a0f;
          font-family: 'DM Sans', sans-serif;
          color: #fff;
          overflow: hidden;
          position: relative;
        }
        .sc-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
          animation: blobFloat 8s ease-in-out infinite;
        }
        .sc-blob-1 { width: 600px; height: 600px; background: #00c36b; top: -200px; left: -150px; animation-delay: 0s; }
        .sc-blob-2 { width: 400px; height: 400px; background: #5c6ac4; bottom: -100px; right: -100px; animation-delay: -4s; }
        .sc-blob-3 { width: 300px; height: 300px; background: #47c1bf; top: 40%; left: 60%; animation-delay: -2s; }
        @keyframes blobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        .sc-grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .sc-wrap {
          position: relative; z-index: 10;
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px 24px;
        }
        .sc-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(0,195,107,0.1); border: 1px solid rgba(0,195,107,0.3);
          color: #00c36b; font-size: 12px; font-weight: 500;
          letter-spacing: 0.08em; text-transform: uppercase;
          padding: 6px 14px; border-radius: 99px; margin-bottom: 28px;
          animation: fadeUp 0.6s ease both;
        }
        .sc-badge-dot {
          width: 6px; height: 6px; background: #00c36b; border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        .sc-heading {
          font-family: 'Syne', sans-serif;
          font-size: clamp(40px, 6vw, 72px); font-weight: 800; line-height: 1.05;
          text-align: center; margin-bottom: 20px;
          animation: fadeUp 0.6s ease 0.1s both;
        }
        .sc-heading-green { color: #00c36b; }
        .sc-tagline {
          font-size: clamp(16px, 2vw, 20px); color: rgba(255,255,255,0.55);
          text-align: center; max-width: 520px; line-height: 1.6; margin-bottom: 48px;
          animation: fadeUp 0.6s ease 0.2s both;
        }
        .sc-form {
          width: 100%; max-width: 420px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 32px; backdrop-filter: blur(20px);
          margin-bottom: 64px; animation: fadeUp 0.6s ease 0.3s both;
        }
        .sc-form-label { display: block; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); margin-bottom: 8px; letter-spacing: 0.04em; text-transform: uppercase; }
        .sc-form-hint { display: block; font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 6px; }
        .sc-input {
          width: 100%; padding: 12px 16px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px; color: #fff; font-size: 14px; font-family: 'DM Sans', sans-serif;
          outline: none; transition: border-color 0.2s, background 0.2s;
        }
        .sc-input:focus { border-color: #00c36b; background: rgba(0,195,107,0.05); }
        .sc-input::placeholder { color: rgba(255,255,255,0.25); }
        .sc-btn {
          width: 100%; margin-top: 20px; padding: 13px;
          background: #00c36b; color: #000; border: none; border-radius: 8px;
          font-size: 14px; font-weight: 700; font-family: 'DM Sans', sans-serif;
          cursor: pointer; letter-spacing: 0.02em; transition: background 0.2s, transform 0.15s;
        }
        .sc-btn:hover { background: #00d977; transform: translateY(-1px); }
        .sc-features {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px; max-width: 800px; width: 100%;
          animation: fadeUp 0.6s ease 0.4s both;
        }
        .sc-feature {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; padding: 24px; transition: border-color 0.2s, background 0.2s;
        }
        .sc-feature:hover { border-color: rgba(0,195,107,0.3); background: rgba(0,195,107,0.04); }
        .sc-feature-icon { font-size: 28px; margin-bottom: 12px; display: block; }
        .sc-feature-title { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 6px; }
        .sc-feature-desc { font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.5; }
        .sc-footer { margin-top: 48px; font-size: 12px; color: rgba(255,255,255,0.2); animation: fadeUp 0.6s ease 0.5s both; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="sc-root">
        <div className="sc-blob sc-blob-1" />
        <div className="sc-blob sc-blob-2" />
        <div className="sc-blob sc-blob-3" />
        <div className="sc-grid" />
        <div className="sc-wrap">
          <div className="sc-badge">
            <span className="sc-badge-dot" />
            Shopify App — India &amp; Global
          </div>
          <h1 className="sc-heading">
            Sell More with <span className="sc-heading-green">SmartCart Pro</span>
          </h1>
          <p className="sc-tagline">
            Free shipping bar, milestone rewards, COD management, RTO reduction,
            and branded order tracking — all in one app.
          </p>
          {showForm && (
            <Form className="sc-form" method="post" action="/auth/login">
              <label>
                <span className="sc-form-label">Shop domain</span>
                <input className="sc-input" type="text" name="shop" placeholder="my-store.myshopify.com" />
                <span className="sc-form-hint">Enter your Shopify store domain to get started</span>
              </label>
              <button className="sc-btn" type="submit">Install SmartCart Pro →</button>
            </Form>
          )}
          <div className="sc-features">
            {[
              { icon: "🚚", title: "Free Shipping Bar", desc: "Boost AOV with a dynamic progress bar that nudges customers to spend more." },
              { icon: "🏆", title: "Milestone Rewards", desc: "Unlock gifts and discounts at cart value thresholds to increase conversions." },
              { icon: "💵", title: "COD Management", desc: "Reduce RTO with OTP verification, risk scoring, and prepaid incentives." },
              { icon: "📦", title: "Order Tracking", desc: "Branded tracking page with WhatsApp, SMS, and email notifications." },
              { icon: "📊", title: "Analytics", desc: "Real-time COD vs prepaid split, RTO rate, and feature performance data." },
              { icon: "🔀", title: "Smart Upsell", desc: "Show the right product at the right moment inside the cart." },
            ].map(f => (
              <div key={f.title} className="sc-feature">
                <span className="sc-feature-icon">{f.icon}</span>
                <div className="sc-feature-title">{f.title}</div>
                <div className="sc-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
          <p className="sc-footer">© 2026 SmartCart Pro · Built for Shopify merchants</p>
        </div>
      </div>
    </>
  );
}