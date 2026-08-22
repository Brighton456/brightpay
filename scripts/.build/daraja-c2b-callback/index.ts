// C2B validation/confirmation endpoint (public — Safaricom posts here).
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const raw = await req.json().catch(() => ({}));
    console.log("[daraja-c2b]", req.url, JSON.stringify(raw));
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (_e) {
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
