// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadCreds, getAccessToken, stkPush, c2bRegister } from "../_shared/daraja.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userRes } = await supabase.auth.getUser(jwt);
    const user = userRes?.user;
    if (!user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({} as any));
    const testPhone = String(body.test_phone || "").replace(/^0/, "254").replace(/^\+/, "");

    const creds = await loadCreds(supabase, user.id);
    if (!creds) return new Response(JSON.stringify({ error: "Save credentials first" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const result: Record<string, any> = { steps: [] };

    // Step 1: OAuth
    try {
      const token = await getAccessToken(creds);
      result.steps.push({ name: "oauth", ok: true, token_prefix: token.slice(0, 8) + "..." });
    } catch (e: any) {
      result.steps.push({ name: "oauth", ok: false, error: e.message });
      await supabase.from("user_daraja_credentials").update({
        verified: false, last_tested_at: new Date().toISOString(), last_test_result: result,
      }).eq("user_id", user.id);
      return new Response(JSON.stringify({ ok: false, ...result }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 2: C2B Register URLs (sandbox only — live requires manual go-live)
    if (creds.environment === "sandbox" && creds.business_short_code) {
      try {
        const projectRef = Deno.env.get("SUPABASE_URL")!.split("//")[1].split(".")[0];
        const base = `https://${projectRef}.supabase.co/functions/v1`;
        const reg = await c2bRegister(creds, `${base}/daraja-c2b-callback?type=confirmation`, `${base}/daraja-c2b-callback?type=validation`);
        result.steps.push({ name: "c2b_register", ok: reg.status < 400, status: reg.status, body: reg.body });
      } catch (e: any) {
        result.steps.push({ name: "c2b_register", ok: false, error: e.message });
      }
    } else {
      result.steps.push({ name: "c2b_register", skipped: "live environment — register URLs via Safaricom portal" });
    }

    // Step 3: STK simulate (KES 1 to test phone)
    if (testPhone && creds.passkey && creds.business_short_code) {
      try {
        const projectRef = Deno.env.get("SUPABASE_URL")!.split("//")[1].split(".")[0];
        const cb = `https://${projectRef}.supabase.co/functions/v1/daraja-stk-callback`;
        const push = await stkPush(creds, {
          amount: 1, phone: testPhone, reference: "TEST" + Date.now().toString().slice(-6),
          description: "Test", callbackUrl: cb,
        });
        result.steps.push({ name: "stk_simulate", ok: push.ok, checkoutId: push.checkoutId, response: push.raw });
      } catch (e: any) {
        result.steps.push({ name: "stk_simulate", ok: false, error: e.message });
      }
    } else {
      result.steps.push({ name: "stk_simulate", skipped: "no test_phone or missing STK fields" });
    }

    const allOk = result.steps.every((s: any) => s.ok !== false);
    await supabase.from("user_daraja_credentials").update({
      verified: allOk, last_tested_at: new Date().toISOString(), last_test_result: result,
    }).eq("user_id", user.id);

    return new Response(JSON.stringify({ ok: allOk, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[daraja-test]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
