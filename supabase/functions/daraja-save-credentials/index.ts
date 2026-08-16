// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encrypt } from "../_shared/daraja.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userRes } = await supabase.auth.getUser(jwt);
    const user = userRes?.user;
    if (!user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const {
      environment,
      business_short_code,
      party_b,
      b2c_short_code,
      b2c_initiator_name,
      consumer_key,
      consumer_secret,
      passkey,
      b2c_security_credential,
      stk_enabled,
      b2c_enabled,
      c2b_enabled,
    } = body || {};

    const payload: Record<string, unknown> = {
      user_id: user.id,
      environment: environment === "live" ? "live" : "sandbox",
      business_short_code: business_short_code || null,
      party_b: party_b || null,
      b2c_short_code: b2c_short_code || null,
      b2c_initiator_name: b2c_initiator_name || null,
      stk_enabled: !!stk_enabled,
      b2c_enabled: !!b2c_enabled,
      c2b_enabled: !!c2b_enabled,
      verified: false,
      updated_at: new Date().toISOString(),
    };
    if (consumer_key) payload.consumer_key_enc = await encrypt(consumer_key);
    if (consumer_secret) payload.consumer_secret_enc = await encrypt(consumer_secret);
    if (passkey) payload.passkey_enc = await encrypt(passkey);
    if (b2c_security_credential) payload.b2c_security_credential_enc = await encrypt(b2c_security_credential);

    const { error } = await supabase
      .from("user_daraja_credentials")
      .upsert(payload, { onConflict: "user_id" });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[daraja-save]", e);
    return new Response(JSON.stringify({ error: e.message || "Failed to save" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
