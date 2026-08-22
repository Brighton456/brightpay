import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, verif-hash",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const hash = req.headers.get("verif-hash");
    const expected = Deno.env.get("FLW_WEBHOOK_HASH");
    if (!expected || hash !== expected) {
      console.warn("Invalid FLW webhook hash");
      return json({ error: "Invalid signature" }, 401);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const payload = await req.json();
    console.log("FLW webhook:", JSON.stringify(payload).slice(0, 500));

    const event = payload?.event || payload?.["event.type"];
    const data = payload?.data || {};

    // Card transaction events
    if (event?.toString().includes("card") || data?.card_id || data?.cardId) {
      const flwCardId = String(data.card_id || data.cardId || data.card?.id || "");
      if (!flwCardId) return json({ ok: true });
      const { data: card } = await supabase.from("virtual_cards").select("*").eq("flw_card_id", flwCardId).maybeSingle();
      if (!card) return json({ ok: true });

      const amount = Number(data.amount || 0);
      const currency = data.currency || "USD";
      const merchant = data.merchant?.name || data.narration || data.description || "Card charge";
      const ref = String(data.reference || data.id || "");
      const status = String(data.status || "successful").toLowerCase();

      if (status === "successful" && amount > 0) {
        // Settle: debits balance (prepaid) or bumps credit_used (postpaid), and pulls from income wallet if postpaid can settle
        await supabase.rpc("card_settle_charge", {
          p_card_id: card.id,
          p_amount_usd: currency === "USD" ? amount : amount, // assume USD
          p_merchant: merchant,
          p_ref: ref,
        });
      }
    }
    return json({ ok: true });
  } catch (e) {
    console.error("flw-webhook error", e);
    return json({ ok: true }); // 200 to prevent retries flooding
  }
});
