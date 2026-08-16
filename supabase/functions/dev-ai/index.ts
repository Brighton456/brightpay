// Admin Developer AI - diagnostic + safe DB actions
// Streams responses; supports tools for read-only DB queries, log reads,
// and confirmed mutating actions logged to admin_audit_log.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `You are BrightPay Developer AI, a safety-first coding & operations assistant embedded in the BrightPay admin panel.

CONTEXT
- Stack: React 18 + Vite + Tailwind + TypeScript, Supabase (Postgres + Edge Functions in Deno), PWA via Capacitor.
- Payment providers: SwiftWallet, Makamesco Nexus Pay, M-Pay. Per-provider fee table 'provider_fees'.
- Wallets: user 'income' & 'service'; admin profit wallets keyed by provider in 'admin_wallets'.
- You CANNOT edit source code from inside the running app; you can diagnose and call safe tools.

RESPONSE MODES (user toggles)
- concise: short snippets + one-line fixes
- walkthrough: step-by-step reasoning + code examples
- lesson: teach the underlying concept first, then apply

SAFETY RULES
- Never invent data. If you need a fact, call query_db.
- For any mutating action, ALWAYS call propose_action first and wait for user approval. Never call execute_action directly without an approval token.
- Explain *why* before suggesting a fix. Show diff-style examples when editing code.
- Encourage secure, efficient, maintainable patterns.
- If unsure, ask the user.
`;

// SELECT-only SQL validator
function isSafeSelect(sql: string): boolean {
  const s = sql.trim().toLowerCase().replace(/;\s*$/, "");
  if (!s.startsWith("select") && !s.startsWith("with")) return false;
  return !/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|do)\b/.test(s);
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_recent_transactions",
      description: "List recent transactions with optional filters.",
      parameters: { type: "object", properties: { status: { type: "string" }, limit: { type: "integer" }, user_id: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_summary",
      description: "Get profile + wallets + recent transactions for a user (by id or email).",
      parameters: { type: "object", properties: { user_id: { type: "string" }, email: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "get_platform_stats",
      description: "Return wallet totals, profit wallet balances, tx counts, error rate.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_errors",
      description: "List recent failed transactions with error messages.",
      parameters: { type: "object", properties: { limit: { type: "integer" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_action",
      description: "Propose a mutating action that requires user approval. Returns approval_token.",
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["refund_tx","flag_user","unflag_user","adjust_wallet","toggle_endpoint","withdraw_admin_wallet"] },
          params: { type: "object" },
          rationale: { type: "string" },
        },
        required: ["kind","params","rationale"],
      },
    },
  },
];

async function runTool(name: string, args: any, supabase: any, actor: string) {
  if (name === "list_recent_transactions") {
    let q = supabase.from("transactions").select("id,type,amount,fee,status,provider,phone,error_message,created_at,user_id").order("created_at", { ascending: false }).limit(args.limit || 20);
    if (args.status) q = q.eq("status", args.status);
    if (args.user_id) q = q.eq("user_id", args.user_id);
    const { data, error } = await q;
    return error ? { error: error.message } : { transactions: data };
  }
  if (name === "get_user_summary") {
    let userId = args.user_id;
    if (!userId && args.email) {
      const { data } = await supabase.auth.admin.listUsers();
      userId = data?.users?.find((u: any) => u.email === args.email)?.id;
    }
    if (!userId) return { error: "User not found" };
    const [{ data: profile }, { data: wallets }, { data: txs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("wallets").select("*").eq("user_id", userId),
      supabase.from("transactions").select("id,type,amount,status,provider,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    ]);
    return { profile, wallets, recent_transactions: txs };
  }
  if (name === "get_platform_stats") {
    const [{ data: walletAgg }, { data: adminWallets }, { count: total }, { count: failed }, { data: providers }] = await Promise.all([
      supabase.from("wallets").select("type,balance"),
      supabase.from("admin_wallets").select("*"),
      supabase.from("transactions").select("*", { count: "exact", head: true }),
      supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("provider_fees").select("*"),
    ]);
    const wallets = (walletAgg || []).reduce((acc: any, w: any) => { acc[w.type] = (acc[w.type] || 0) + Number(w.balance); return acc; }, {});
    return { user_wallet_totals: wallets, admin_wallets: adminWallets, transactions: { total, failed }, provider_fees: providers };
  }
  if (name === "list_recent_errors") {
    const { data, error } = await supabase.from("transactions").select("id,type,amount,provider,error_message,created_at,user_id").eq("status", "failed").order("created_at", { ascending: false }).limit(args.limit || 10);
    return error ? { error: error.message } : { errors: data };
  }
  if (name === "propose_action") {
    const { data, error } = await supabase.from("admin_audit_log").insert({
      actor, action: `proposed:${args.kind}`, payload: args.params, result: { rationale: args.rationale, pending: true },
    }).select("id").single();
    if (error) return { error: error.message };
    return { approval_token: data.id, kind: args.kind, params: args.params, rationale: args.rationale, instruction: "Display this to the user with an Approve button. Do not execute until they approve." };
  }
  return { error: "Unknown tool" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!roles || roles.length === 0) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });

    const { messages, mode = "walkthrough" } = await req.json();
    const sys = SYSTEM_PROMPT + `\n\nCURRENT MODE: ${mode}`;
    const allMessages = [{ role: "system", content: sys }, ...messages];

    // Loop until model has no more tool calls
    let safety = 0;
    while (safety++ < 6) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({ model: "google/gemini-2.5-pro", messages: allMessages, tools: TOOLS, stream: false }),
      });
      if (!res.ok) {
        const t = await res.text();
        return new Response(JSON.stringify({ error: `AI gateway error ${res.status}`, detail: t }), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      if (!choice) return new Response(JSON.stringify({ error: "No response" }), { status: 500, headers: corsHeaders });

      if (choice.tool_calls && choice.tool_calls.length > 0) {
        allMessages.push(choice);
        for (const tc of choice.tool_calls) {
          const args = JSON.parse(tc.function.arguments || "{}");
          const result = await runTool(tc.function.name, args, supabase, user.id);
          allMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
        }
        continue;
      }

      return new Response(JSON.stringify({ content: choice.content, messages: allMessages.slice(messages.length + 1) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Max tool iterations" }), { status: 500, headers: corsHeaders });
  } catch (e) {
    console.error("dev-ai error:", (e as Error).message);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: corsHeaders });
  }
});
