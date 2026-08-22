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

    const { type, cardholder_name, initial_fund_usd, design } = await req.json();
    if (!["prepaid", "postpaid"].includes(type)) return json({ error: "Invalid type" }, 400);
    if (!cardholder_name || String(cardholder_name).trim().length < 3) return json({ error: "Cardholder name required" }, 400);

    // Global toggle
    const { data: setting } = await supabase.from("platform_settings").select("value").eq("key", "cards_enabled").maybeSingle();
    if (setting?.value !== "true") return json({ error: "Card issuance is currently disabled" }, 403);

    const { data: profile } = await supabase.from("profiles").select("account_status, kyc_status, banned, full_name, phone").eq("id", user.id).single();
    if (profile?.banned) return json({ error: "Account suspended" }, 403);
    if (profile?.kyc_status !== "approved") return json({ error: "KYC approval required to issue a card" }, 403);
    if (profile?.account_status !== "active") return json({ error: "Only active accounts may issue cards" }, 403);

    // Fees & FX
    const { data: fx } = await supabase.from("platform_settings").select("value").eq("key", "fx_kes_per_usd").maybeSingle();
    const { data: mk } = await supabase.from("platform_settings").select("value").eq("key", "card_fx_markup_pct").maybeSingle();
    const { data: fee } = await supabase.from("platform_settings").select("value").eq("key", "card_creation_fee_kes").maybeSingle();
    const rate = Number(fx?.value || 135);
    const markup = Number(mk?.value || 2.5);
    const creationFee = Number(fee?.value || 300);
    const initial = Number(initial_fund_usd || 0);

    if (type === "prepaid" && initial < 2) return json({ error: "Prepaid cards require an initial fund of at least $2" }, 400);

    const initialKes = Math.round(initial * rate * (1 + markup / 100));
    const totalKesDebit = creationFee + (type === "prepaid" ? initialKes : 0);

    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user.id).eq("type", "income").single();
    if (Number(wallet?.balance || 0) < totalKesDebit) {
      return json({ error: `Insufficient income wallet. Need KES ${totalKesDebit}` }, 400);
    }

    // Create at Flutterwave
    const flw = await flwCreateCard({
      currency: "USD",
      amount: type === "prepaid" ? initial : 0,
      billing_name: cardholder_name,
      email: user.email || undefined,
      phone: profile?.phone,
    });
    if (!flw.ok) {
      console.error("FLW create card failed", flw.body);
      return json({ error: flw.body?.message || "Card creation failed at issuer" }, 400);
    }

    const card = flw.body?.data || {};
    // Debit wallet
    await supabase.rpc("decrement_wallet", { p_user_id: user.id, p_type: "income", p_amount: totalKesDebit });

    // Insert local record
    const { data: inserted, error: insErr } = await supabase.from("virtual_cards").insert({
      user_id: user.id,
      type,
      currency: "USD",
      brand: (card.card_type || "visa").toLowerCase(),
      flw_card_id: card.id,
      flw_card_hash: card.card_hash,
      masked_pan: card.masked_pan,
      last4: (card.masked_pan || "").slice(-4),
      expiry_month: card.expiration?.split("/")?.[0] || card.exp_month,
      expiry_year: card.expiration?.split("/")?.[1] || card.exp_year,
      cardholder_name,
      status: "active",
      balance_usd: type === "prepaid" ? initial : 0,
      design: design || "aurora",
      metadata: card,
    }).select().single();
    if (insErr) return json({ error: insErr.message }, 500);

    // Record transactions
    if (creationFee > 0) {
      await supabase.from("card_transactions").insert({
        card_id: inserted.id, user_id: user.id, kind: "fee",
        amount_usd: 0, amount_kes: creationFee, description: "Card issuance fee", status: "completed",
      });
    }
    if (type === "prepaid" && initial > 0) {
      await supabase.from("card_transactions").insert({
        card_id: inserted.id, user_id: user.id, kind: "fund",
        amount_usd: initial, amount_kes: initialKes, fx_rate: rate * (1 + markup/100),
        description: "Initial funding", status: "completed",
      });
    }

    return json({ ok: true, card: inserted });
  } catch (e) {
    console.error("card-create error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
