const API = "https://api-m.sandbox.paypal.com";

function createPayPalSandbox() {
  const id = process.env.PAYPAL_SANDBOX_CLIENT_ID;
  const secret = process.env.PAYPAL_SANDBOX_SECRET;
  if (!id || !secret) return null;
  const origin = new URL(process.env.PAYPAL_SANDBOX_RETURN_ORIGIN || "http://localhost:5000").origin;
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");

  async function request(path, authorization, body, requestId) {
    const response = await fetch(API + path, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": path.startsWith("/v1/") ? "application/x-www-form-urlencoded" : "application/json",
        ...(requestId && { "PayPal-Request-Id": requestId }),
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("PayPal Sandbox request failed.");
    return response.json();
  }

  async function orderRequest(path, payload, requestId) {
    const token = await request("/v1/oauth2/token", `Basic ${basic}`, "grant_type=client_credentials");
    if (!token.access_token) throw new Error("PayPal Sandbox authentication failed.");
    return request(path, `Bearer ${token.access_token}`, JSON.stringify(payload), requestId);
  }

  return {
    async create(eventId, amount, requestId) {
      const returnUrl = new URL("/react/", origin);
      returnUrl.search = new URLSearchParams({ screen: "seats", event: eventId });
      const cancelUrl = new URL(returnUrl);
      cancelUrl.searchParams.set("paypalCanceled", "1");
      const order = await orderRequest("/v2/checkout/orders", {
        intent: "CAPTURE",
        purchase_units: [{ amount: { currency_code: "USD", value: amount } }],
        payment_source: { paypal: { experience_context: { return_url: returnUrl.href, cancel_url: cancelUrl.href, user_action: "PAY_NOW" } } },
      }, requestId);
      const link = order.links?.find(({ rel }) => rel === "payer-action" || rel === "approve");
      if (!order.id || !link || new URL(link.href).origin !== "https://www.sandbox.paypal.com") {
        throw new Error("PayPal Sandbox approval link unavailable.");
      }
      return { id: order.id, approvalUrl: link.href };
    },
    async capture(orderId, amount, requestId) {
      const order = await orderRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {}, requestId);
      const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
      if (order.id !== orderId || order.status !== "COMPLETED" || capture?.status !== "COMPLETED" ||
          capture.amount?.currency_code !== "USD" || capture.amount.value !== amount || !capture.id) {
        throw new Error("PayPal Sandbox capture could not be verified.");
      }
      return capture.id;
    },
  };
}

module.exports = { createPayPalSandbox };
