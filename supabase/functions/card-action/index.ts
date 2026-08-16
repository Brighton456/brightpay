import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { flwFundCard, flwFreezeCard, flwUnfreezeCard, flwTerminateCard, flwGetCard } from "../_shared/flutterwave.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { card_id, action, amount_usd } = await req.json();
    if (!card_id || !action) return json({ error: "card_id and action required" }, 400);

    const { data: card } = await supabase.from("virtual_cards").select("*").eq("id", card_id).single();
    if (!card) return json({ error: "Card not found" }, 404);
    if (card.user_id !== user.id) return json({ error: "Not authorized" }, 403);
    if (!card.flw_card_id) return json({ error: "Card is not linked to issuer" }, 400);

    if (action === "fund") {
      if (card.type !== "prepaid") return json({ error: "Only prepaid cards can be funded" }, 400);
      const amt = Number(amount_usd);
      if (!amt || amt <= 0) return json({ error: "Positive amount required" }, 400);
      // Debit wallet + credit local card via RPC (checks balance)
      const { error: rpcErr } = await supabase.rpc("card_fund_from_wallet", { p_card_id: card_id, p_amount_usd: amt });
      if (rpcErr) return json({ error: rpcErr.message }, 400);
      // Now fund at FLW
      const flw = await flwFundCard(card.flw_card_id, amt);
      if (!flw.ok) {
        // Best-effort: log; the wallet was already debited. Mark tx as needs review.
        console.error("FLW fund failed after wallet debit", flw.body);
        return json({ error: "Wallet was debited but issuer funding failed. Contact support.", details: flw.body }, 500);
      }
      return json({ ok: true });
    }

    if (action === "freeze") {
      const flw = await flwFreezeCard(card.flw_card_id);
      if (!flw.ok) return json({ error: flw.body?.message || "Freeze failed" }, 400);
      await supabase.from("virtual_cards").update({ status: "frozen" }).eq("id", card_id);
      return json({ ok: true });
    }
    if (action === "unfreeze") {
      const flw = await flwUnfreezeCard(card.flw_card_id);
      if (!flw.ok) return json({ error: flw.body?.message || "Unfreeze failed" }, 400);
      await supabase.from("virtual_cards").update({ status: "active" }).eq("id", card_id);
      return json({ ok: true });
    }
    if (action === "terminate") {
      const flw = await flwTerminateCard(card.flw_card_id);
      if (!flw.ok) return json({ error: flw.body?.message || "Terminate failed" }, 400);
      await supabase.from("virtual_cards").update({ status: "terminated" }).eq("id", card_id);
      return json({ ok: true });
    }
    if (action === "reveal") {
      // Fetch full card details from issuer (returns PAN/CVV once verified)
      const flw = await flwGetCard(card.flw_card_id);
      if (!flw.ok) return json({ error: flw.body?.message || "Fetch failed" }, 400);
      const d = flw.body?.data || {};
      return json({
        ok: true,
        pan: d.card_pan || d.pan,
        cvv: d.cvv,
        expiry: d.expiration,
        name: d.name_on_card || card.cardholder_name,
      });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("card-action error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
