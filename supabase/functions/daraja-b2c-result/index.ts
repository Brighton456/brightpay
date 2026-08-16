// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { finalizeWithdrawal } from "../_shared/finalize.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const raw = await req.json().catch(() => ({} as any));
    console.log("[daraja-b2c-result]", JSON.stringify(raw));
    const result = raw?.Result || {};
    const items: any[] = result?.ResultParameters?.ResultParameter || [];
    const get = (n: string) => items.find((i) => i.Key === n)?.Value;
    const conversationId = String(result.ConversationID || result.OriginatorConversationID || "");
    const ok = result.ResultCode === 0;
    const receipt = String(get("TransactionReceipt") || "");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: tx } = await supabase.from("transactions").select("*").eq("swiftwallet_checkout_id", conversationId).maybeSingle();
    if (tx) {
      await finalizeWithdrawal(supabase, tx, {
        success: ok, mpesaReceipt: receipt, raw,
        errorMessage: ok ? undefined : String(result.ResultDesc || "Daraja withdrawal failed"),
        verifiedVia: "webhook",
      });
    }
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[daraja-b2c-result]", e);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
