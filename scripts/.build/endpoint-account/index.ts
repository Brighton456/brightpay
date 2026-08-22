import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) return jsonResponse({ error: "x-api-key header required" }, 401);

    const { data: endpoint } = await supabase
      .from("endpoints")
      .select("id, user_id, name, status, expose_account_info, withdrawals_enabled, withdrawal_daily_limit, total_collected, total_transactions, successful_transactions")
      .eq("api_key", apiKey)
      .eq("status", "active")
      .single();
    if (!endpoint) return jsonResponse({ error: "Invalid API key or endpoint inactive" }, 401);
    if (!endpoint.expose_account_info) return jsonResponse({ error: "Account info not exposed for this endpoint" }, 403);

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_status, kyc_status, banned, can_deposit, can_withdraw, can_create_endpoints, flagged")
      .eq("id", endpoint.user_id)
      .single();

    const { data: wallets } = await supabase
      .from("wallets")
      .select("type, balance")
      .eq("user_id", endpoint.user_id);

    const income = wallets?.find((w: any) => w.type === "income")?.balance || 0;
    const service = wallets?.find((w: any) => w.type === "service")?.balance || 0;

    const { data: withdrawnTodayData } = await supabase.rpc("endpoint_withdrawn_today", { p_endpoint_id: endpoint.id });
    const withdrawnToday = Number(withdrawnTodayData || 0);

    return jsonResponse({
      endpoint: {
        id: endpoint.id,
        name: endpoint.name,
        status: endpoint.status,
        total_collected: Number(endpoint.total_collected),
        total_transactions: endpoint.total_transactions,
        successful_transactions: endpoint.successful_transactions,
      },
      account: {
        account_status: profile?.account_status,
        kyc_status: profile?.kyc_status,
        banned: profile?.banned,
        flagged: profile?.flagged,
        can_deposit: profile?.can_deposit,
        can_withdraw: profile?.can_withdraw,
      },
      wallets: {
        income_balance: Number(income),
        service_balance: Number(service),
      },
      withdrawals: {
        enabled: endpoint.withdrawals_enabled,
        daily_limit: Number(endpoint.withdrawal_daily_limit),
        withdrawn_today: withdrawnToday,
        remaining_today: Math.max(Number(endpoint.withdrawal_daily_limit) - withdrawnToday, 0),
      },
    });
  } catch (err) {
    console.error("endpoint-account error:", err instanceof Error ? err.message : String(err));
    return jsonResponse({ error: "An unexpected error occurred" }, 500);
  }
});
