import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getActiveProvider, providerB2c } from "../_shared/providers.ts";

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
