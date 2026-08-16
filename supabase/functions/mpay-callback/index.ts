// M-Pay callback receiver — handles both deposit (mpesa/express) and withdrawal results.
// Public endpoint (no JWT); we trust by matching external_reference + amount.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { finalizeDepositOrEndpoint, finalizeWithdrawal } from "../_shared/finalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ok(body: Record<string, unknown> = { received: true }) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const payload = await req.json().catch(() => ({}));
    console.log("M-Pay callback:", JSON.stringify(payload));

    // M-Pay may send either STK callback (CheckoutRequestID + ResultCode) or B2C callback (reference + status).
    const checkoutId = String(
      payload.CheckoutRequestID || payload.checkoutRequestId ||
      payload?.Body?.stkCallback?.CheckoutRequestID || "",
    );
    const extRef = String(payload.reference || payload.PaymentReference || payload.user_reference || "");
    const resultCode = payload.ResultCode ?? payload?.Body?.stkCallback?.ResultCode;
    const status = String(payload.status || payload.Status || "").toLowerCase();

    let isSuccess = false;
    if (resultCode !== undefined && resultCode !== null) {
      isSuccess = Number(resultCode) === 0;
    } else if (status) {
      isSuccess = status === "completed" || status === "success" || status === "successful";
    }

    let mpesaReceipt = String(payload.mpesaReceiptNumber || payload.MpesaReceiptNumber || "");
    const items = payload?.Body?.stkCallback?.CallbackMetadata?.Item || [];
    if (Array.isArray(items)) {
      const r = items.find((i: any) => i.Name === "MpesaReceiptNumber");
      if (r) mpesaReceipt = String(r.Value || mpesaReceipt);
    }

    let tx: any = null;
    if (checkoutId) {
      const { data } = await supabase.from("transactions").select("*").eq("swiftwallet_checkout_id", checkoutId).eq("status", "pending").maybeSingle();
      tx = data;
    }
    if (!tx && extRef) {
      const { data } = await supabase.from("transactions").select("*").eq("external_reference", extRef).eq("status", "pending").maybeSingle();
      tx = data;
    }
    if (!tx) {
      console.log("M-Pay callback: no matching pending tx");
      return ok({ received: true, matched: false });
    }

    if (tx.type === "withdrawal") {
      await finalizeWithdrawal(supabase, tx, {
        success: isSuccess, mpesaReceipt, raw: payload, verifiedVia: "webhook",
        errorMessage: payload.ResultDesc || payload.message || "Withdrawal failed",
      });
    } else {
      await finalizeDepositOrEndpoint(supabase, tx, {
        success: isSuccess, mpesaReceipt, raw: payload, verifiedVia: "webhook",
        errorMessage: payload.ResultDesc || payload.message || "Payment failed",
      });
    }

    return ok({ received: true, matched: true });
  } catch (err) {
    console.error("mpay-callback error:", err instanceof Error ? err.message : String(err));
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), { status: 500, headers: corsHeaders });
  }
});
