import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getActiveProvider, providerStkPush } from "../_shared/providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profile?.banned) return jsonResponse({ error: "Account suspended" }, 403);
    if (!profile?.can_deposit) return jsonResponse({ error: "Deposit not allowed" }, 403);

    const { amount, phone_number, wallet_type = "income", channel_id, external_reference } = await req.json();
    if (!amount || !phone_number) return jsonResponse({ error: "amount and phone_number are required" }, 400);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return jsonResponse({ error: "Please enter a valid deposit amount" }, 400);
    }

    const { data: feeData } = await supabase.rpc("get_fee", { p_amount: numericAmount, p_fee_type: "service" });
    const fullFee = Number(feeData || 0);
    const { data: feeRow } = await supabase.from("fees").select("service_cost").gte("max_amount", numericAmount).lte("min_amount", numericAmount).limit(1).single();
    const serviceCost = Number(feeRow?.service_cost || 0);

    let fee = 0;
    if (wallet_type === "service") {
      const { data: sw } = await supabase.from("wallets").select("balance").eq("user_id", user.id).eq("type", "service").single();
      fee = Number(sw?.balance || 0) >= fullFee ? fullFee : 0;
    } else {
      fee = serviceCost;
      const { data: sw } = await supabase.from("wallets").select("balance").eq("user_id", user.id).eq("type", "service").single();
      if (Number(sw?.balance || 0) < fee) {
        return jsonResponse({ error: "Insufficient service wallet balance for transaction fee. Please top up your service wallet." }, 400);
      }
    }

    const formattedPhone = normalizePhone(phone_number);
    const reference = external_reference || `BP-${Date.now()}`;
    const callbackUrlSw = `${supabaseUrl}/functions/v1/swiftwallet-callback`;
    const callbackUrlMp = `${supabaseUrl}/functions/v1/mpay-callback`;
    const callbackUrlMk = `${supabaseUrl}/functions/v1/makamesco-webhook`;

    let channel: any = null;
    if (channel_id) {
      const { data } = await supabase.from("channels").select("*").eq("id", channel_id).eq("user_id", user.id).eq("status", "approved").single();
      channel = data;
    }

    let provider = await getActiveProvider(supabase, "deposits");
    // Per-user gateway block
    const disabled: string[] = (profile?.disabled_providers as string[]) || [];
    if (disabled.includes(provider)) {
      return jsonResponse({ error: "This payment method is not available for your account. Please contact support." }, 403);
    }
    const callbackUrl = provider === "mpay" ? callbackUrlMp : provider === "makamesco" ? callbackUrlMk : callbackUrlSw;

    // Read admin platform settings for routing details
    const { data: settings } = await supabase.from("platform_settings").select("key, value")
      .in("key", ["makamesco_deposit_destination", "mpay_default_payment_id"]);
    const setMap: Record<string, string> = {};
    (settings || []).forEach((s: any) => { setMap[s.key] = s.value; });
    const makamescoDestination = (setMap["makamesco_deposit_destination"] === "b2c" ? "b2c" : "payments") as "b2c" | "payments";
    const mpayFallbackPaymentId = setMap["mpay_default_payment_id"] || "";

    const result = await providerStkPush(provider, {
      amount: numericAmount,
      phone: formattedPhone,
      reference,
      callbackUrl,
      channel,
      description: "BrightPay Deposit",
      makamescoDestination,
      mpayFallbackPaymentId,
    });

    if (!result.ok) {
      await supabase.from("transactions").insert({
        user_id: user.id, type: "deposit", amount: numericAmount, fee: 0, phone: formattedPhone,
        status: "failed", external_reference: reference, wallet_type, provider,
        error_message: result.errorMessage || JSON.stringify(result.raw),
      });
      console.error(`STK push failed via ${provider}:`, JSON.stringify(result.raw));
      return jsonResponse({ error: "STK push failed. Please try again or contact support." }, 400);
    }

    const { data: tx } = await supabase.from("transactions").insert({
      user_id: user.id, type: "deposit", amount: numericAmount, fee, phone: formattedPhone,
      status: "pending", external_reference: reference, swiftwallet_checkout_id: result.checkoutId,
      wallet_type, provider, callback_data: result.raw,
    }).select().single();

    return jsonResponse({
      success: true,
      message: "STK push sent. Enter your M-Pesa PIN to complete.",
      transaction_id: tx?.id,
      checkout_id: result.checkoutId,
    });
  } catch (err) {
    console.error("stk-push error:", err instanceof Error ? err.message : String(err));
    return jsonResponse({ error: "An unexpected error occurred. Please try again." }, 500);
  }
});
