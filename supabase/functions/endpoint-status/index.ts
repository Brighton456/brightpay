import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makamescoStkStatus } from "../_shared/providers.ts";
import { finalizeDepositOrEndpoint } from "../_shared/finalize.ts";

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
