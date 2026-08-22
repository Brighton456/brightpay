import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_SMTP_KEY = Deno.env.get("BREVO_SMTP_KEY");

function getWelcomeHtml(userName: string): string {
  const firstName = userName?.split(" ")[0] || "there";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 40px 30px;text-align:center;">
  <h1 style="color:#fff;font-size:28px;margin:0 0 8px;">Welcome to BrightPay! 🎉</h1>
  <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;">Your account is ready. Here's how to get started.</p>
</td></tr>

<!-- Greeting -->
<tr><td style="padding:32px 40px 0;">
  <p style="font-size:16px;color:#1a1a2e;margin:0 0 20px;">Hi <strong>${firstName}</strong>,</p>
  <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 28px;">
    You've just joined BrightPay — a full-stack payments platform that lets you accept M-Pesa, cards, and mobile money with zero complexity. Here are your next steps:
  </p>
</td></tr>

<!-- Step 1 -->
<tr><td style="padding:0 40px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;border-radius:12px;margin-bottom:16px;">
  <tr>
    <td width="60" style="padding:20px 0 20px 20px;vertical-align:top;">
      <div style="width:40px;height:40px;background:#6366f1;border-radius:10px;text-align:center;line-height:40px;color:#fff;font-weight:bold;font-size:18px;">1</div>
    </td>
    <td style="padding:20px 20px 20px 0;">
      <h3 style="font-size:15px;color:#1a1a2e;margin:0 0 6px;">🛡️ Complete Your KYC</h3>
      <p style="font-size:13px;color:#666;margin:0;line-height:1.6;">Verify your identity to unlock higher transaction limits, endpoint creation, and full platform access. This takes just a few minutes.</p>
    </td>
  </tr>
  </table>
</td></tr>

<!-- Step 2 -->
<tr><td style="padding:0 40px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;margin-bottom:16px;">
  <tr>
    <td width="60" style="padding:20px 0 20px 20px;vertical-align:top;">
      <div style="width:40px;height:40px;background:#22c55e;border-radius:10px;text-align:center;line-height:40px;color:#fff;font-weight:bold;font-size:18px;">2</div>
    </td>
    <td style="padding:20px 20px 20px 0;">
      <h3 style="font-size:15px;color:#1a1a2e;margin:0 0 6px;">💰 Fund Your Service Wallet</h3>
      <p style="font-size:13px;color:#666;margin:0;line-height:1.6;">Top up your service wallet via M-Pesa. This covers transaction fees so deposits, withdrawals, and endpoint collections can flow smoothly.</p>
    </td>
  </tr>
  </table>
</td></tr>

<!-- Step 3 -->
<tr><td style="padding:0 40px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ff;border-radius:12px;margin-bottom:16px;">
  <tr>
    <td width="60" style="padding:20px 0 20px 20px;vertical-align:top;">
      <div style="width:40px;height:40px;background:#a855f7;border-radius:10px;text-align:center;line-height:40px;color:#fff;font-weight:bold;font-size:18px;">3</div>
    </td>
    <td style="padding:20px 20px 20px 0;">
      <h3 style="font-size:15px;color:#1a1a2e;margin:0 0 6px;">🔑 Get Your API Key</h3>
      <p style="font-size:13px;color:#666;margin:0;line-height:1.6;">Create a payment endpoint and get your API key. Use it to accept payments on your website, app, or share a payment link directly with customers.</p>
    </td>
  </tr>
  </table>
</td></tr>

<!-- Step 4 -->
<tr><td style="padding:0 40px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border-radius:12px;margin-bottom:24px;">
  <tr>
    <td width="60" style="padding:20px 0 20px 20px;vertical-align:top;">
      <div style="width:40px;height:40px;background:#f97316;border-radius:10px;text-align:center;line-height:40px;color:#fff;font-weight:bold;font-size:18px;">4</div>
    </td>
    <td style="padding:20px 20px 20px 0;">
      <h3 style="font-size:15px;color:#1a1a2e;margin:0 0 6px;">🚀 Start Accepting Payments</h3>
      <p style="font-size:13px;color:#666;margin:0;line-height:1.6;">Share your payment link with customers or integrate the API into your app. Every successful payment is tracked in real-time on your dashboard.</p>
    </td>
  </tr>
  </table>
</td></tr>

<!-- CTA Button -->
<tr><td style="padding:0 40px 32px;text-align:center;">
  <a href="https://www.brightpay.me/dashboard" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:600;font-size:15px;">Go to Dashboard →</a>
</td></tr>

<!-- Divider -->
<tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #eee;margin:0;"></td></tr>

<!-- Footer -->
<tr><td style="padding:24px 40px 32px;text-align:center;">
  <p style="font-size:13px;color:#999;margin:0 0 8px;">Need help? Reply to this email or visit our docs.</p>
  <p style="font-size:12px;color:#bbb;margin:0;">© 2026 BrightPay. All rights reserved.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userId: string;
    let userEmail: string;
    let userName: string;
    let skipAuth = false;

    // Support both webhook (no auth) and authenticated calls
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      // Webhook mode — expect user_id in body
      const body = await req.json();
      userId = body.user_id;
      if (!userId) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      skipAuth = true;
    } else {
      // Authenticated mode — admin or user calling directly
      const anonKey =
        Deno.env.get("SUPABASE_ANON_KEY") ||
        Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
      } = await userClient.auth.getUser();
      if (!user)
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      const body = await req.json().catch(() => ({}));
      // Admin can send for any user; users can only send for themselves
      userId = body.user_id || user.id;

      // Check admin if targeting another user
      if (userId !== user.id) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const userRoles = (roles || []).map((r: any) => r.role);
        const isAdmin =
          userRoles.includes("admin") || userRoles.includes("grand_admin");
        if (!isAdmin)
          return new Response(
            JSON.stringify({ error: "Forbidden" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
      }
    }

    // Fetch user info
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    if (!authUser?.user?.email)
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    userEmail = authUser.user.email;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();
    userName = profile?.full_name || "";

    // Send via Brevo Transactional Email API
    const smtpKey =
      BREVO_API_KEY || BREVO_SMTP_KEY;
    if (!smtpKey)
      return new Response(
        JSON.stringify({ error: "BREVO_API_KEY not set" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    const emailPayload = {
      sender: { name: "BrightPay", email: "noreply@brightpay.me" },
      to: [{ email: userEmail, name: userName }],
      subject: "Welcome to BrightPay — Here's How to Get Started 🚀",
      htmlContent: getWelcomeHtml(userName),
    };

    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": smtpKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const brevoData = await brevoRes.json();

    if (!brevoRes.ok) {
      console.error("Brevo error:", JSON.stringify(brevoData));
      return new Response(
        JSON.stringify({
          error: "Email send failed",
          details: brevoData,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: brevoData.messageId,
        email: userEmail,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("welcome-email error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
