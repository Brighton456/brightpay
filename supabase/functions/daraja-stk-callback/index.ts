// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeStkCallback } from "../_shared/daraja.ts";
import { finalizeDepositOrEndpoint } from "../_shared/finalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const raw = await req.json().catch(() => ({} as any));
    console.log("[daraja-stk-callback]", JSON.stringify(raw));
    const info = normalizeStkCallback(raw);
    if (!info.checkoutRequestId) {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: tx } = await supabase.from("transactions").select("*").eq("swiftwallet_checkout_id", info.checkoutRequestId).maybeSingle();
    if (tx) {
      await finalizeDepositOrEndpoint(supabase, tx, {
        success: info.status === "completed",
        mpesaReceipt: info.mpesaReceipt,
        raw,
        errorMessage: info.status !== "completed" ? `Daraja: ${info.status}` : undefined,
        verifiedVia: "webhook",
      });
    }
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[daraja-stk-callback]", e);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
