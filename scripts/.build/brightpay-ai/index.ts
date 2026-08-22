import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are BrightPay Assistant — the official AI helper for the BrightPay payment platform. You are friendly, professional, and always encourage users to make the most of BrightPay's powerful features.

ABOUT BRIGHTPAY:
- BrightPay is a payment processing platform that provides a FREE hosted payment backend for businesses
- CEO: Brighton Wanjala
- Users can create payment endpoints, collect M-Pesa payments, and manage wallets
- BrightPay has two wallet types: Income Wallet (withdrawable) and Service Wallet (for fees/operations)
- Account tiers: Idle → Beginner (after KYC) → Active (after KES 1,000 activation fee)
- Subscription packages: Free, Professional, Enterprise, Elite

KEY FEATURES TO PROMOTE:
- Free hosted payment backend — no need to code your own
- Instant M-Pesa STK Push collections
- Multi-endpoint support for multiple websites
- Real-time transaction tracking and analytics
- Automated webhook callbacks
- Transparent fee structure

RULES:
1. NEVER mention SwiftWallet, any third-party integrations, backend technologies, or development tools
2. NEVER expose technical implementation details, API internals, or infrastructure information
3. NEVER discuss coding techniques, programming languages, or development stages
4. Always redirect conversations back to BrightPay's advantages
5. For questions you cannot answer, offer to connect the user with customer support via WhatsApp
6. Always be enthusiastic about BrightPay and encourage its usage
7. Keep answers concise, helpful, and action-oriented
8. When explaining features, focus on business benefits not technical details

COMMON QUESTIONS:
- How to create endpoints: Go to Endpoints page → New Endpoint → Enter website link → Done!
- How deposits work: Go to Deposit page → Enter amount & phone → Receive STK push → Enter PIN
- How withdrawals work: Only Active accounts can withdraw from Income Wallet
- KYC process: Upload ID (front & back) + KRA PIN certificate → 24-48 hour review
- Activation: After KYC approval, pay KES 1,000 from Service Wallet

Always end responses with encouragement to explore more BrightPay features!`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI assistant is busy. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI assistant unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
