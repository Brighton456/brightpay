import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Book, Code, Zap, Copy, Terminal, Globe, Webhook, CreditCard, Crown, DollarSign, Shield, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const sections = [
  { id: "quickstart", label: "Quick Start", icon: Zap },
  { id: "auth", label: "Authentication", icon: Code },
  { id: "stk-push", label: "STK Push", icon: Terminal },
  { id: "endpoints", label: "Endpoints", icon: Globe },
  { id: "callbacks", label: "Callbacks", icon: Webhook },
  { id: "packages", label: "Packages & Pricing", icon: Crown },
  { id: "fees", label: "Transaction Fees", icon: DollarSign },
  { id: "errors", label: "Error Codes", icon: CreditCard },
  { id: "b2c", label: "B2C Withdrawals", icon: Shield },
];

export default function Documentation() {
  const [activeSection, setActiveSection] = useState("quickstart");
  const { toast } = useToast();
  const [fees, setFees] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("fees").select("*").order("min_amount").then(({ data }) => setFees((data as any[]) || []));
    supabase.from("packages").select("*").order("price").then(({ data }) => setPackages((data as any[]) || []));
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Code copied to clipboard." });
  };

  const CodeBlock = ({ code, label }: { code: string; label?: string }) => (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground">{label || "Code"}</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs btn-press" onClick={() => copyCode(code)}><Copy className="w-3 h-3 mr-1" /> Copy</Button>
        </div>
        <div className="p-3 rounded-xl bg-secondary text-secondary-foreground font-mono text-xs overflow-x-auto"><pre>{code}</pre></div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Standalone nav */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">BrightPay</span>
          </Link>
          <span className="ml-3 text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Docs</span>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost" size="sm" className="btn-press text-sm">Log in</Button></Link>
            <Link to="/auth?mode=register"><Button size="sm" className="gradient-primary text-primary-foreground btn-press text-sm">Get Started</Button></Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-6">
        {/* Sidebar */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Book className="w-4 h-4 text-primary" /> Documentation</h2>
          <nav className="space-y-1 sticky top-20">
            {sections.map((s) => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all btn-press ${activeSection === s.id ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <s.icon className="w-4 h-4" /> {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile section selector */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border p-2 flex gap-1 overflow-x-auto">
          {sections.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeSection === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 max-w-3xl pb-20 lg:pb-0">
          <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {activeSection === "quickstart" && (
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Quick Start Guide</h1>
                <p className="text-muted-foreground mb-6">Get started with BrightPay in 3 simple steps. No backend coding needed — BrightPay hosts everything for you, <strong className="text-primary">completely free</strong>.</p>
                {[
                  { step: 1, title: "Create an Account", desc: "Sign up and verify your email. You'll receive a free KES 20 in your Service Wallet to get started." },
                  { step: 2, title: "Create an Endpoint", desc: "Go to Endpoints → New Endpoint. Just paste your website link and BrightPay generates the callback URL automatically." },
                  { step: 3, title: "Collect Payments", desc: "Use the cURL command or integrate into your application. Payments arrive in your Income Wallet instantly." },
                ].map((s) => (
                  <div key={s.step} className="flex gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0">{s.step}</div>
                    <div><h3 className="font-semibold text-foreground">{s.title}</h3><p className="text-sm text-muted-foreground">{s.desc}</p></div>
                  </div>
                ))}
                <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-emerald/10 border border-primary/20 p-4 mt-4">
                  <p className="text-sm text-foreground font-semibold">💡 Why BrightPay?</p>
                  <p className="text-xs text-muted-foreground mt-1">BrightPay provides a <strong>free hosted payment backend</strong>. No servers to manage, no code to write. Just create endpoints and start collecting M-Pesa payments on any website.</p>
                </div>
              </div>
            )}

            {activeSection === "auth" && (
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Authentication</h1>
                <p className="text-muted-foreground mb-6">All API requests use your unique endpoint API key for security isolation.</p>
                <CodeBlock label="Request Format" code={`POST /functions/v1/endpoint-pay
Content-Type: application/json
x-api-key: YOUR_ENDPOINT_API_KEY

{
  "amount": 1500,
  "phone_number": "0798765432"
}`} />
              </div>
            )}

            {activeSection === "stk-push" && (
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">STK Push API</h1>
                <p className="text-muted-foreground mb-6">Initiate M-Pesa STK Push to collect from customers.</p>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border">
                      {["Parameter", "Type", "Required", "Description"].map(h => <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {[
                        { param: "amount", type: "integer", req: true, desc: "Amount in KES (min: 1)" },
                        { param: "phone_number", type: "string", req: true, desc: "M-Pesa number (254... or 07...)" },
                        { param: "external_reference", type: "string", req: false, desc: "Your unique order/tracking ID" },
                      ].map(r => (
                        <tr key={r.param} className="border-b border-border/50">
                          <td className="py-2 px-3 font-mono text-primary text-xs">{r.param}</td>
                          <td className="py-2 px-3 text-muted-foreground text-xs">{r.type}</td>
                          <td className="py-2 px-3">{r.req ? <span className="status-pill bg-primary/10 text-primary">Required</span> : <span className="text-muted-foreground text-xs">Optional</span>}</td>
                          <td className="py-2 px-3 text-muted-foreground text-xs">{r.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <CodeBlock label="Success Response" code={`{
  "success": true,
  "status": "INITIATED",
  "message": "STK Push sent successfully",
  "transaction_id": "TXN-12847",
  "reference": "ORDER-12345"
}`} />
              </div>
            )}

            {activeSection === "endpoints" && (
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Payment Endpoints</h1>
                <p className="text-muted-foreground mb-6">Create unique payment endpoints for each website — BrightPay hosts your entire payment backend for free.</p>
                <Card className="rounded-2xl"><CardContent className="p-4">
                  <ol className="space-y-3 text-sm text-muted-foreground">
                    {["Create an endpoint in your dashboard", "Paste your website link — callback route is auto-generated", "Send POST requests to initiate STK Push", "BrightPay forwards payment callbacks to your site"].map((s, i) => (
                      <li key={i} className="flex items-start gap-2"><span className="w-5 h-5 rounded-full gradient-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>{s}</li>
                    ))}
                  </ol>
                </CardContent></Card>
              </div>
            )}

            {activeSection === "callbacks" && (
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Webhook Callbacks</h1>
                <p className="text-muted-foreground mb-6">BrightPay sends real-time payment status updates to your callback URL.</p>
                <CodeBlock label="Successful Payment" code={`{
  "success": true,
  "transaction_id": "TXN-12847",
  "external_reference": "ORDER-12345",
  "status": "completed",
  "amount": 1500,
  "mpesa_receipt": "SAE3YULR0Y",
  "phone": "254798765432",
  "service_fee": 10.00
}`} />
                <div className="mt-4" />
                <CodeBlock label="Failed Payment" code={`{
  "success": false,
  "transaction_id": "TXN-12847",
  "status": "failed",
  "error": "Request cancelled by user",
  "result_code": 1032
}`} />
              </div>
            )}

            {activeSection === "packages" && (
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Subscription Packages</h1>
                <p className="text-muted-foreground mb-6">Choose the plan that fits your business needs.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {packages.map(pkg => (
                    <Card key={pkg.id} className={`rounded-2xl ${pkg.is_popular ? "border-primary border-2" : ""}`}>
                      <CardContent className="p-5">
                        {pkg.is_popular && <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Most Popular</span>}
                        <h3 className="text-lg font-black text-foreground capitalize mt-1">{pkg.name}</h3>
                        <div className="text-2xl font-black text-primary mt-2">KES {Number(pkg.price).toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                        <p className="text-xs text-muted-foreground mt-2">{pkg.description}</p>
                        <div className="mt-3 space-y-1.5">
                          <div className="text-xs text-foreground">📊 Transactions: <strong>{pkg.tx_limit === -1 ? "Unlimited" : `${pkg.tx_limit}/mo`}</strong></div>
                          <div className="text-xs text-foreground">🔗 Endpoints: <strong>{pkg.endpoint_limit === -1 ? "Unlimited" : pkg.endpoint_limit}</strong></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "fees" && (
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Transaction Fees</h1>
                <p className="text-muted-foreground mb-6">Transparent pricing — fees are deducted from your Service Wallet.</p>
                <Card className="rounded-2xl">
                  <CardContent className="p-4">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Amount Range (KES)</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-primary">Service Fee</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-amber">Withdrawal Fee</th>
                      </tr></thead>
                      <tbody>
                        {fees.map(f => (
                          <tr key={f.id} className="border-b border-border/50">
                            <td className="py-2 px-3 text-foreground font-medium">{Number(f.min_amount).toLocaleString()} – {Number(f.max_amount).toLocaleString()}</td>
                            <td className="py-2 px-3 text-primary font-bold">KES {Number(f.service_fee)}</td>
                            <td className="py-2 px-3 text-amber font-bold">KES {Number(f.withdrawal_fee)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === "errors" && (
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Error Codes</h1>
                <p className="text-muted-foreground mb-6">Reference for HTTP and M-Pesa result codes.</p>
                <Card className="rounded-2xl mb-4"><CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-3">HTTP Status Codes</h3>
                  <div className="space-y-2">
                    {[
                      { code: "200", desc: "Success", color: "text-emerald" },
                      { code: "400", desc: "Invalid parameters", color: "text-amber" },
                      { code: "401", desc: "Invalid API key", color: "text-destructive" },
                      { code: "402", desc: "Insufficient service balance", color: "text-destructive" },
                      { code: "500", desc: "Server error", color: "text-destructive" },
                    ].map(e => (
                      <div key={e.code} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <code className={`text-sm font-bold ${e.color}`}>{e.code}</code>
                        <span className="text-sm text-muted-foreground">{e.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent></Card>
                <Card className="rounded-2xl"><CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-3">M-Pesa Result Codes</h3>
                  <div className="space-y-2">
                    {[
                      { code: "0", desc: "Success" }, { code: "1032", desc: "Cancelled by user" },
                      { code: "1037", desc: "Timeout" }, { code: "1001", desc: "Insufficient balance" },
                      { code: "2001", desc: "Wrong PIN" },
                    ].map(e => (
                      <div key={e.code} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <code className="text-sm font-bold text-foreground w-10">{e.code}</code>
                        <span className="text-sm text-muted-foreground">{e.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent></Card>
              </div>
            )}

            {activeSection === "b2c" && (
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">B2C Withdrawals</h1>
                <p className="text-muted-foreground mb-4">Withdrawals are processed through the BrightPay Dashboard. Submit a withdrawal request and it will be reviewed and processed by the platform.</p>
                <Card className="rounded-2xl"><CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-3">How It Works</h3>
                  <ol className="space-y-3 text-sm text-muted-foreground">
                    {[
                      "Navigate to Withdraw from your dashboard",
                      "Enter the amount and recipient M-Pesa number",
                      "Confirm the withdrawal request",
                      "Admin reviews and approves the disbursement",
                      "Funds are sent directly to the recipient via M-Pesa",
                    ].map((s, i) => (
                      <li key={i} className="flex items-start gap-2"><span className="w-5 h-5 rounded-full gradient-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>{s}</li>
                    ))}
                  </ol>
                </CardContent></Card>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
