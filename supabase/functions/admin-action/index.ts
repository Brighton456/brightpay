import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SWIFTWALLET_B2C_URL = "https://swiftwallet.co.ke/v3/pay-request/";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const userRoles = (roles || []).map((r: any) => r.role);
    const isAdmin = userRoles.includes("admin") || userRoles.includes("grand_admin");
    const isGrandAdmin = userRoles.includes("grand_admin");
    if (!isAdmin) return jsonResponse({ error: "Forbidden" }, 403);

    const { action, ...params } = await req.json();
    const json = (data: unknown, status = 200) => jsonResponse(data, status);

    switch (action) {
      case "ban_user": { await supabase.from("profiles").update({ banned: true }).eq("id", params.user_id); return json({ success: true }); }
      case "unban_user": { await supabase.from("profiles").update({ banned: false }).eq("id", params.user_id); return json({ success: true }); }
      case "approve_kyc": {
        await supabase.from("kyc_documents").update({ status: "approved", reviewed_by: user.id }).eq("user_id", params.user_id);
        await supabase.from("profiles").update({ kyc_status: "approved", account_status: "beginner" }).eq("id", params.user_id);
        return json({ success: true });
      }
      case "reject_kyc": {
        await supabase.from("kyc_documents").update({ status: "rejected", reviewed_by: user.id, admin_notes: params.reason || "" }).eq("user_id", params.user_id);
        await supabase.from("profiles").update({ kyc_status: "rejected" }).eq("id", params.user_id);
        return json({ success: true });
      }
      case "toggle_activation": {
        const { data: p } = await supabase.from("profiles").select("activation_paid").eq("id", params.user_id).single();
        const newVal = !p?.activation_paid;
        await supabase.from("profiles").update({ activation_paid: newVal, account_status: newVal ? "active" : "beginner" }).eq("id", params.user_id);
        return json({ success: true });
      }
      case "update_privileges": {
        await supabase.from("profiles").update({
          can_deposit: params.can_deposit, can_withdraw: params.can_withdraw,
          can_create_endpoints: params.can_create_endpoints, withdrawal_review_required: params.withdrawal_review_required ?? false,
        }).eq("id", params.user_id);
        return json({ success: true });
      }
      case "flag_user": { await supabase.from("profiles").update({ flagged: true, withdrawal_review_required: true }).eq("id", params.user_id); return json({ success: true }); }
      case "unflag_user": { await supabase.from("profiles").update({ flagged: false, withdrawal_review_required: false }).eq("id", params.user_id); return json({ success: true }); }
      case "ignore_flag": {
        // Ignore flag = remove flag and restore all privileges
        await supabase.from("profiles").update({
          flagged: false,
          withdrawal_review_required: false,
          can_deposit: true,
          can_withdraw: true,
          can_create_endpoints: true,
        }).eq("id", params.user_id);
        return json({ success: true });
      }
      case "edit_balance": {
        await supabase.from("wallets").update({ balance: params.amount, updated_at: new Date().toISOString() })
          .eq("user_id", params.user_id).eq("type", params.wallet_type);
        return json({ success: true });
      }
      case "approve_withdrawal": {
        const { data: tx } = await supabase.from("transactions").select("*").eq("id", params.transaction_id).single();
        if (!tx || tx.status !== "pending" || tx.type !== "withdrawal") return json({ error: "Transaction not found or not pending" }, 404);
        const swApiKey = Deno.env.get("SWIFTWALLET_API_KEY")!;
        const callbackUrl = `${supabaseUrl}/functions/v1/swiftwallet-callback`;
        await supabase.rpc("decrement_wallet", { p_user_id: tx.user_id, p_type: "income", p_amount: tx.amount });
        if (tx.fee > 0) await supabase.rpc("decrement_wallet", { p_user_id: tx.user_id, p_type: "service", p_amount: tx.fee });
        let b2cResponse: Response;
        try {
          b2cResponse = await fetch(SWIFTWALLET_B2C_URL, {
            method: "POST", headers: { Authorization: `Bearer ${swApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ amount: Number(tx.amount), phone_number: tx.phone, command_id: "BusinessPayment", remarks: "BrightPay Withdrawal", occasion: "BrightPay Withdrawal", external_reference: tx.external_reference || `WD-${Date.now()}`, callback_url: callbackUrl }),
          });
        } catch {
          await supabase.rpc("increment_wallet", { p_user_id: tx.user_id, p_type: "income", p_amount: tx.amount });
          if (tx.fee > 0) await supabase.rpc("increment_wallet", { p_user_id: tx.user_id, p_type: "service", p_amount: tx.fee });
          await supabase.from("transactions").update({ status: "failed", error_message: "Provider unreachable", admin_review_notes: "Approved but provider unreachable" }).eq("id", params.transaction_id);
          return json({ error: "Provider unreachable" }, 502);
        }
        const rawResponse = await b2cResponse.text();
        let b2cData: Record<string, unknown> = {};
        try { b2cData = rawResponse ? JSON.parse(rawResponse) : {}; } catch { b2cData = { raw: rawResponse }; }
        if (b2cResponse.ok) {
          await supabase.from("transactions").update({ status: "completed", admin_review_notes: `Approved by ${user.id}`, flagged: false, swiftwallet_checkout_id: String(b2cData.transaction_id || b2cData.conversationID || b2cData.id || Date.now()), callback_data: b2cData }).eq("id", params.transaction_id);
        } else {
          await supabase.rpc("increment_wallet", { p_user_id: tx.user_id, p_type: "income", p_amount: tx.amount });
          if (tx.fee > 0) await supabase.rpc("increment_wallet", { p_user_id: tx.user_id, p_type: "service", p_amount: tx.fee });
          await supabase.from("transactions").update({ status: "failed", error_message: JSON.stringify(b2cData), admin_review_notes: "Approved but provider rejected" }).eq("id", params.transaction_id);
        }
        return json({ success: true });
      }
      case "reject_withdrawal": {
        await supabase.from("transactions").update({ status: "failed", admin_review_notes: params.reason || "Rejected by admin", flagged: false }).eq("id", params.transaction_id);
        return json({ success: true });
      }
      case "reconcile_withdrawal": {
        const { data, error } = await supabase.rpc("admin_reconcile_withdrawal", {
          p_tx_id: params.transaction_id,
          p_receipt: params.receipt || null,
          p_note: params.note || null,
          p_announce: params.announce !== false,
        });
        if (error) return json({ error: error.message }, 400);
        return json({ success: true, result: data });
      }
      case "update_disabled_providers": {
        await supabase.from("profiles").update({ disabled_providers: params.providers || [] }).eq("id", params.user_id);
        return json({ success: true });
      }
      case "get_user_detail": {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", params.user_id).single();
        const { data: wallets } = await supabase.from("wallets").select("*").eq("user_id", params.user_id);
        const { data: recentTx } = await supabase.from("transactions").select("*").eq("user_id", params.user_id).order("created_at", { ascending: false }).limit(20);
        const { data: channels } = await supabase.from("channels").select("*").eq("user_id", params.user_id);
        const { data: endpoints } = await supabase.from("endpoints").select("*").eq("user_id", params.user_id);
        const { data: au } = await supabase.auth.admin.getUserById(params.user_id);
        return json({ profile, wallets, recentTx, channels, endpoints, email: au?.user?.email || "", email_verified: !!au?.user?.email_confirmed_at });
      }
      case "update_fee": {
        const updates: Record<string, unknown> = { service_fee: params.service_fee, withdrawal_fee: params.withdrawal_fee };
        if (params.cost_per_transaction !== undefined) updates.cost_per_transaction = params.cost_per_transaction;
        if (params.service_cost !== undefined) updates.service_cost = params.service_cost;
        if (params.withdrawal_cost !== undefined) updates.withdrawal_cost = params.withdrawal_cost;
        await supabase.from("fees").update(updates).eq("id", params.fee_id);
        return json({ success: true });
      }
      case "update_package": {
        const updates: Record<string, unknown> = {};
        if (params.tx_limit !== undefined) updates.tx_limit = params.tx_limit;
        if (params.endpoint_limit !== undefined) updates.endpoint_limit = params.endpoint_limit;
        if (params.price !== undefined) updates.price = params.price;
        if (params.name !== undefined) updates.name = params.name;
        if (params.description !== undefined) updates.description = params.description;
        if (params.features !== undefined) updates.features = params.features;
        if (params.is_popular !== undefined) updates.is_popular = params.is_popular;
        await supabase.from("packages").update(updates).eq("id", params.package_id);
        return json({ success: true });
      }
      case "update_setting": { await supabase.from("platform_settings").upsert({ key: params.key, value: params.value, updated_at: new Date().toISOString() }); return json({ success: true }); }
      case "add_admin": {
        if (!isGrandAdmin) return json({ error: "Only grand admins can add admins" }, 403);
        await supabase.from("user_roles").insert({ user_id: params.user_id, role: "admin" });
        return json({ success: true });
      }
      case "remove_admin": {
        if (!isGrandAdmin) return json({ error: "Only grand admins can remove admins" }, 403);
        await supabase.from("user_roles").delete().eq("user_id", params.user_id).eq("role", "admin");
        return json({ success: true });
      }
      case "approve_channel": {
        await supabase.from("channels").update({ status: "approved", swiftwallet_channel_id: params.swiftwallet_channel_id, reviewed_by: user.id, updated_at: new Date().toISOString() }).eq("id", params.channel_id);
        return json({ success: true });
      }
      case "reject_channel": {
        await supabase.from("channels").update({ status: "rejected", reviewed_by: user.id, admin_notes: params.reason || "Rejected", updated_at: new Date().toISOString() }).eq("id", params.channel_id);
        return json({ success: true });
      }
      case "get_all_users": {
        const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
        const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const emailMap: Record<string, string> = {}; const verifiedMap: Record<string, boolean> = {};
        (authUsers?.users || []).forEach((u: any) => { emailMap[u.id] = u.email || ""; verifiedMap[u.id] = !!u.email_confirmed_at; });
        const { data: allRoles } = await supabase.from("user_roles").select("*");
        const roleMap: Record<string, string[]> = {};
        (allRoles || []).forEach((r: any) => { if (!roleMap[r.user_id]) roleMap[r.user_id] = []; roleMap[r.user_id].push(r.role); });
        const enriched = (data || []).map((p: any) => ({ ...p, email: emailMap[p.id] || "", email_verified: verifiedMap[p.id] || false, roles: roleMap[p.id] || ["user"] }));
        return json(enriched);
      }
      case "get_all_transactions": { const { data } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(1000); return json(data || []); }
      case "get_all_kyc": {
        const { data } = await supabase.from("kyc_documents").select("*").order("created_at", { ascending: false });
        const userIds = [...new Set((data || []).map((d: any) => d.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        const nameMap: Record<string, string> = {}; (profiles || []).forEach((p: any) => { nameMap[p.id] = p.full_name; });
        return json((data || []).map((d: any) => ({ ...d, user_name: nameMap[d.user_id] || "Unknown" })));
      }
      case "get_kyc_file_url": { const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(params.file_path, 3600); return json({ url: data?.signedUrl || "" }); }
      case "get_all_endpoints": { const { data } = await supabase.from("endpoints").select("*").order("created_at", { ascending: false }); return json(data || []); }
      case "get_all_wallets": { const { data } = await supabase.from("wallets").select("*").order("user_id"); return json(data || []); }
      case "get_flagged_transactions": { const { data } = await supabase.from("transactions").select("*").eq("flagged", true).order("created_at", { ascending: false }); return json(data || []); }
      case "get_pending_withdrawals": { const { data } = await supabase.from("transactions").select("*").eq("type", "withdrawal").eq("status", "pending").order("created_at", { ascending: false }); return json(data || []); }
      case "get_feature_requests": { const { data } = await supabase.from("feature_requests").select("*").order("created_at", { ascending: false }); return json(data || []); }
      case "respond_feature_request": { await supabase.from("feature_requests").update({ admin_response: params.response, status: params.status || "reviewed", updated_at: new Date().toISOString() }).eq("id", params.request_id); return json({ success: true }); }
      case "get_settings": { const { data } = await supabase.from("platform_settings").select("*"); return json(data || []); }
      case "get_stats": {
        const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        const { count: txCount } = await supabase.from("transactions").select("*", { count: "exact", head: true });
        const { count: epCount } = await supabase.from("endpoints").select("*", { count: "exact", head: true });
        const { count: pendingKyc } = await supabase.from("kyc_documents").select("*", { count: "exact", head: true }).eq("status", "pending");
        const { count: flaggedCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("flagged", true);
        const { count: pendingWithdrawals } = await supabase.from("transactions").select("*", { count: "exact", head: true }).eq("type", "withdrawal").eq("status", "pending");
        const { data: completedTxs } = await supabase.from("transactions").select("fee, amount, type, status, created_at").eq("status", "completed");
        const revenue = (completedTxs || []).reduce((sum: number, t: any) => sum + Number(t.fee), 0);
        const totalVolume = (completedTxs || []).reduce((sum: number, t: any) => sum + Number(t.amount), 0);
        const totalDeposits = (completedTxs || []).filter((t: any) => t.type === "deposit" || t.type === "endpoint").reduce((sum: number, t: any) => sum + Number(t.amount), 0);
        const totalWithdrawals = (completedTxs || []).filter((t: any) => t.type === "withdrawal").reduce((sum: number, t: any) => sum + Number(t.amount), 0);
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: recentTxs } = await supabase.from("transactions").select("amount, type, status, created_at").gte("created_at", thirtyDaysAgo.toISOString());
        const dailyData: Record<string, { deposits: number; withdrawals: number; count: number }> = {};
        (recentTxs || []).forEach((tx: any) => { const day = tx.created_at.split("T")[0]; if (!dailyData[day]) dailyData[day] = { deposits: 0, withdrawals: 0, count: 0 }; dailyData[day].count++; if (tx.status === "completed") { if (tx.type === "deposit" || tx.type === "endpoint") dailyData[day].deposits += Number(tx.amount); if (tx.type === "withdrawal") dailyData[day].withdrawals += Number(tx.amount); } });
        const chartData = Object.entries(dailyData).sort().map(([date, d]) => ({ date, ...d }));
        const { data: allProfiles } = await supabase.from("profiles").select("account_status, banned");
        const statusBreakdown = { idle: 0, beginner: 0, active: 0, banned: 0 };
        (allProfiles || []).forEach((p: any) => { if (p.banned) statusBreakdown.banned++; else statusBreakdown[p.account_status as keyof typeof statusBreakdown]++; });
        return json({ users: userCount || 0, transactions: txCount || 0, endpoints: epCount || 0, revenue, totalVolume, totalDeposits, totalWithdrawals, pendingKyc: pendingKyc || 0, flaggedUsers: flaggedCount || 0, pendingWithdrawals: pendingWithdrawals || 0, chartData, statusBreakdown });
      }
      default: return json({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    console.error("admin-action error:", err instanceof Error ? err.message : String(err));
    return jsonResponse({ error: "An unexpected error occurred" }, 500);
  }
});
