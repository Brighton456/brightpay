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


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-signature, x-timestamp",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(phone: string) {
  let p = String(phone).replace(/\s/g, "");
  if (p.startsWith("0")) p = `254${p.slice(1)}`;
  if (p.startsWith("+")) p = p.slice(1);
  return p;
}

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const apiKey = req.headers.get("x-api-key");
    const signature = req.headers.get("x-signature");
    const timestamp = req.headers.get("x-timestamp");

    if (!apiKey) return jsonResponse({ error: "x-api-key header required" }, 401);
    if (!signature) return jsonResponse({ error: "x-signature header required" }, 401);
    if (!timestamp) return jsonResponse({ error: "x-timestamp header required" }, 401);

    // Replay protection: timestamp must be within 5 minutes
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
      return jsonResponse({ error: "Timestamp expired or invalid (must be unix-ms within 5 minutes)" }, 401);
    }

    const rawBody = await req.text();

    const { data: endpoint } = await supabase
      .from("endpoints")
      .select("*")
      .eq("api_key", apiKey)
      .eq("status", "active")
      .single();
    if (!endpoint) return jsonResponse({ error: "Invalid API key or endpoint inactive" }, 401);
    if (!endpoint.withdrawals_enabled) return jsonResponse({ error: "Withdrawals are disabled for this endpoint. Enable in dashboard." }, 403);

    // Verify HMAC signature: HMAC_SHA256(withdrawal_secret, timestamp + "." + rawBody)
    const expected = await hmacSha256Hex(endpoint.withdrawal_secret, `${timestamp}.${rawBody}`);
    if (!timingSafeEq(expected, signature.toLowerCase())) {
      return jsonResponse({ error: "Invalid signature" }, 401);
    }

    let body: any;
    try { body = JSON.parse(rawBody); } catch { return jsonResponse({ error: "Invalid JSON body" }, 400); }

    const { amount, phone_number, external_reference } = body || {};
    if (!amount || !phone_number) return jsonResponse({ error: "amount and phone_number required" }, 400);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return jsonResponse({ error: "Invalid amount" }, 400);
    }

    const formattedPhone = normalizePhone(phone_number);

    // Phone whitelist (if configured)
    const wl: string[] = endpoint.withdrawal_phone_whitelist || [];
    if (wl.length > 0) {
      const wlNormalized = wl.map(normalizePhone);
      if (!wlNormalized.includes(formattedPhone)) {
        return jsonResponse({ error: "Destination phone not in whitelist for this endpoint" }, 403);
      }
    }

    // Owner checks
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", endpoint.user_id).single();
    if (profile?.banned) return jsonResponse({ error: "Endpoint owner account suspended" }, 403);
    if (!profile?.can_withdraw) return jsonResponse({ error: "Withdrawals not allowed for owner" }, 403);
    if (profile?.account_status !== "active") return jsonResponse({ error: "Owner account is not active" }, 403);
    if (profile?.flagged || profile?.withdrawal_review_required) {
      return jsonResponse({ error: "Owner account requires manual review; API withdrawals blocked" }, 403);
    }

    // Daily cap
    const { data: withdrawnTodayData } = await supabase.rpc("endpoint_withdrawn_today", { p_endpoint_id: endpoint.id });
    const withdrawnToday = Number(withdrawnTodayData || 0);
    const dailyLimit = Number(endpoint.withdrawal_daily_limit || 0);
    if (withdrawnToday + numericAmount > dailyLimit) {
      return jsonResponse({
        error: "Daily withdrawal limit exceeded for this endpoint",
        daily_limit: dailyLimit,
        withdrawn_today: withdrawnToday,
        remaining_today: Math.max(dailyLimit - withdrawnToday, 0),
      }, 403);
    }

    // Fee + balances
    const { data: feeData } = await supabase.rpc("get_fee", { p_amount: numericAmount, p_fee_type: "withdrawal" });
    const fee = Number(feeData || 0);

    const { data: incomeWallet } = await supabase.from("wallets").select("balance").eq("user_id", endpoint.user_id).eq("type", "income").single();
    if (Number(incomeWallet?.balance || 0) < numericAmount) {
      return jsonResponse({ error: "Insufficient income wallet balance" }, 400);
    }
    const { data: serviceWallet } = await supabase.from("wallets").select("balance").eq("user_id", endpoint.user_id).eq("type", "service").single();
    if (Number(serviceWallet?.balance || 0) < fee) {
      return jsonResponse({ error: "Insufficient service wallet for withdrawal fee" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const extRef = external_reference || `EPWD-${endpoint.id.slice(0, 8)}-${Date.now()}`;
    const provider = await getActiveProvider(supabase, "withdrawals");
    const callbackUrl = provider === "mpay"
      ? `${supabaseUrl}/functions/v1/mpay-callback`
      : provider === "makamesco"
        ? `${supabaseUrl}/functions/v1/makamesco-webhook`
      : `${supabaseUrl}/functions/v1/swiftwallet-callback`;

    const result = await providerB2c(provider, {
      amount: numericAmount,
      phone: formattedPhone,
      reference: extRef,
      remarks: "BrightPay API Withdrawal",
      callbackUrl,
    });

    if (!result.ok) {
      await supabase.from("transactions").insert({
        user_id: endpoint.user_id, endpoint_id: endpoint.id, type: "withdrawal",
        amount: numericAmount, fee: 0, phone: formattedPhone, status: "failed",
        external_reference: extRef, wallet_type: "income", provider,
        error_message: result.errorMessage || JSON.stringify(result.raw),
      });
      return jsonResponse({ error: "Withdrawal failed at provider" }, 400);
    }

    await supabase.rpc("decrement_wallet", { p_user_id: endpoint.user_id, p_type: "income", p_amount: numericAmount });
    if (fee > 0) {
      await supabase.rpc("decrement_wallet", { p_user_id: endpoint.user_id, p_type: "service", p_amount: fee });
    }

    const finalStatus = provider === "swiftwallet" ? "completed" : "pending";

    const { data: tx } = await supabase.from("transactions").insert({
      user_id: endpoint.user_id, endpoint_id: endpoint.id, type: "withdrawal",
      amount: numericAmount, fee, phone: formattedPhone, status: finalStatus,
      external_reference: extRef, swiftwallet_checkout_id: result.checkoutId,
      mpesa_receipt: String((result.raw as any).transactionID || (result.raw as any).mpesa_receipt || ""),
      callback_data: result.raw, wallet_type: "income", provider,
    }).select().single();

    return jsonResponse({
      success: true,
      transaction_id: tx?.id,
      checkout_id: result.checkoutId,
      amount: numericAmount,
      fee,
      phone: formattedPhone,
      external_reference: extRef,
      provider,
      status: finalStatus,
    });
  } catch (err) {
    console.error("endpoint-withdraw error:", err instanceof Error ? err.message : String(err));
    return jsonResponse({ error: "An unexpected error occurred" }, 500);
  }
});
