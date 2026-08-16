import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getActiveProvider, providerStkPush } from "../_shared/providers.ts";
import { loadCreds as loadDaraja, stkPush as darajaStk } from "../_shared/daraja.ts";

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
