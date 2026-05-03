import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import { Form, useActionData, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors };
};

export const action = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors };
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <AppProvider embedded={false}>
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0a0a0f; }
          .auth-root {
            min-height: 100vh;
            background: #0a0a0f;
            font-family: 'DM Sans', system-ui, sans-serif;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
          }
          .auth-blob {
            position: absolute; border-radius: 50%;
            filter: blur(80px); opacity: 0.12;
            animation: blobFloat 8s ease-in-out infinite;
          }
          .auth-blob-1 { width: 500px; height: 500px; background: #00c36b; top: -150px; left: -150px; }
          .auth-blob-2 { width: 350px; height: 350px; background: #5c6ac4; bottom: -100px; right: -100px; animation-delay: -4s; }
          @keyframes blobFloat {
            0%,100% { transform: translate(0,0) scale(1); }
            50% { transform: translate(20px,-20px) scale(1.05); }
          }
          .auth-grid {
            position: absolute; inset: 0;
            background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
            background-size: 60px 60px;
          }
          .auth-card {
            position: relative; z-index: 10;
            width: 100%; max-width: 420px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 20px; padding: 40px;
            backdrop-filter: blur(20px);
            animation: fadeUp 0.6s ease both;
          }
          @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
          .auth-logo {
            display: flex; align-items: center; gap: 10px;
            margin-bottom: 32px;
          }
          .auth-logo-icon {
            width: 40px; height: 40px; border-radius: 10px;
            background: #00c36b;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px;
          }
          .auth-logo-name {
            font-family: 'Syne', sans-serif;
            font-size: 18px; font-weight: 800; color: #fff;
          }
          .auth-logo-name span { color: #00c36b; }
          .auth-title {
            font-family: 'Syne', sans-serif;
            font-size: 26px; font-weight: 800;
            margin-bottom: 8px; color: #fff;
          }
          .auth-subtitle {
            font-size: 14px; color: rgba(255,255,255,0.45);
            margin-bottom: 32px; line-height: 1.5;
          }
          .auth-label {
            display: block; font-size: 12px; font-weight: 500;
            color: rgba(255,255,255,0.5); letter-spacing: 0.06em;
            text-transform: uppercase; margin-bottom: 8px;
          }
          .auth-input {
            width: 100%; padding: 12px 16px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 8px; color: #fff;
            font-size: 14px; font-family: 'DM Sans', system-ui, sans-serif;
            outline: none; transition: border-color 0.2s, background 0.2s;
          }
          .auth-input:focus { border-color: #00c36b; background: rgba(0,195,107,0.05); }
          .auth-input::placeholder { color: rgba(255,255,255,0.2); }
          .auth-input-error { border-color: #ff4d4d !important; }
          .auth-hint {
            font-size: 12px; color: rgba(255,255,255,0.25);
            margin-top: 6px;
          }
          .auth-error {
            font-size: 12px; color: #ff6b6b;
            margin-top: 6px;
          }
          .auth-btn {
            width: 100%; margin-top: 24px; padding: 14px;
            background: #00c36b; color: #000;
            border: none; border-radius: 8px;
            font-size: 14px; font-weight: 700;
            font-family: 'DM Sans', system-ui, sans-serif;
            cursor: pointer; letter-spacing: 0.02em;
            transition: background 0.2s, transform 0.15s;
          }
          .auth-btn:hover { background: #00d977; transform: translateY(-1px); }
          .auth-btn:active { transform: translateY(0); }
          .auth-footer {
            margin-top: 24px; text-align: center;
            font-size: 12px; color: rgba(255,255,255,0.2);
          }
        `}</style>

        <div className="auth-root">
          <div className="auth-blob auth-blob-1" />
          <div className="auth-blob auth-blob-2" />
          <div className="auth-grid" />

          <div className="auth-card">
            <div className="auth-logo">
              <div className="auth-logo-icon">🛒</div>
              <div className="auth-logo-name">SmartCart <span>Pro</span></div>
            </div>

            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Enter your Shopify store domain to continue to your dashboard.</p>

            <Form method="post">
              <label>
                <span className="auth-label">Shop domain</span>
                <input
                  className={`auth-input${errors?.shop ? " auth-input-error" : ""}`}
                  name="shop"
                  type="text"
                  value={shop}
                  onChange={e => setShop(e.currentTarget.value)}
                  placeholder="my-store.myshopify.com"
                  autoComplete="on"
                />
                {errors?.shop
                  ? <span className="auth-error">⚠ {errors.shop}</span>
                  : <span className="auth-hint">e.g. my-store.myshopify.com</span>
                }
              </label>
              <button className="auth-btn" type="submit">Log in →</button>
            </Form>

            <p className="auth-footer">© 2026 SmartCart Pro</p>
          </div>
        </div>
      </>
    </AppProvider>
  );
}