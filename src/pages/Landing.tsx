import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Shield, BarChart3, Globe, ArrowRight, Check, ChevronRight, MessageCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Zap, title: "Instant STK Push", desc: "Process M-Pesa payments in seconds with real-time callbacks and auto-reconciliation." },
  { icon: Shield, title: "Enterprise Security", desc: "API key authentication, encrypted data, and comprehensive audit logging." },
  { icon: BarChart3, title: "Rich Analytics", desc: "Track every transaction with detailed logs, success rates, and exportable reports." },
  { icon: Globe, title: "Multi-Endpoint", desc: "Create unique payment endpoints for all your websites with individual analytics." },
];

const stats = [
  { value: "99.9%", label: "Uptime" },
  { value: "<2s", label: "STK Push" },
  { value: "500+", label: "Businesses" },
  { value: "24/7", label: "Support" },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">BrightPay</span>
          </div>
          <div className="hidden md:flex items-center gap-8 ml-12 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link to="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <Link to="/install" className="hover:text-foreground transition-colors flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> Get App</Link>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost" size="sm" className="btn-press">Log in</Button></Link>
            <Link to="/auth?mode=register"><Button size="sm" className="gradient-primary text-primary-foreground btn-press">Get Started <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
          </div>
        </div>
      </nav>

      <section className="gradient-hero pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
              <Zap className="w-3 h-3" /> Reliable Payment Processing API
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-secondary-foreground leading-tight mb-6">
              Ship M-Pesa Payments<br /><span className="text-gradient">Without the Headaches</span>
            </h1>
            <p className="text-lg md:text-xl text-secondary-foreground/70 max-w-2xl mx-auto mb-8">
              Stop chasing failed STKs and manual reconciliations. BrightPay routes, tracks, and reconciles every payment — so you can focus on your product. Free hosted payment backend for your apps.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?mode=register"><Button size="lg" className="gradient-primary text-primary-foreground btn-press h-12 px-8 text-base">Start Free <ArrowRight className="w-5 h-5 ml-2" /></Button></Link>
              <Link to="/docs"><Button size="lg" variant="outline" className="btn-press h-12 px-8 text-base border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10">View API Docs</Button></Link>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-2xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-primary">{stat.value}</div>
                <div className="text-sm text-secondary-foreground/50 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">🚀 Why BrightPay?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">BrightPay gives you a <strong className="text-foreground">free, fully-hosted payment backend</strong>. Just create endpoints, plug them into your website, and start collecting — no backend coding required.</p>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            {[
              { emoji: "💰", title: "Zero Backend Costs", desc: "We host your payment infrastructure for free" },
              { emoji: "⚡", title: "5-Minute Integration", desc: "Just a cURL call to start collecting payments" },
              { emoji: "📊", title: "Full Analytics", desc: "Track every shilling across all your apps" },
            ].map(i => (
              <div key={i.title} className="p-4 rounded-xl bg-card border border-border">
                <div className="text-2xl mb-2">{i.emoji}</div>
                <h3 className="font-semibold text-foreground mb-1">{i.title}</h3>
                <p className="text-muted-foreground text-xs">{i.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Everything You Need to Accept Payments</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">From instant STK Push to automated reconciliation — pick the building blocks for your business.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4"><f.icon className="w-6 h-6 text-primary-foreground" /></div>
                <h3 className="text-xl font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-foreground mb-4">Developer-First API</h2>
            <p className="text-muted-foreground">Start accepting payments with a single API call</p>
          </div>
          <div className="rounded-2xl bg-secondary text-secondary-foreground p-6 overflow-x-auto font-mono text-sm leading-relaxed">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-amber/60" />
              <div className="w-3 h-3 rounded-full bg-emerald/60" />
              <span className="ml-2 text-xs text-secondary-foreground/50">STK Push Request</span>
            </div>
            <pre className="text-secondary-foreground/90">{`curl -X POST "https://your-brightpay-endpoint/functions/v1/endpoint-pay" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_ENDPOINT_API_KEY" \\
  -d '{
    "amount": 1500,
    "phone_number": "0798765432",
    "external_reference": "ORDER-12345"
  }'`}</pre>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground">Start free and upgrade as you grow</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { name: "Free", price: "FREE", desc: "Perfect for getting started", features: ["1,000 API requests/month", "Standard support", "Basic analytics", "Up to 3 endpoints"], cta: "Get Started" },
              { name: "Professional", price: "KES 1,000", period: "/mo", desc: "For growing businesses", features: ["10,000 API requests/month", "Priority support", "Advanced analytics", "Custom webhooks", "Up to 10 endpoints"], cta: "Upgrade Now" },
              { name: "Enterprise", price: "KES 10,000", period: "/mo", desc: "For large-scale operations", features: ["100,000 API requests/month", "24/7 Premium support", "Advanced analytics", "Dedicated account manager", "Up to 50 endpoints"], cta: "Upgrade Now", highlight: true },
              { name: "Elite", price: "KES 50,000", period: "/mo", desc: "Unlimited everything", features: ["Unlimited API requests", "Dedicated infrastructure", "White-label options", "SLA guarantee", "Unlimited endpoints"], cta: "Contact Us" },
            ].map((plan) => (
              <div key={plan.name} className={`relative p-5 rounded-2xl border ${plan.highlight ? "border-primary bg-card shadow-lg ring-1 ring-primary/20" : "border-border bg-card"}`}>
                {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-primary text-primary-foreground text-xs font-semibold">Most Popular</div>}
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <div className="text-2xl font-extrabold text-foreground mt-2">{plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.period || ""}</span></div>
                <p className="text-xs text-muted-foreground mt-1 mb-5">{plan.desc}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-foreground"><Check className="w-3.5 h-3.5 text-emerald flex-shrink-0" />{f}</li>
                  ))}
                </ul>
                <Link to="/auth?mode=register"><Button className={`w-full btn-press text-sm ${plan.highlight ? "gradient-primary text-primary-foreground" : ""}`} variant={plan.highlight ? "default" : "outline"}>{plan.cta} <ChevronRight className="w-3.5 h-3.5 ml-1" /></Button></Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 bg-secondary text-secondary-foreground">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-primary-foreground" /></div>
            <span className="font-bold">BrightPay</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-secondary-foreground/50">
            <Link to="/docs" className="hover:text-secondary-foreground">Docs</Link>
            <Link to="/pricing" className="hover:text-secondary-foreground">Pricing</Link>
            <Link to="/support" className="hover:text-secondary-foreground">Support</Link>
            <Link to="/install" className="hover:text-secondary-foreground">Get App</Link>
          </div>
          <p className="text-sm text-secondary-foreground/50">© 2026 BrightPay. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
