import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        {/* Main */}
        <s-link href="/app">🏠 Dashboard</s-link>
        <s-link href="/app/analytics">📊 Analytics</s-link>

        {/* Cart & Sales */}
        <s-link href="/app/smart-cart">🛒 Smart Cart</s-link>
        <s-link href="/app/shipping">🚚 Shipping</s-link>
        <s-link href="/app/cod">💵 COD Management</s-link>
        <s-link href="/app/tracking">📦 Order Tracking</s-link>

        {/* App */}
        <s-link href="/app/settings">⚙️ Settings</s-link>
        <s-link href="/app/billing">💎 Billing</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};