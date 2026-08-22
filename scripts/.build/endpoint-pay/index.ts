import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Multi-provider payment abstraction.
// Supports SwiftWallet (legacy), Makamesco Nexus Pay, and M-Pay.
// Each adapter normalises its STK push / B2C response to a consistent shape.

type Provider = "swiftwallet" | "makamesco" | "mpay";
type Flow = "deposits" | "endpoints" | "withdrawals";

interface StkPushArgs {
  amount: number;
  phone: string; // already normalised to 254XXXXXXXXX
  reference: string; // our external_reference
  description?: string;
  callbackUrl: string; // for providers that POST results to us
  channel?: Record<string, any> | null; // channels row, or null for defaults
  makamescoDestination?: "payments" | "b2c"; // makamesco only
  mpayFallbackPaymentId?: string; // mpay only — used when channel has no payment_id
}

interface B2cArgs {
  amount: number;
  phone: string;
  reference: string;
  remarks?: string;
  callbackUrl: string;
}

interface ProviderResponse {
  ok: boolean;
  status: number;
  checkoutId: string; // STK: checkoutRequestId | B2C: conversationId
  raw: Record<string, unknown>;
  errorMessage?: string;
}

const SW_STK_URL = "https://swiftwallet.co.ke/v3/stk-initiate/";
const SW_B2C_URL = "https://swiftwallet.co.ke/v3/pay-request/";
// Makamesco moved from pay.makamesco-tech.co.ke to makamescopay.com (old host now
// serves an HTML "We've Moved" page, which broke STK push / B2C calls).
const MK_BASE = (Deno.env.get("MAKAMESCO_BASE_URL") || "https://makamescopay.com").replace(/\/+$/, "");
const MP_BASE = "https://app.mpayafrica.site";

async function readJson(r: Response): Promise<Record<string, unknown>> {
  const text = await r.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
}

async function getActiveProvider(
  supabase: any,
  flow: Flow,
  fallback: Provider = "swiftwallet",
): Promise<Provider> {
  const key = `provider_${flow}`;
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  const v = (data?.value || "").toLowerCase();
  if (v === "swiftwallet" || v === "makamesco" || v === "mpay") return v;
  return fallback;
}

function resolveChannelId(
  channel: Record<string, any> | null | undefined,
  provider: Provider,
): string | null {
  if (!channel) return null;
  if (provider === "swiftwallet") return channel.swiftwallet_channel_id || null;
  if (provider === "makamesco") return channel.makamesco_settlement_id || null;
  if (provider === "mpay") return channel.mpay_payment_id || null;
  return null;
}

// ---------- STK PUSH ----------

async function providerStkPush(
  provider: Provider,
  args: StkPushArgs,
): Promise<ProviderResponse> {
  if (provider === "swiftwallet") return swStk(args);
  if (provider === "makamesco") return mkStk(args);
  if (provider === "mpay") return mpStk(args);
  return { ok: false, status: 500, checkoutId: "", raw: {}, errorMessage: "Unknown provider" };
}

async function swStk(a: StkPushArgs): Promise<ProviderResponse> {
  const key = Deno.env.get("SWIFTWALLET_API_KEY")!;
  const channelId = resolveChannelId(a.channel, "swiftwallet")
    || Deno.env.get("SWIFTWALLET_CHANNEL_ID")!;
  const r = await fetch(SW_STK_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      channel_id: channelId,
      amount: a.amount,
      phone_number: a.phone,
      callback_url: a.callbackUrl,
      external_reference: a.reference,
    }),
  });
  const raw = await readJson(r);
  const checkoutId = String(
    raw.transaction_id || raw.reference || raw.checkout_request_id ||
    (raw as any).CheckoutRequestID || raw.id || Date.now(),
  );
  return { ok: r.ok, status: r.status, checkoutId, raw };
}

async function mkStk(a: StkPushArgs): Promise<ProviderResponse> {
  const key = Deno.env.get("MAKAMESCO_API_KEY");
  if (!key) return { ok: false, status: 500, checkoutId: "", raw: {}, errorMessage: "MAKAMESCO_API_KEY not configured" };

  // Admin can route deposits to the B2C float wallet (for funding withdrawals)
  // instead of the standard payments wallet. The endpoint shape differs.
  if (a.makamescoDestination === "b2c") {
    const body = { phoneNumber: a.phone, amount: a.amount };
    console.log("[makamesco] b2c topup request:", JSON.stringify(body));
    const r = await fetch(`${MK_BASE}/api/b2c/wallet/topup`, {
      method: "POST",
      headers: { "X-API-Key": key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const raw = await readJson(r);
    console.log("[makamesco] b2c topup response:", r.status, JSON.stringify(raw));
    const anyRaw = raw as any;
    const checkoutId = String(anyRaw.checkoutRequestId || anyRaw.CheckoutRequestID || anyRaw.transactionId || Date.now());
    const rc = String(anyRaw.ResponseCode ?? anyRaw.responseCode ?? "");
    const accepted = rc === "0" || anyRaw.success === true || !!anyRaw.checkoutRequestId || !!anyRaw.CheckoutRequestID;
    const ok = r.ok && accepted;
    return { ok, status: r.status, checkoutId, raw, errorMessage: ok ? undefined : (anyRaw.errorMessage || anyRaw.message || anyRaw.ResponseDescription || `HTTP ${r.status}`) };
  }

  const body: Record<string, unknown> = {
    phoneNumber: a.phone,
    amount: a.amount,
    accountReference: a.reference,
    externalReference: a.reference,
    transactionDesc: a.description || "Payment",
    callbackUrl: a.callbackUrl,
    callback_url: a.callbackUrl,
    webhookUrl: a.callbackUrl,
  };
  const settlement = resolveChannelId(a.channel, "makamesco");
  if (settlement) body.settlementAccountId = Number(settlement);
  console.log("[makamesco] stkpush request:", JSON.stringify(body));
  const r = await fetch(`${MK_BASE}/api/payments/stkpush`, {
    method: "POST",
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await readJson(r);
  console.log("[makamesco] stkpush response:", r.status, JSON.stringify(raw));
  const anyRaw = raw as any;
  const checkoutId = String(
    anyRaw.checkoutRequestId || anyRaw.CheckoutRequestID ||
    anyRaw.transactionId || anyRaw.merchantRequestId || Date.now(),
  );
  const rc = String(anyRaw.ResponseCode ?? anyRaw.responseCode ?? "");
  const accepted = rc === "0" || anyRaw.success === true ||
    String(anyRaw.status || "").toLowerCase() === "pending" ||
    !!anyRaw.checkoutRequestId || !!anyRaw.CheckoutRequestID;
  const ok = r.ok && accepted;
  const errorMessage = ok ? undefined :
    (anyRaw.errorMessage || anyRaw.message || anyRaw.ResponseDescription || anyRaw.error || `HTTP ${r.status}`);
  return { ok, status: r.status, checkoutId, raw, errorMessage };
}

async function mpStk(a: StkPushArgs): Promise<ProviderResponse> {
  const key = Deno.env.get("MPAY_API_KEY");
  if (!key) return { ok: false, status: 500, checkoutId: "", raw: {}, errorMessage: "MPAY_API_KEY not configured" };
  const paymentId = resolveChannelId(a.channel, "mpay") || a.mpayFallbackPaymentId || "";
  if (!paymentId) {
    return { ok: false, status: 400, checkoutId: "", raw: {}, errorMessage: "M-Pay requires a payment_id. Set a platform default in Admin → Settings or add 'M-Pay payment_id' to the channel." };
  }
  const form = new URLSearchParams();
  form.set("api_key", key);
  form.set("amount", String(a.amount));
  form.set("phone_number", a.phone);
  form.set("user_reference", a.reference);
  form.set("payment_id", paymentId);
  form.set("callback_url", a.callbackUrl);
  console.log("[mpay] express request:", form.toString().replace(key, "***"));
  const r = await fetch(`${MP_BASE}/api/v1/mpesa/express`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: form.toString(),
  });
  const raw = await readJson(r);
  console.log("[mpay] express response:", r.status, JSON.stringify(raw));
  const anyRaw = raw as any;
  const data = anyRaw.data || {};
  const checkoutId = String(
    data.CheckoutRequestID || data.MerchantRequestID ||
    anyRaw.CheckoutRequestID || anyRaw.checkout_request_id || Date.now(),
  );
  // M-Pay returns { success: true } or { status: "success" } on accept; ResponseCode "0" on Daraja relay.
  const rc = String(data.ResponseCode ?? anyRaw.ResponseCode ?? "");
  const accepted = anyRaw.success === true ||
    String(anyRaw.status || "").toLowerCase() === "success" ||
    rc === "0" || !!data.CheckoutRequestID;
  const ok = r.ok && accepted;
  const errorMessage = ok ? undefined :
    (anyRaw.message || anyRaw.error || data.ResponseDescription || data.errorMessage || `HTTP ${r.status}`);
  return { ok, status: r.status, checkoutId, raw, errorMessage };
}

// ---------- B2C ----------

async function providerB2c(
  provider: Provider,
  args: B2cArgs,
): Promise<ProviderResponse> {
  if (provider === "swiftwallet") return swB2c(args);
  if (provider === "makamesco") return mkB2c(args);
  if (provider === "mpay") return mpB2c(args);
  return { ok: false, status: 500, checkoutId: "", raw: {}, errorMessage: "Unknown provider" };
}

async function swB2c(a: B2cArgs): Promise<ProviderResponse> {
  const key = Deno.env.get("SWIFTWALLET_API_KEY")!;
  const r = await fetch(SW_B2C_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: a.amount,
      phone_number: a.phone,
      command_id: "BusinessPayment",
      remarks: a.remarks || "BrightPay Withdrawal",
      occasion: a.remarks || "BrightPay Withdrawal",
      external_reference: a.reference,
      callback_url: a.callbackUrl,
    }),
  });
  const raw = await readJson(r);
  const checkoutId = String(
    (raw as any).transaction_id || (raw as any).conversationID ||
    (raw as any).originatorConversationID || (raw as any).checkout_request_id ||
    (raw as any).ConversationID || (raw as any).id || Date.now(),
  );
  return { ok: r.ok, status: r.status, checkoutId, raw };
}

async function mkB2c(a: B2cArgs): Promise<ProviderResponse> {
  const key = Deno.env.get("MAKAMESCO_API_KEY");
  if (!key) return { ok: false, status: 500, checkoutId: "", raw: {}, errorMessage: "MAKAMESCO_API_KEY not configured" };
  const body = {
    phoneNumber: a.phone,
    amount: a.amount,
    remarks: a.remarks || "BrightPay Withdrawal",
    commandId: "BusinessPayment",
    occasion: a.reference,
    externalReference: a.reference,
    callbackUrl: a.callbackUrl,
    callback_url: a.callbackUrl,
    resultUrl: a.callbackUrl,
  };
  console.log("[makamesco] b2c request:", JSON.stringify(body));
  const r = await fetch(`${MK_BASE}/api/payments/b2c`, {
    method: "POST",
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await readJson(r);
  console.log("[makamesco] b2c response:", r.status, JSON.stringify(raw));
  const anyRaw = raw as any;
  const checkoutId = String(anyRaw.conversationId || anyRaw.ConversationID || anyRaw.transactionId || Date.now());
  const rc = String(anyRaw.ResponseCode ?? anyRaw.responseCode ?? "");
  const accepted = rc === "0" || anyRaw.success === true || !!anyRaw.conversationId || !!anyRaw.ConversationID;
  const ok = r.ok && accepted;
  const errorMessage = ok ? undefined :
    (anyRaw.errorMessage || anyRaw.message || anyRaw.ResponseDescription || anyRaw.error || `HTTP ${r.status}`);
  return { ok, status: r.status, checkoutId, raw, errorMessage };
}

async function mpB2c(a: B2cArgs): Promise<ProviderResponse> {
  const key = Deno.env.get("MPAY_API_KEY");
  if (!key) return { ok: false, status: 500, checkoutId: "", raw: {}, errorMessage: "MPAY_API_KEY not configured" };
  // Default to Safaricom (63902); customers can extend later if needed.
  const form = new URLSearchParams();
  form.set("Amount", String(a.amount));
  form.set("ReceiverNumber", a.phone);
  form.set("ChannelCode", "63902");
  form.set("PaymentReference", a.reference);
  form.set("CallbackURL", a.callbackUrl);
  console.log("[mpay] withdraw request:", form.toString());
  const r = await fetch(`${MP_BASE}/api/v1/withdraw`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const raw = await readJson(r);
  console.log("[mpay] withdraw response:", r.status, JSON.stringify(raw));
  const anyRaw = raw as any;
  const checkoutId = String(anyRaw.reference || anyRaw.transaction_id || a.reference);
  const accepted = anyRaw.success === true ||
    String(anyRaw.status || "").toUpperCase() === "QUEUED" ||
    String(anyRaw.status || "").toLowerCase() === "success";
  const ok = r.ok && accepted;
  const errorMessage = ok ? undefined :
    (anyRaw.message || anyRaw.error || `HTTP ${r.status}`);
  return { ok, status: r.status, checkoutId, raw, errorMessage };
}

// ---------- STATUS POLLING (Makamesco) ----------

interface PollResult {
  status: "pending" | "completed" | "failed" | "cancelled" | "unknown";
  mpesaReceipt?: string;
  raw: Record<string, unknown>;
}

function makamescoReceipt(raw: Record<string, unknown>) {
  const r = raw as any;
  return String(r.mpesaReceiptNumber || r.mpesaReceipt || r.receiptNumber || r.transactionReceipt || "");
}

function normalizeMakamescoStatus(raw: Record<string, unknown>): PollResult["status"] {
  const r = raw as any;
  const explicit = String(r.status || r.paymentStatus || r.transactionStatus || r.state || "").toLowerCase();
  const resultCode = r.ResultCode ?? r.resultCode ?? r.result_code;
  const responseCode = r.ResponseCode ?? r.responseCode ?? r.response_code;
  const receipt = makamescoReceipt(raw);
  const text = [r.resultDesc, r.ResultDesc, r.errorMessage, r.message, r.error, r.ResponseDescription, r.responseDescription]
    .filter(Boolean).join(" ").toLowerCase();

  if (receipt || ["completed", "complete", "success", "successful", "paid"].includes(explicit) || String(resultCode) === "0") return "completed";
  if (["cancelled", "canceled", "cancelled_by_user", "usercancelled", "user_cancelled"].includes(explicit) || ["1032", "1037"].includes(String(resultCode))) return "cancelled";
  if (["failed", "failure", "reversed", "timeout", "expired"].includes(explicit)) return "failed";
  if (["pending", "processing", "queued", "accepted", "initiated", "submitted"].includes(explicit) || String(responseCode) === "0" || text.includes("accepted for processing")) return "pending";
  if (String(resultCode || "") && String(resultCode) !== "0") return "failed";
  if (text.includes("failed") || text.includes("insufficient") || text.includes("wrong pin") || text.includes("timeout") || text.includes("expired") || text.includes("cancel")) return "failed";
  return "unknown";
}

async function makamescoStkStatus(checkoutId: string): Promise<PollResult> {
  const key = Deno.env.get("MAKAMESCO_API_KEY");
  if (!key) return { status: "unknown", raw: {} };
  const r = await fetch(`${MK_BASE}/api/payments/status/${encodeURIComponent(checkoutId)}`, {
    headers: { "X-API-Key": key },
  });
  const raw = await readJson(r);
  return { status: normalizeMakamescoStatus(raw), mpesaReceipt: makamescoReceipt(raw), raw };
}

async function makamescoB2cStatus(conversationId: string): Promise<PollResult> {
  const key = Deno.env.get("MAKAMESCO_API_KEY");
  if (!key) return { status: "unknown", raw: {} };
  const r = await fetch(`${MK_BASE}/api/payments/b2c/status/${encodeURIComponent(conversationId)}`, {
    headers: { "X-API-Key": key },
  });
  const raw = await readJson(r);
  return { status: normalizeMakamescoStatus(raw), mpesaReceipt: makamescoReceipt(raw), raw };
}

// Daraja (Safaricom M-Pesa) integration helper for BrightPay.
// Credentials are stored encrypted (AES-GCM, base64) in `user_daraja_credentials`.
// Edge functions load + decrypt at call time using DARAJA_ENC_KEY.

const SANDBOX = "https://sandbox.safaricom.co.ke";
const LIVE = "https://api.safaricom.co.ke";

// ---------- crypto ----------

async function keyMaterial(): Promise<CryptoKey> {
  const raw = Deno.env.get("DARAJA_ENC_KEY") || "";
  if (!raw) throw new Error("DARAJA_ENC_KEY missing");
  const bytes = new TextEncoder().encode(raw).slice(0, 32);
  const padded = new Uint8Array(32);
  padded.set(bytes);
  return crypto.subtle.importKey("raw", padded, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return "";
  const key = await keyMaterial();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  const out = new Uint8Array(iv.length + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...out));
}

async function decrypt(b64: string | null | undefined): Promise<string> {
  if (!b64) return "";
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  const key = await keyMaterial();
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// ---------- creds ----------

interface DarajaCreds {
  id: string;
  user_id: string;
  environment: "sandbox" | "live";
  business_short_code: string;
  party_b: string;
  b2c_short_code: string;
  b2c_initiator_name: string;
  consumer_key: string;
  consumer_secret: string;
  passkey: string;
  b2c_security_credential: string;
  stk_enabled: boolean;
  b2c_enabled: boolean;
  verified: boolean;
}

async function loadCreds(supabase: any, userId: string): Promise<DarajaCreds | null> {
  const { data } = await supabase
    .from("user_daraja_credentials")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    user_id: data.user_id,
    environment: data.environment,
    business_short_code: data.business_short_code || "",
    party_b: data.party_b || data.business_short_code || "",
    b2c_short_code: data.b2c_short_code || "",
    b2c_initiator_name: data.b2c_initiator_name || "",
    consumer_key: await decrypt(data.consumer_key_enc),
    consumer_secret: await decrypt(data.consumer_secret_enc),
    passkey: await decrypt(data.passkey_enc),
    b2c_security_credential: await decrypt(data.b2c_security_credential_enc),
    stk_enabled: !!data.stk_enabled,
    b2c_enabled: !!data.b2c_enabled,
    verified: !!data.verified,
  };
}

function baseUrl(env: "sandbox" | "live") {
  return env === "live" ? LIVE : SANDBOX;
}

// ---------- helpers ----------

async function getAccessToken(creds: DarajaCreds): Promise<string> {
  const auth = btoa(`${creds.consumer_key}:${creds.consumer_secret}`);
  const r = await fetch(`${baseUrl(creds.environment)}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body.access_token) {
    throw new Error(`Daraja OAuth failed: ${body.errorMessage || body.error_description || r.status}`);
  }
  return body.access_token as string;
}

function timestamp() {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// ---------- STK Push ----------

interface StkArgs {
  amount: number;
  phone: string;
  reference: string;
  description?: string;
  callbackUrl: string;
}

async function stkPush(creds: DarajaCreds, a: StkArgs) {
  const token = await getAccessToken(creds);
  const ts = timestamp();
  const password = btoa(`${creds.business_short_code}${creds.passkey}${ts}`);
  const body = {
    BusinessShortCode: creds.business_short_code,
    Password: password,
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: a.amount,
    PartyA: a.phone,
    PartyB: creds.party_b || creds.business_short_code,
    PhoneNumber: a.phone,
    CallBackURL: a.callbackUrl,
    AccountReference: a.reference.slice(0, 12),
    TransactionDesc: (a.description || "Payment").slice(0, 13),
  };
  console.log("[daraja] stkpush", body.BusinessShortCode, a.amount, a.phone);
  const r = await fetch(`${baseUrl(creds.environment)}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await r.json().catch(() => ({}));
  console.log("[daraja] stkpush response", r.status, JSON.stringify(raw));
  const ok = r.ok && String(raw.ResponseCode ?? "") === "0";
  return {
    ok,
    status: r.status,
    checkoutId: String(raw.CheckoutRequestID || raw.MerchantRequestID || Date.now()),
    raw,
    errorMessage: ok ? undefined : (raw.errorMessage || raw.ResponseDescription || `HTTP ${r.status}`),
  };
}

async function stkQuery(creds: DarajaCreds, checkoutRequestId: string) {
  const token = await getAccessToken(creds);
  const ts = timestamp();
  const password = btoa(`${creds.business_short_code}${creds.passkey}${ts}`);
  const r = await fetch(`${baseUrl(creds.environment)}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: creds.business_short_code,
      Password: password,
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  return await r.json().catch(() => ({}));
}

// ---------- B2C ----------

async function b2c(creds: DarajaCreds, a: { amount: number; phone: string; reference: string; remarks?: string; resultUrl: string; }) {
  const token = await getAccessToken(creds);
  const body = {
    InitiatorName: creds.b2c_initiator_name,
    SecurityCredential: creds.b2c_security_credential,
    CommandID: "BusinessPayment",
    Amount: a.amount,
    PartyA: creds.b2c_short_code,
    PartyB: a.phone,
    Remarks: (a.remarks || "Payment").slice(0, 100),
    QueueTimeOutURL: a.resultUrl,
    ResultURL: a.resultUrl,
    Occasion: a.reference.slice(0, 100),
  };
  console.log("[daraja] b2c", body.PartyA, a.amount, a.phone);
  const r = await fetch(`${baseUrl(creds.environment)}/mpesa/b2c/v1/paymentrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await r.json().catch(() => ({}));
  console.log("[daraja] b2c response", r.status, JSON.stringify(raw));
  const ok = r.ok && String(raw.ResponseCode ?? "") === "0";
  return {
    ok,
    status: r.status,
    checkoutId: String(raw.ConversationID || raw.OriginatorConversationID || Date.now()),
    raw,
    errorMessage: ok ? undefined : (raw.errorMessage || raw.ResponseDescription || `HTTP ${r.status}`),
  };
}

// ---------- C2B register (sandbox test convenience) ----------

async function c2bRegister(creds: DarajaCreds, confirmationUrl: string, validationUrl: string) {
  const token = await getAccessToken(creds);
  const r = await fetch(`${baseUrl(creds.environment)}/mpesa/c2b/v1/registerurl`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      ShortCode: creds.business_short_code,
      ResponseType: "Completed",
      ConfirmationURL: confirmationUrl,
      ValidationURL: validationUrl,
    }),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

function normalizeStkCallback(raw: any) {
  const cb = raw?.Body?.stkCallback || {};
  const items: any[] = cb.CallbackMetadata?.Item || [];
  const get = (n: string) => items.find((i) => i.Name === n)?.Value;
  const resultCode = cb.ResultCode;
  return {
    checkoutRequestId: cb.CheckoutRequestID as string,
    status: resultCode === 0 ? "completed" : resultCode === 1032 ? "cancelled" : "failed",
    mpesaReceipt: get("MpesaReceiptNumber") ? String(get("MpesaReceiptNumber")) : "",
    amount: Number(get("Amount") || 0),
    phone: String(get("PhoneNumber") || ""),
    raw,
  };
}


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function normalizePhone(phone: string) {
  let p = phone.replace(/\s/g, "");
  if (p.startsWith("0")) p = `254${p.slice(1)}`;
  if (p.startsWith("+")) p = p.slice(1);
  return p;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) return jsonResponse({ error: "x-api-key header required" }, 401);

    const { data: endpoint } = await supabase.from("endpoints").select("*").eq("api_key", apiKey).eq("status", "active").single();
    if (!endpoint) return jsonResponse({ error: "Invalid API key or endpoint inactive" }, 401);

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", endpoint.user_id).single();
    if (profile?.banned) return jsonResponse({ error: "Endpoint owner account suspended" }, 403);
    if (!profile?.can_create_endpoints) return jsonResponse({ error: "Endpoint payments are not enabled for this account" }, 403);

    const { amount, phone_number, external_reference } = await req.json();
    if (!amount || !phone_number) return jsonResponse({ error: "amount and phone_number required" }, 400);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return jsonResponse({ error: "Please provide a valid payment amount" }, 400);
    }

    const { data: feeData } = await supabase.rpc("get_fee", { p_amount: numericAmount, p_fee_type: "service" });
    const fee = Number(feeData || 0);

    const { data: serviceWallet } = await supabase.from("wallets").select("balance").eq("user_id", endpoint.user_id).eq("type", "service").single();
    if (Number(serviceWallet?.balance || 0) < fee) {
      return jsonResponse({ error: "Endpoint owner has insufficient service wallet for fee" }, 400);
    }

    const formattedPhone = normalizePhone(phone_number);
    const reference = external_reference || `EP-${endpoint.id.slice(0, 8)}-${Date.now()}`;

    // Resolve channel from JSON metadata in callback_url field (legacy convention)
    let channel: any = null;
    try {
      const meta = JSON.parse(endpoint.callback_url || "{}");
      if (meta?.channel_id) {
        const { data } = await supabase.from("channels").select("*").eq("id", meta.channel_id).eq("user_id", endpoint.user_id).eq("status", "approved").single();
        channel = data;
      }
    } catch { /* not JSON */ }

    // Route to user's own Daraja when endpoint opts in
    if (endpoint.integration_type === "daraja_own") {
      const creds = await loadDaraja(supabase, endpoint.user_id);
      if (!creds || !creds.stk_enabled || !creds.consumer_key || !creds.passkey || !creds.business_short_code) {
        return jsonResponse({ error: "Endpoint owner's Daraja integration is not fully configured" }, 400);
      }
      const cb = `${supabaseUrl}/functions/v1/daraja-stk-callback`;
      const result = await darajaStk(creds, {
        amount: numericAmount, phone: formattedPhone, reference, description: `Pay ${endpoint.name}`.slice(0, 13), callbackUrl: cb,
      });
      if (!result.ok) {
        await supabase.from("transactions").insert({
          user_id: endpoint.user_id, endpoint_id: endpoint.id, type: "endpoint",
          amount: numericAmount, fee: 0, phone: formattedPhone, status: "failed",
          external_reference: reference, wallet_type: "income", provider: "daraja_own",
          error_message: result.errorMessage || JSON.stringify(result.raw),
        });
        return jsonResponse({ error: "STK push failed. Please try again." }, 400);
      }
      const { data: tx } = await supabase.from("transactions").insert({
        user_id: endpoint.user_id, endpoint_id: endpoint.id, type: "endpoint",
        amount: numericAmount, fee, phone: formattedPhone, status: "pending",
        external_reference: reference, swiftwallet_checkout_id: result.checkoutId,
        wallet_type: "income", provider: "daraja_own", callback_data: result.raw,
      }).select().single();
      return jsonResponse({ success: true, message: "STK push sent", transaction_id: tx?.id, checkout_id: result.checkoutId, provider: "daraja_own" });
    }

    const provider = await getActiveProvider(supabase, "endpoints");
    const callbackUrl = provider === "mpay"
      ? `${supabaseUrl}/functions/v1/mpay-callback`
      : provider === "makamesco"
        ? `${supabaseUrl}/functions/v1/makamesco-webhook`
      : `${supabaseUrl}/functions/v1/swiftwallet-callback`;

    const result = await providerStkPush(provider, {
      amount: numericAmount,
      phone: formattedPhone,
      reference,
      callbackUrl,
      channel,
      description: `Payment to ${endpoint.name}`,
    });

    if (!result.ok) {
      await supabase.from("transactions").insert({
        user_id: endpoint.user_id, endpoint_id: endpoint.id, type: "endpoint",
        amount: numericAmount, fee: 0, phone: formattedPhone, status: "failed",
        external_reference: reference, wallet_type: "income", provider,
        error_message: result.errorMessage || JSON.stringify(result.raw),
      });
      console.error(`endpoint-pay STK push failed via ${provider}:`, JSON.stringify(result.raw));
      return jsonResponse({ error: "STK push failed. Please try again or contact support." }, 400);
    }

    const { data: tx } = await supabase.from("transactions").insert({
      user_id: endpoint.user_id, endpoint_id: endpoint.id, type: "endpoint",
      amount: numericAmount, fee, phone: formattedPhone, status: "pending",
      external_reference: reference, swiftwallet_checkout_id: result.checkoutId,
      wallet_type: "income", provider, callback_data: result.raw,
    }).select().single();

    return jsonResponse({
      success: true,
      message: "STK push sent",
      transaction_id: tx?.id,
      checkout_id: result.checkoutId,
      provider,
    });
  } catch (err) {
    console.error("endpoint-pay error:", err instanceof Error ? err.message : String(err));
    return jsonResponse({ error: "An unexpected error occurred. Please try again." }, 500);
  }
});
