import { useState } from "react";
import { motion } from "framer-motion";
import CodePlayground from "@/components/CodePlayground";
import WebhookSimulator from "@/components/WebhookSimulator";
import OAuthPlayground from "@/components/OAuthPlayground";
import APIRateLimiter from "@/components/APIRateLimiter";
import ApiChangelog from "@/components/ApiChangelog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Shield, Zap, ArrowRight, AlertCircle, Clock, Code, Lock, Webhook, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

function CodeBlock({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); toast.success("Copied!"); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="rounded-xl overflow-hidden border border-border/70">
      {title && <div className="flex items-center justify-between px-4 py-2 bg-muted/80 border-b border-border/70"><span className="text-xs font-semibold text-foreground">{title}</span><button onClick={copy} className="text-xs text-primary hover:text-primary/80 btn-press">{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button></div>}
      <pre className="p-4 bg-secondary text-secondary-foreground font-mono text-xs overflow-x-auto"><code>{code}</code></pre>
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/70 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 border-t border-border/70">{children}</div>}
    </div>
  );
}

const endpoints = [
  { method: "POST", path: "/functions/v1/endpoint-pay", desc: "Initiate an STK push payment", color: "bg-emerald/10 text-emerald" },
  { method: "GET", path: "/functions/v1/endpoint-status", desc: "Check transaction status by checkout_id", color: "bg-blue-500/10 text-blue-500" },
  { method: "GET", path: "/functions/v1/endpoint-account", desc: "Read wallet balances and account info", color: "bg-blue-500/10 text-blue-500" },
  { method: "POST", path: "/functions/v1/endpoint-withdraw", desc: "Initiate a B2C withdrawal (HMAC signed)", color: "bg-amber/10 text-amber" },
  { method: "GET", path: "/functions/v1/endpoint-webhooks", desc: "List registered webhook URLs", color: "bg-blue-500/10 text-blue-500" },
  { method: "POST", path: "/functions/v1/endpoint-webhooks", desc: "Register a new webhook URL", color: "bg-emerald/10 text-emerald" },
];

const errorCodes = [
  { code: 400, name: "Bad Request", desc: "Missing or invalid parameters in the request body." },
  { code: 401, name: "Unauthorized", desc: "Missing or invalid x-api-key header." },
  { code: 403, name: "Forbidden", desc: "API key is valid but lacks permission for this action." },
  { code: 404, name: "Not Found", desc: "The requested resource (endpoint, transaction) does not exist." },
  { code: 429, name: "Rate Limited", desc: "Too many requests. Back off and retry after the Retry-After header." },
  { code: 500, name: "Server Error", desc: "An internal error occurred. Contact support with the request ID." },
];

export default function ApiReference() {
  const [activeTab, setActiveTab] = useState<"quickstart" | "endpoints" | "webhooks" | "errors" | "limits">("quickstart");

  return (
    <DashboardLayout>
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[1.75rem] gradient-hero p-6 sm:p-8 text-secondary-foreground mb-6">
        <div className="flex items-center gap-2 mb-3"><Code className="w-5 h-5 text-primary" /><span className="text-xs font-semibold text-primary bg-primary/15 px-2 py-0.5 rounded-full">Developer API</span></div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">API Reference</h1>
        <p className="text-sm text-secondary-foreground/75 max-w-2xl">Everything you need to integrate BrightPay M-Pesa payments into your app. Clean REST APIs, real-time status polling, and webhook callbacks.</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: "quickstart" as const, label: "Quick Start", icon: Zap },
          { id: "endpoints" as const, label: "Endpoints", icon: ArrowRight },
          { id: "webhooks" as const, label: "Webhooks", icon: Webhook },
          { id: "errors" as const, label: "Error Codes", icon: AlertCircle },
          { id: "limits" as const, label: "Rate Limits", icon: Clock },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Quick Start */}
      {activeTab === "quickstart" && (
        <div className="space-y-6">
          <Card className="rounded-[1.5rem] border-border/70">
            <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Lock className="w-5 h-5 text-primary" /> Authentication</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">All API requests require an <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">x-api-key</code> header. Find your key in the Endpoints page.</p>
              <CodeBlock title="Required Header" code={`x-api-key: YOUR_ENDPOINT_API_KEY`} />
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border-border/70">
            <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-emerald" /> Step 1: Initiate Payment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Send a POST request to trigger an M-Pesa STK push to the customer's phone.</p>
              <CodeBlock title="POST /functions/v1/endpoint-pay" code={`curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/endpoint-pay" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "amount": 1500,
    "phone_number": "0798765432",
    "external_reference": "ORDER-12345"
  }'`} />
              <p className="text-xs text-muted-foreground"><strong>Response:</strong></p>
              <CodeBlock code={`{
  "success": true,
  "transaction_id": "uuid-here",
  "checkout_id": "ws_CO_28082025_12345"
}`} />
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border-border/70">
            <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-blue-500" /> Step 2: Poll for Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Poll the status endpoint every 3 seconds until the transaction completes or fails.</p>
              <CodeBlock title="GET /functions/v1/endpoint-status" code={`curl "https://YOUR_PROJECT.supabase.co/functions/v1/endpoint-status?checkout_id=ws_CO_..." \\
  -H "x-api-key: YOUR_API_KEY"`} />
              <CodeBlock title="JavaScript Polling" code={`const poll = setInterval(async () => {
  const res = await fetch(statusUrl + "?checkout_id=" + checkoutId, {
    headers: { "x-api-key": "YOUR_API_KEY" }
  });
  const data = await res.json();
  if (data.status === "COMPLETED") {
    clearInterval(poll);
    console.log("Payment received!", data.mpesa_receipt);
  }
  if (data.status === "FAILED") {
    clearInterval(poll);
    console.error("Payment failed", data.error);
  }
}, 3000); // Poll every 3 seconds`} />
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border-border/70">
            <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><BookOpen className="w-5 h-5 text-amber" /> Response Fields</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-2 pr-4">Field</th><th className="text-left py-2 pr-4">Type</th><th className="text-left py-2">Description</th></tr></thead>
                  <tbody>
                    {[
                      { field: "status", type: "string", desc: "PENDING | COMPLETED | FAILED" },
                      { field: "amount", type: "number", desc: "Amount in KES" },
                      { field: "mpesa_receipt", type: "string", desc: "M-Pesa transaction receipt (on completion)" },
                      { field: "phone_number", type: "string", desc: "Customer's M-Pesa phone number" },
                      { field: "external_reference", type: "string", desc: "Your unique order reference" },
                      { field: "created_at", type: "ISO 8601", desc: "Transaction creation timestamp" },
                      { field: "completed_at", type: "ISO 8601", desc: "Completion timestamp (if completed)" },
                    ].map((row) => (
                      <tr key={row.field} className="border-b border-border/50"><td className="py-2 pr-4 font-mono text-primary">{row.field}</td><td className="py-2 pr-4 text-muted-foreground">{row.type}</td><td className="py-2 text-muted-foreground">{row.desc}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Endpoints */}
      {activeTab === "endpoints" && (
        <div className="space-y-3">
          {endpoints.map((ep) => (
            <Card key={ep.path + ep.method} className="rounded-[1.25rem] border-border/70">
              <CardContent className="p-4 flex items-center gap-4">
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono ${ep.color}`}>{ep.method}</span>
                <div className="flex-1 min-w-0">
                  <code className="text-xs font-mono text-foreground">{ep.path}</code>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{ep.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Webhooks */}
      {activeTab === "webhooks" && (
        <div className="space-y-6">
          <Card className="rounded-[1.5rem] border-border/70">
            <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Webhook className="w-5 h-5 text-primary" /> Webhook Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Webhooks send real-time HTTP POST notifications to your server when transactions complete. Configure them per-endpoint in the Endpoints page.</p>
              <CodeBlock title="Webhook Payload" code={`POST https://your-server.com/webhooks/brightpay
Content-Type: application/json
x-webhook-signature: hmac-sha256-here

{
  "event": "transaction.completed",
  "data": {
    "id": "uuid",
    "amount": 1500,
    "status": "completed",
    "mpesa_receipt": "QHK34ABCD1",
    "phone_number": "0798765432",
    "external_reference": "ORDER-12345",
    "created_at": "2025-08-21T10:30:00Z"
  }
}`} />
              <div className="rounded-xl bg-amber/5 border border-amber/20 p-3">
                <div className="flex items-start gap-2"><Shield className="w-4 h-4 text-amber mt-0.5" /><div><p className="text-xs font-semibold text-foreground">Verify Signatures</p><p className="text-xs text-muted-foreground">Always verify the x-webhook-signature header using your endpoint's signing secret to prevent spoofed requests.</p></div></div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[1.5rem] border-border/70">
            <CardHeader><CardTitle className="text-sm font-bold">Webhook Events</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { event: "transaction.completed", desc: "A payment was successfully received" },
                  { event: "transaction.failed", desc: "A payment attempt failed" },
                  { event: "withdrawal.completed", desc: "A B2C withdrawal was delivered" },
                  { event: "withdrawal.failed", desc: "A withdrawal attempt failed" },
                  { event: "endpoint.created", desc: "A new endpoint was created" },
                ].map((e) => (
                  <div key={e.event} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 text-xs">
                    <code className="font-mono text-primary font-semibold">{e.event}</code>
                    <span className="text-muted-foreground">{e.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Codes */}
      {activeTab === "errors" && (
        <div className="space-y-3">
          {errorCodes.map((e) => (
            <Card key={e.code} className="rounded-[1.25rem] border-border/70">
              <CardContent className="p-4 flex items-start gap-4">
                <span className="px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive text-sm font-bold font-mono">{e.code}</span>
                <div><p className="text-sm font-bold text-foreground">{e.name}</p><p className="text-xs text-muted-foreground mt-0.5">{e.desc}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rate Limits */}
      {activeTab === "limits" && (
        <Card className="rounded-[1.5rem] border-border/70">
          <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Rate Limits</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Rate limits protect the platform from abuse. Limits are per API key.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-2 pr-4">Tier</th><th className="text-right py-2 pr-4">Requests/min</th><th className="text-right py-2 pr-4">STK Pushes/min</th><th className="text-right py-2">Webhook POSTs/min</th></tr></thead>
                <tbody>
                  {[
                    { tier: "Idle", rpm: "30", stk: "5", wh: "10" },
                    { tier: "Beginner", rpm: "60", stk: "10", wh: "20" },
                    { tier: "Active", rpm: "120", stk: "30", wh: "50" },
                    { tier: "Enterprise", rpm: "600", stk: "100", wh: "200" },
                  ].map((r) => (
                    <tr key={r.tier} className="border-b border-border/50"><td className="py-2 pr-4 font-semibold text-foreground">{r.tier}</td><td className="py-2 pr-4 text-right text-muted-foreground">{r.rpm}</td><td className="py-2 pr-4 text-right text-muted-foreground">{r.stk}</td><td className="py-2 text-right text-muted-foreground">{r.wh}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">429 Too Many Requests:</strong> If you hit the rate limit, wait for the Retry-After period (shown in response headers) before retrying. Implement exponential backoff for robust integrations.
            </div>
          </CardContent>
        </Card>
      )}
    
      <div className="mt-8 space-y-6">
        <CodePlayground />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OAuthPlayground />
          <WebhookSimulator />
        </div>
        <APIRateLimiter />
        <ApiChangelog />
      </div>
    </DashboardLayout>
  );
}
