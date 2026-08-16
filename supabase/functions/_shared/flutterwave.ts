// Flutterwave Issuing helper
const FLW_BASE = "https://api.flutterwave.com/v3";

export function flwHeaders() {
  const key = Deno.env.get("FLW_SECRET_KEY");
  if (!key) throw new Error("FLW_SECRET_KEY not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function flwFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${FLW_BASE}${path}`, {
    ...init,
    headers: { ...flwHeaders(), ...(init.headers || {}) },
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { ok: res.ok && body?.status === "success", status: res.status, body };
}

export async function flwCreateCard(opts: {
  currency: string;
  amount: number;
  billing_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_country?: string;
  billing_postal_code?: string;
  callback_url?: string;
}) {
  return flwFetch("/virtual-cards", {
    method: "POST",
    body: JSON.stringify({
      currency: opts.currency,
      amount: opts.amount,
      billing_name: opts.billing_name,
      first_name: opts.first_name || opts.billing_name.split(" ")[0],
      last_name: opts.last_name || opts.billing_name.split(" ").slice(1).join(" ") || "User",
      date_of_birth: "1990-01-01",
      email: opts.email,
      phone: opts.phone,
      title: "Mr",
      gender: "M",
      billing_address: opts.billing_address || "N/A",
      billing_city: opts.billing_city || "Nairobi",
      billing_state: opts.billing_state || "NBI",
      billing_country: opts.billing_country || "KE",
      billing_postal_code: opts.billing_postal_code || "00100",
      callback_url: opts.callback_url,
    }),
  });
}

export async function flwGetCard(cardId: string) {
  return flwFetch(`/virtual-cards/${cardId}`, { method: "GET" });
}

export async function flwFundCard(cardId: string, amount: number, debit_currency = "USD") {
  return flwFetch(`/virtual-cards/${cardId}/fund`, {
    method: "POST",
    body: JSON.stringify({ debit_currency, amount }),
  });
}

export async function flwFreezeCard(cardId: string) {
  return flwFetch(`/virtual-cards/${cardId}/status/block`, { method: "PUT" });
}
export async function flwUnfreezeCard(cardId: string) {
  return flwFetch(`/virtual-cards/${cardId}/status/unblock`, { method: "PUT" });
}
export async function flwTerminateCard(cardId: string) {
  return flwFetch(`/virtual-cards/${cardId}/terminate`, { method: "PUT" });
}
export async function flwCardTransactions(cardId: string) {
  return flwFetch(`/virtual-cards/${cardId}/transactions`, { method: "GET" });
}
