import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getActiveProvider, providerB2c } from "../_shared/providers.ts";

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
    if (!profile?.can_withdraw) return jsonResponse({ error: "Withdrawal not allowed" }, 403);
    if (profile?.account_status !== "active") return jsonResponse({ error: "Only active accounts can withdraw" }, 403);

    const { amount, phone_number } = await req.json();
    if (!amount || !phone_number) return jsonResponse({ error: "amount and phone_number required" }, 400);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return jsonResponse({ error: "Please enter a valid withdrawal amount" }, 400);
    }

    const formattedPhone = normalizePhone(phone_number);
    const { data: feeData } = await supabase.rpc("get_fee", { p_amount: numericAmount, p_fee_type: "withdrawal" });
    const fee = Number(feeData || 0);

    if (profile?.withdrawal_review_required) {
      const { data: tx } = await supabase.from("transactions").insert({
        user_id: user.id, type: "withdrawal", amount: numericAmount, fee, phone: formattedPhone,
        status: "pending", external_reference: `WD-REVIEW-${Date.now()}`,
        flagged: true, admin_review_notes: "Withdrawal requires admin approval due to account review",
      }).select().single();
      return jsonResponse({
        success: true,
        message: "Withdrawal submitted for review. An admin will process this shortly.",
        transaction_id: tx?.id, requires_review: true,
      });
    }

    const { data: incomeWallet } = await supabase.from("wallets").select("balance").eq("user_id", user.id).eq("type", "income").single();
    if (Number(incomeWallet?.balance || 0) < numericAmount) {
      return jsonResponse({ error: "Insufficient income wallet balance" }, 400);
    }
    const { data: serviceWallet } = await supabase.from("wallets").select("balance").eq("user_id", user.id).eq("type", "service").single();
    if (Number(serviceWallet?.balance || 0) < fee) {
      return jsonResponse({ error: "Insufficient service wallet for withdrawal fee" }, 400);
    }

    const extRef = `WD-${Date.now()}`;
    const provider = await getActiveProvider(supabase, "withdrawals");
    const disabled: string[] = (profile?.disabled_providers as string[]) || [];
    if (disabled.includes(provider)) {
      return jsonResponse({ error: "This withdrawal method is not available for your account. Please contact support." }, 403);
    }
    const callbackUrl = provider === "mpay"
      ? `${supabaseUrl}/functions/v1/mpay-callback`
      : provider === "makamesco"
        ? `${supabaseUrl}/functions/v1/makamesco-webhook`
      : `${supabaseUrl}/functions/v1/swiftwallet-callback`;

    const result = await providerB2c(provider, {
      amount: numericAmount,
      phone: formattedPhone,
      reference: extRef,
      remarks: "BrightPay Withdrawal",
      callbackUrl,
    });

    if (!result.ok) {
      await supabase.from("transactions").insert({
        user_id: user.id, type: "withdrawal", amount: numericAmount, fee: 0,
        phone: formattedPhone, status: "failed", external_reference: extRef,
        provider, error_message: result.errorMessage || JSON.stringify(result.raw),
      });
      console.error(`b2c-withdraw failed via ${provider}:`, JSON.stringify(result.raw));
      return jsonResponse({ error: "Withdrawal could not be started. Please try again shortly or contact support." }, 400);
    }

    await supabase.rpc("decrement_wallet", { p_user_id: user.id, p_type: "income", p_amount: numericAmount });
    if (fee > 0) {
      await supabase.rpc("decrement_wallet", { p_user_id: user.id, p_type: "service", p_amount: fee });
    }

    // SwiftWallet returns synchronous completion; others (Makamesco/M-Pay) finalize via callback/poll.
    const finalStatus = provider === "swiftwallet" ? "completed" : "pending";

    const { data: tx } = await supabase.from("transactions").insert({
      user_id: user.id, type: "withdrawal", amount: numericAmount, fee, phone: formattedPhone,
      status: finalStatus, external_reference: extRef,
      swiftwallet_checkout_id: result.checkoutId, provider,
      verified_via: provider === "swiftwallet" ? "sync" : null,
      mpesa_receipt: String((result.raw as any).transactionID || (result.raw as any).mpesa_receipt || ""),
      callback_data: result.raw,
    }).select().single();

    return jsonResponse({
      success: true,
      message: finalStatus === "completed"
        ? `KES ${numericAmount} sent to ${formattedPhone}`
        : `Withdrawal queued. KES ${numericAmount} will be sent to ${formattedPhone} shortly.`,
      transaction_id: tx?.id,
    });
  } catch (err) {
    console.error("b2c-withdraw error:", err instanceof Error ? err.message : String(err));
    return jsonResponse({ error: "An unexpected error occurred. Please try again." }, 500);
  }
});
