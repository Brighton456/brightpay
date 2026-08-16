import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate callback secret if configured
    const callbackSecret = Deno.env.get("SWIFTWALLET_CALLBACK_SECRET");
    if (callbackSecret) {
      const signature = req.headers.get("X-SwiftWallet-Signature") || req.headers.get("x-swiftwallet-signature");
      if (signature !== callbackSecret) {
        console.error("Callback signature mismatch - rejecting request");
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
    }

    const callbackData = await req.json();
    console.log("Payment callback received:", JSON.stringify(callbackData));

    const checkoutId = callbackData.checkout_request_id || callbackData.CheckoutRequestID || callbackData.id;
    const resultCode = callbackData.result_code ?? callbackData.ResultCode ?? callbackData.status;
    const mpesaReceipt = callbackData.mpesa_receipt || callbackData.MpesaReceiptNumber || callbackData.receipt_number || "";
    const isSuccess = resultCode === 0 || resultCode === "0" || resultCode === "success" || callbackData.success === true;

    let tx = null;

    // Primary lookup: by checkout ID (most reliable - we issued this ID)
    if (checkoutId) {
      const { data } = await supabase.from("transactions").select("*").eq("swiftwallet_checkout_id", String(checkoutId)).eq("status", "pending").single();
      tx = data;
    }

    // Fallback: by external_reference (we generated this, so it's trustworthy)
    if (!tx) {
      const extRef = callbackData.account_reference || callbackData.external_reference;
      if (extRef) {
        const { data } = await supabase.from("transactions").select("*").eq("external_reference", extRef).eq("status", "pending").single();
        tx = data;
      }
    }

    if (!tx) {
      console.log("No matching pending transaction found for callback");
      return new Response(JSON.stringify({ received: true, matched: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate that the callback amount matches the transaction amount (prevent amount tampering)
    const callbackAmount = Number(callbackData.amount || callbackData.Amount || 0);
    if (callbackAmount > 0 && callbackAmount !== Number(tx.amount)) {
      console.error(`Amount mismatch: callback=${callbackAmount}, transaction=${tx.amount}, tx_id=${tx.id}`);
      return new Response(JSON.stringify({ received: true, matched: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (isSuccess) {
      await supabase.from("transactions").update({
        status: "completed",
        mpesa_receipt: mpesaReceipt,
        callback_data: callbackData,
        verified_via: "webhook",
        updated_at: new Date().toISOString(),
      }).eq("id", tx.id);

      const walletType = tx.wallet_type || "income";
      await supabase.rpc("increment_wallet", { p_user_id: tx.user_id, p_type: walletType, p_amount: tx.amount });

      if (tx.fee > 0) {
        await supabase.rpc("decrement_wallet", { p_user_id: tx.user_id, p_type: "service", p_amount: tx.fee });
      }

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
                success: true,
                transaction_id: tx.id,
                external_reference: tx.external_reference,
                status: "completed",
                amount: tx.amount,
                mpesa_receipt: mpesaReceipt,
                phone: tx.phone,
                service_fee: tx.fee,
              }),
            });
          } catch (e) {
            console.error("Failed to forward callback:", e.message);
          }
        }
      }
    } else {
      await supabase.from("transactions").update({
        status: "failed",
        callback_data: callbackData,
        error_message: callbackData.result_desc || callbackData.ResultDesc || "Payment failed",
        verified_via: "webhook",
        updated_at: new Date().toISOString(),
      }).eq("id", tx.id);

      if (tx.endpoint_id) {
        const { data: ep } = await supabase.from("endpoints").select("*").eq("id", tx.endpoint_id).single();
        if (ep) {
          await supabase.from("endpoints").update({
            total_transactions: ep.total_transactions + 1,
          }).eq("id", tx.endpoint_id);

          try {
            await fetch(ep.callback_url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                success: false,
                transaction_id: tx.id,
                external_reference: tx.external_reference,
                status: "failed",
                amount: tx.amount,
                error: callbackData.result_desc || "Payment failed",
              }),
            });
          } catch (e) {
            console.error("Failed to forward callback:", e.message);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true, matched: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Callback error:", err.message);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), { status: 500, headers: corsHeaders });
  }
});
