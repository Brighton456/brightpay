import { motion } from "framer-motion";
import ContactForm from "@/components/ContactForm";
import TeamSection from "@/components/TeamSection";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Heart, Shield, Globe, Users, Zap, Target, ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ShareButton from "@/components/ShareButton";

const values = [
  { icon: Shield, title: "Trust & Security", desc: "We protect your money and data with enterprise-grade encryption, M-Pesa API compliance, and SOC 2-aligned security practices.", color: "bg-emerald/10 text-emerald" },
  { icon: Zap, title: "Speed & Reliability", desc: "99.9% uptime SLA. Sub-second STK push delivery. We process thousands of transactions per minute without breaking a sweat.", color: "bg-blue-500/10 text-blue-500" },
  { icon: Heart, title: "Customer-First", desc: "Every feature we build starts with a real customer problem. Our support team responds in under 2 hours during business days.", color: "bg-rose/10 text-rose" },
  { icon: Globe, title: "Pan-African Vision", desc: "Starting with Kenya's M-Pesa, expanding to Nigeria (OPay, PalmPay), Tanzania (Tigo Pesa), and Uganda (MTN MoMo).", color: "bg-indigo/10 text-indigo" },
  { icon: Target, title: "Transparency", desc: "No hidden fees. No surprise deductions. Every transaction comes with a full receipt and real-time status tracking.", color: "bg-amber/10 text-amber" },
  { icon: Users, title: "Developer Empathy", desc: "Clean REST APIs, SDK-friendly JSON, comprehensive docs, and an AI assistant that writes integration code for you.", color: "bg-violet-500/10 text-violet-500" },
];

const milestones = [
  { year: "2024", event: "BrightPay Founded", desc: "Started as a weekend project to simplify M-Pesa integration for Kenyan developers." },
  { year: "2024 Q2", event: "100 Beta Users", desc: "Reached our first 100 active endpoints — processing over KES 5M monthly." },
  { year: "2024 Q3", event: "Full Launch", desc: "Public launch with KYC verification, endpoint management, and real-time transaction tracking." },
  { year: "2024 Q4", event: "Daraja BYOK", desc: "Launched Bring Your Own Daraja — users can use their own Safaricom credentials for reduced fees." },
  { year: "2025", event: "Multi-Provider", desc: "Expanding to Nigeria, Tanzania, Uganda with support for OPay, Tigo Pesa, and MTN MoMo." },
  { year: "2025+", event: "Open Banking", desc: "Full open banking API, virtual cards, invoice generation, and accounting integrations." },
];

const stats = [
  { label: "Transactions Processed", value: "2M+" },
  { label: "Active Merchants", value: "5,000+" },
  { label: "Monthly Volume", value: "KES 500M+" },
  { label: "Uptime (90 days)", value: "99.97%" },
];

export default function About() {
  return (
    <DashboardLayout>
      {/* Hero */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-none -mx-3 sm:-mx-4 lg:-mx-6 sm:rounded-[2rem] sm:mx-0 gradient-hero p-6 sm:p-10 text-secondary-foreground mb-6">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary mb-4">
            <Heart className="w-3.5 h-3.5" /> Our Story
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">Making Payments Effortless for Every African Business</h1>
          <p className="text-base md:text-lg text-secondary-foreground/80 leading-relaxed mb-6">
            BrightPay was born from a simple frustration: integrating M-Pesa payments was too complicated for developers and too expensive for small businesses. We built the platform we wished existed — a clean, fast, and transparent way to accept and send mobile money payments across Africa.
          </p>
          <div className="flex flex-wrap gap-3">
            <ShareButton title="About BrightPay" text="Making payments effortless for every African business." />
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-4 text-center">
              <p className="text-2xl sm:text-3xl font-black text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Values */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Our Values</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {values.map((v, i) => (
            <motion.div key={v.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
              <Card className="rounded-[1.5rem] border-border/70 h-full">
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-xl ${v.color} flex items-center justify-center mb-3`}>
                    <v.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground mb-1">{v.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Our Journey</h2>
        <div className="relative pl-6">
          <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-6">
            {milestones.map((m, i) => (
              <motion.div key={m.year} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06 }} className="relative">
                <div className="absolute -left-4 top-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center z-10">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <div className="ml-4">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{m.year}</span>
                  <h4 className="text-sm font-bold text-foreground mt-1">{m.event}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Behind the Scenes</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: "Engineering", role: "Building the future of payments", desc: "A lean team of full-stack engineers obsessed with API design, performance, and security." },
            { name: "Operations", role: "Keeping the lights on 24/7", desc: "Monitoring every transaction, every API call, every system metric in real-time." },
            { name: "Support", role: "Helping you succeed", desc: "Average response time under 2 hours. Available via in-app chat, email, and WhatsApp." },
          ].map((t, i) => (
            <Card key={t.name} className="rounded-[1.5rem] border-border/70">
              <CardContent className="p-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-emerald flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{t.name}</h3>
                <p className="text-xs text-primary font-medium mt-0.5">{t.role}</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact */}
      <Card className="rounded-[1.5rem] border-border/70">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Get in Touch</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <Mail className="w-5 h-5 text-primary" />
              <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-semibold text-foreground">support@brightpay.co.ke</p></div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <Phone className="w-5 h-5 text-primary" />
              <div><p className="text-xs text-muted-foreground">WhatsApp</p><p className="text-sm font-semibold text-foreground">+254 700 000 000</p></div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <MapPin className="w-5 h-5 text-primary" />
              <div><p className="text-xs text-muted-foreground">Office</p><p className="text-sm font-semibold text-foreground">Nairobi, Kenya 🇰🇪</p></div>
            </div>
          </div>
        </CardContent>
      </Card>
    
      {/* Contact Section */}
      <div className="mt-8">
        <ContactForm />
      
      {/* Team Section */}
      <div className="mt-8">
        <TeamSection />
      </div>
    >
    </DashboardLayout>
  );
}
