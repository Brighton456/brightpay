import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Flutterwave Issuing helper
const FLW_BASE = "https://api.flutterwave.com/v3";

function flwHeaders() {
  const key = Deno.env.get("FLW_SECRET_KEY");
  if (!key) throw new Error("FLW_SECRET_KEY not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function flwFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${FLW_BASE}${path}`, {
    ...init,
    headers: { ...flwHeaders(), ...(init.headers || {}) },
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { ok: res.ok && body?.status === "success", status: res.status, body };
}

async function flwCreateCard(opts: {
  currency: string;
  amount: number;
  billing_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_country?: string;
  billing_postal_code?: string;
  callback_url?: string;
}) {
  return flwFetch("/virtual-cards", {
    method: "POST",
    body: JSON.stringify({
      currency: opts.currency,
      amount: opts.amount,
      billing_name: opts.billing_name,
      first_name: opts.first_name || opts.billing_name.split(" ")[0],
      last_name: opts.last_name || opts.billing_name.split(" ").slice(1).join(" ") || "User",
      date_of_birth: "1990-01-01",
      email: opts.email,
      phone: opts.phone,
      title: "Mr",
      gender: "M",
      billing_address: opts.billing_address || "N/A",
      billing_city: opts.billing_city || "Nairobi",
      billing_state: opts.billing_state || "NBI",
      billing_country: opts.billing_country || "KE",
      billing_postal_code: opts.billing_postal_code || "00100",
      callback_url: opts.callback_url,
    }),
  });
}

async function flwGetCard(cardId: string) {
  return flwFetch(`/virtual-cards/${cardId}`, { method: "GET" });
}

async function flwFundCard(cardId: string, amount: number, debit_currency = "USD") {
  return flwFetch(`/virtual-cards/${cardId}/fund`, {
    method: "POST",
    body: JSON.stringify({ debit_currency, amount }),
  });
}

async function flwFreezeCard(cardId: string) {
  return flwFetch(`/virtual-cards/${cardId}/status/block`, { method: "PUT" });
}
async function flwUnfreezeCard(cardId: string) {
  return flwFetch(`/virtual-cards/${cardId}/status/unblock`, { method: "PUT" });
}
async function flwTerminateCard(cardId: string) {
  return flwFetch(`/virtual-cards/${cardId}/terminate`, { method: "PUT" });
}
async function flwCardTransactions(cardId: string) {
  return flwFetch(`/virtual-cards/${cardId}/transactions`, { method: "GET" });
}


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
