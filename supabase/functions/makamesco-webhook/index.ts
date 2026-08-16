import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { finalizeDepositOrEndpoint, finalizeWithdrawal } from "../_shared/finalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return "sha256=" + Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return "";
}

function readNested(obj: any, path: string[]) {
  return path.reduce((acc, key) => acc?.[key], obj);
}

function normalizeStatus(payload: any, data: any) {
  const event = String(payload.event || data.event || payload.type || "").toLowerCase();
  const explicit = String(data.status || data.paymentStatus || data.transactionStatus || data.state || "").toLowerCase();
  const resultCode = data.ResultCode ?? data.resultCode ?? data.result_code ?? readNested(data, ["Body", "stkCallback", "ResultCode"]);
  const receipt = firstString(data.mpesaReceiptNumber, data.mpesaReceipt, data.receiptNumber, data.transactionReceipt);
  const text = firstString(data.resultDesc, data.ResultDesc, data.message, data.errorMessage, readNested(data, ["Body", "stkCallback", "ResultDesc"])).toLowerCase();
  if (event.includes("completed") || receipt || ["completed", "complete", "success", "successful", "paid"].includes(explicit) || String(resultCode) === "0") return "completed";
  if (event.includes("failed") || ["failed", "failure", "reversed", "timeout", "expired"].includes(explicit) || (String(resultCode || "") && String(resultCode) !== "0")) return "failed";
  if (event.includes("cancel") || ["cancelled", "canceled", "usercancelled", "user_cancelled"].includes(explicit) || text.includes("cancel")) return "failed";
  return "pending";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  try {
    const rawBody = await req.text();
    const secret = Deno.env.get("MAKAMESCO_WEBHOOK_SECRET");
    if (secret) {
      const sig = req.headers.get("x-webhook-signature") || "";
      const expected = await hmac(secret, rawBody);
      if (!safeEq(sig, expected)) return json({ error: "Invalid signature" }, 401);
    } else {
      console.warn("MAKAMESCO_WEBHOOK_SECRET is not configured; signature verification skipped.");
    }

    const payload = rawBody ? JSON.parse(rawBody) : {};
    const data = payload.data || payload.Body?.stkCallback || payload.Result || payload.result || payload;
    const checkoutId = firstString(
      data.checkoutRequestId, data.CheckoutRequestID, data.CheckoutRequestId,
      data.orderTrackingId, data.conversationId, data.ConversationID, data.originatorConversationId,
      payload.checkoutRequestId, payload.conversationId,
    );
    const reference = firstString(data.accountReference, data.merchantReference, data.externalReference, data.external_reference, data.occasion, payload.externalReference);
    const normalized = normalizeStatus(payload, data);
    const success = normalized === "completed";
    const failed = normalized === "failed";

    if (!checkoutId && !reference) return json({ received: true, matched: false });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let tx: any = null;
    if (checkoutId) {
      const { data: row } = await supabase.from("transactions").select("*").eq("swiftwallet_checkout_id", checkoutId).maybeSingle();
      tx = row;
    }
    if (!tx && reference) {
      const { data: row } = await supabase.from("transactions").select("*").eq("external_reference", reference).maybeSingle();
      tx = row;
    }
    if (!tx) return json({ received: true, matched: false });
    if (tx.status === "completed") return json({ received: true, matched: true, already_completed: true });

    const receipt = firstString(data.mpesaReceiptNumber, data.mpesaReceipt, data.receiptNumber, data.transactionReceipt);
    const errorMessage = firstString(data.resultDesc, data.ResultDesc, data.message, data.errorMessage, `Payment ${normalized}`);
    if (tx.type === "withdrawal" && (success || failed)) {
      await finalizeWithdrawal(supabase, tx, { success, mpesaReceipt: receipt, raw: payload, errorMessage, verifiedVia: "webhook" });
    } else if (success || failed) {
      await finalizeDepositOrEndpoint(supabase, tx, { success, mpesaReceipt: receipt, raw: payload, errorMessage, verifiedVia: "webhook" });
    }

    return json({ received: true, matched: true });
  } catch (err) {
    console.error("makamesco-webhook error:", err instanceof Error ? err.message : String(err));
    return json({ error: "An unexpected error occurred" }, 500);
  }
});