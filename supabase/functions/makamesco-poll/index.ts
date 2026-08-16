// Makamesco status poller — finalises pending Makamesco STK + B2C transactions.
// Can be called by the frontend (auth required for security) or by cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makamescoStkStatus, makamescoB2cStatus } from "../_shared/providers.ts";
import { finalizeDepositOrEndpoint, finalizeWithdrawal } from "../_shared/finalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function pollErrorMessage(type: string, status: string) {
  if (type === "withdrawal") return status === "cancelled" ? "Withdrawal cancelled" : "Withdrawal could not be completed";
  return status === "cancelled" ? "Payment cancelled" : "Payment was not completed";
}

function isAmbiguousMakamescoB2cFailure(raw: Record<string, unknown>) {
  const body = JSON.stringify(raw || {}).toLowerCase();
  return body.includes("insufficient_payment_balance") || body.includes("payment wallet balance");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let transactionId: string | undefined;
    try {
      const body = await req.json();
      transactionId = body?.transaction_id;
    } catch { /* GET / cron - poll all */ }

    let q = supabase.from("transactions").select("*").eq("provider", "makamesco").eq("status", "pending");
    if (transactionId) q = q.eq("id", transactionId);
    else q = q.order("created_at", { ascending: true }).limit(50);

    const { data: pending } = await q;
    const results: any[] = [];

    for (const tx of pending || []) {
      const isWithdrawal = tx.type === "withdrawal";
      const checkoutId = tx.swiftwallet_checkout_id;
      if (!checkoutId) continue;

      const poll = isWithdrawal
        ? await makamescoB2cStatus(checkoutId)
        : await makamescoStkStatus(checkoutId);

      const ageMs = Date.now() - new Date(tx.created_at).getTime();
      if (isWithdrawal && poll.status === "failed" && isAmbiguousMakamescoB2cFailure(poll.raw)) {
        await supabase.from("transactions").update({ callback_data: poll.raw, updated_at: new Date().toISOString() }).eq("id", tx.id);
        results.push({ id: tx.id, status: "pending", note: "awaiting_withdrawal_webhook" });
        continue;
      }
      if (poll.status === "pending" || poll.status === "unknown" || (poll.status === "failed" && ageMs < 180000)) {
        await supabase.from("transactions").update({ callback_data: poll.raw, updated_at: new Date().toISOString() }).eq("id", tx.id);
        results.push({ id: tx.id, status: poll.status });
        continue;
      }

      const success = poll.status === "completed";
      if (isWithdrawal) {
        await finalizeWithdrawal(supabase, tx, {
          success, mpesaReceipt: poll.mpesaReceipt, raw: poll.raw,
          errorMessage: success ? undefined : pollErrorMessage(tx.type, poll.status),
          verifiedVia: "polling",
        });
      } else {
        await finalizeDepositOrEndpoint(supabase, tx, {
          success, mpesaReceipt: poll.mpesaReceipt, raw: poll.raw,
          errorMessage: success ? undefined : pollErrorMessage(tx.type, poll.status),
          verifiedVia: "polling",
        });
      }
      results.push({ id: tx.id, status: poll.status });
    }

    return json({ polled: results.length, results });
  } catch (err) {
    console.error("makamesco-poll error:", err instanceof Error ? err.message : String(err));
    return json({ error: "An unexpected error occurred" }, 500);
  }
});
