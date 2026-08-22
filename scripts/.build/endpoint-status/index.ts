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

// Shared transaction finalisation helpers - mirror swiftwallet-callback logic
// so M-Pay callbacks and Makamesco pollers settle wallets identically.

type FinalizeOpts = {
  success: boolean;
  mpesaReceipt?: string;
  raw: Record<string, unknown>;
  errorMessage?: string;
  verifiedVia?: "webhook" | "polling" | "sync" | "manual";
};

async function finalizeDepositOrEndpoint(supabase: any, tx: any, opts: FinalizeOpts) {
  const { data: current } = await supabase.from("transactions").select("status").eq("id", tx.id).single();
  if (current?.status === "completed") return;

  if (opts.success) {
    await supabase.from("transactions").update({
      status: "completed",
      mpesa_receipt: opts.mpesaReceipt || "",
      callback_data: opts.raw,
      verified_via: opts.verifiedVia || "polling",
      updated_at: new Date().toISOString(),
    }).eq("id", tx.id);

    const walletType = tx.wallet_type || "income";
    await supabase.rpc("increment_wallet", { p_user_id: tx.user_id, p_type: walletType, p_amount: tx.amount });
    if (Number(tx.fee) > 0) {
      await supabase.rpc("decrement_wallet", { p_user_id: tx.user_id, p_type: "service", p_amount: tx.fee });
    }
    try { await supabase.rpc("admin_allocate_profit", { p_tx_id: tx.id }); } catch (e) { console.error("allocate_profit:", (e as Error).message); }

    if (tx.endpoint_id) {
      const { data: ep } = await supabase.from("endpoints").select("*").eq("id", tx.endpoint_id).single();
      if (ep) {
        await supabase.from("endpoints").update({
          total_collected: Number(ep.total_collected) + Number(tx.amount),
          total_transactions: ep.total_transactions + 1,
          successful_transactions: ep.successful_transactions + 1,
        }).eq("id", tx.endpoint_id);
        try {
          await fetch(ep.callback_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              success: true, transaction_id: tx.id, external_reference: tx.external_reference,
              status: "completed", amount: tx.amount, mpesa_receipt: opts.mpesaReceipt || "",
              phone: tx.phone, service_fee: tx.fee,
            }),
          });
        } catch (e) { console.error("Forward callback failed:", (e as Error).message); }
      }
    }
  } else {
    await supabase.from("transactions").update({
      status: "failed", callback_data: opts.raw,
      error_message: opts.errorMessage || "Payment failed",
      verified_via: opts.verifiedVia || "polling",
      updated_at: new Date().toISOString(),
    }).eq("id", tx.id);

    if (tx.endpoint_id) {
      const { data: ep } = await supabase.from("endpoints").select("*").eq("id", tx.endpoint_id).single();
      if (ep) {
        await supabase.from("endpoints").update({ total_transactions: ep.total_transactions + 1 }).eq("id", tx.endpoint_id);
        try {
          await fetch(ep.callback_url, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ success: false, transaction_id: tx.id, external_reference: tx.external_reference, status: "failed", amount: tx.amount, error: opts.errorMessage || "Payment failed" }),
          });
        } catch (e) { console.error("Forward callback failed:", (e as Error).message); }
      }
    }
  }
}

// For withdrawals, the wallet was already debited when the request was queued.
// On callback we just update final status (and on failure, refund).
async function finalizeWithdrawal(supabase: any, tx: any, opts: FinalizeOpts) {
  const { data: current } = await supabase.from("transactions").select("status").eq("id", tx.id).single();
  if (current?.status === "completed") return;

  if (opts.success) {
    if (current?.status === "failed") {
      await supabase.rpc("decrement_wallet", { p_user_id: tx.user_id, p_type: "income", p_amount: tx.amount });
      if (Number(tx.fee) > 0) {
        await supabase.rpc("decrement_wallet", { p_user_id: tx.user_id, p_type: "service", p_amount: tx.fee });
      }
    }
    await supabase.from("transactions").update({
      status: "completed", mpesa_receipt: opts.mpesaReceipt || "",
      callback_data: opts.raw, verified_via: opts.verifiedVia || "polling",
      updated_at: new Date().toISOString(),
    }).eq("id", tx.id);
    try { await supabase.rpc("admin_allocate_profit", { p_tx_id: tx.id }); } catch (e) { console.error("allocate_profit:", (e as Error).message); }
  } else {
    await supabase.from("transactions").update({
      status: "failed", callback_data: opts.raw,
      error_message: opts.errorMessage || "Withdrawal failed",
      verified_via: opts.verifiedVia || "polling",
      updated_at: new Date().toISOString(),
    }).eq("id", tx.id);
    await supabase.rpc("increment_wallet", { p_user_id: tx.user_id, p_type: "income", p_amount: tx.amount });
    if (Number(tx.fee) > 0) {
      await supabase.rpc("increment_wallet", { p_user_id: tx.user_id, p_type: "service", p_amount: tx.fee });
    }
  }
}


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function publicError(status: string) {
  return status === "failed" ? "Payment was not completed." : undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) return jsonResponse({ error: "x-api-key header required" }, 401);

    // Validate the API key belongs to an active endpoint
    const { data: endpoint } = await supabase
      .from("endpoints")
      .select("id, user_id")
      .eq("api_key", apiKey)
      .eq("status", "active")
      .single();
    if (!endpoint) return jsonResponse({ error: "Invalid API key or endpoint inactive" }, 401);

    // Support both GET query params and POST body
    let checkoutId: string | null = null;
    let externalReference: string | null = null;
    let transactionId: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      checkoutId = url.searchParams.get("checkout_id");
      externalReference = url.searchParams.get("external_reference");
      transactionId = url.searchParams.get("transaction_id");
    } else {
      const body = await req.json();
      checkoutId = body.checkout_id || null;
      externalReference = body.external_reference || null;
      transactionId = body.transaction_id || null;
    }

    if (!checkoutId && !externalReference && !transactionId) {
      return jsonResponse({ error: "Provide checkout_id, external_reference, or transaction_id" }, 400);
    }

    // Build query - must belong to this endpoint's owner
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("user_id", endpoint.user_id)
      .eq("endpoint_id", endpoint.id);

    if (transactionId) {
      query = query.eq("id", transactionId);
    } else if (checkoutId) {
      query = query.eq("swiftwallet_checkout_id", checkoutId);
    } else if (externalReference) {
      query = query.eq("external_reference", externalReference);
    }

    const { data: tx, error } = await query.order("created_at", { ascending: false }).limit(1).single();

    if (error || !tx) {
      return jsonResponse({ error: "Transaction not found", status: "NOT_FOUND" }, 404);
    }

    let currentTx = tx;
    if (tx.provider === "makamesco" && tx.status === "pending" && tx.swiftwallet_checkout_id) {
      const poll = await makamescoStkStatus(tx.swiftwallet_checkout_id);
      const ageMs = Date.now() - new Date(tx.created_at).getTime();
      if (poll.status === "completed" || (poll.status === "failed" && ageMs >= 180000) || poll.status === "cancelled") {
        await finalizeDepositOrEndpoint(supabase, tx, {
          success: poll.status === "completed",
          mpesaReceipt: poll.mpesaReceipt,
          raw: poll.raw,
          errorMessage: poll.status === "cancelled" ? "Payment cancelled" : "Payment was not completed",
        });
        const { data: refreshed } = await supabase.from("transactions").select("*").eq("id", tx.id).single();
        if (refreshed) currentTx = refreshed;
      } else if (Object.keys(poll.raw || {}).length > 0) {
        await supabase.from("transactions").update({ callback_data: poll.raw, updated_at: new Date().toISOString() }).eq("id", tx.id);
      }
    }

    return jsonResponse({
      transaction_id: currentTx.id,
      checkout_id: currentTx.swiftwallet_checkout_id,
      external_reference: currentTx.external_reference,
      status: currentTx.status.toUpperCase(),
      amount: currentTx.amount,
      phone: currentTx.phone,
      mpesa_receipt: currentTx.mpesa_receipt,
      error_message: publicError(currentTx.status),
      created_at: currentTx.created_at,
      updated_at: currentTx.updated_at,
    });
  } catch (err) {
    console.error("endpoint-status error:", err instanceof Error ? err.message : String(err));
    return jsonResponse({ error: "An unexpected error occurred" }, 500);
  }
});
