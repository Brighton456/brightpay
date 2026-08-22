// M-Pay callback receiver — handles both deposit (mpesa/express) and withdrawal results.
// Public endpoint (no JWT); we trust by matching external_reference + amount.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
