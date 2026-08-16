import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Phone, ArrowRight, HelpCircle, BookOpen, Zap, Sparkles, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

export default function Support() {
  const [whatsapp, setWhatsapp] = useState("0100605856");
  const [prefilledMsg, setPrefilledMsg] = useState("Hello BrightPay Support, I need help with");

  useEffect(() => {
    supabase.from("platform_settings").select("*").in("key", ["support_whatsapp", "support_prefilled_message"]).then(({ data }) => {
      (data || []).forEach((s: any) => {
        if (s.key === "support_whatsapp") setWhatsapp(s.value);
        if (s.key === "support_prefilled_message") setPrefilledMsg(s.value);
      });
    });
  }, []);

  const formatWhatsApp = (num: string) => {
    let n = num.replace(/\s/g, "");
    if (n.startsWith("0")) n = "254" + n.slice(1);
    if (!n.startsWith("+")) n = "+" + n;
    return n.replace("+", "");
  };

  const whatsappUrl = `https://wa.me/${formatWhatsApp(whatsapp)}?text=${encodeURIComponent(prefilledMsg)}`;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto mb-4"><MessageCircle className="w-8 h-8 text-white" /></div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Support Center</h1>
          <p className="text-muted-foreground">We're here to help you succeed with BrightPay</p>
        </div>

        <Card className="mb-6 rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-8 text-center text-white">
              <Phone className="w-10 h-10 mx-auto mb-3 opacity-90" />
              <h2 className="text-xl font-bold mb-2">WhatsApp Support</h2>
              <p className="text-sm opacity-80 mb-5">Get instant help from our support team. We typically respond within 5 minutes.</p>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-white text-emerald-600 hover:bg-white/90 font-bold btn-press shadow-lg"><MessageCircle className="w-5 h-5 mr-2" /> Chat on WhatsApp <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </a>
              <p className="text-[10px] mt-3 opacity-60">Available Mon-Sat, 8AM - 10PM EAT</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card className="rounded-2xl"><CardContent className="p-5">
            <HelpCircle className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-bold text-foreground mb-3">Frequently Asked</h3>
            <div className="space-y-3 text-sm">
              {[
                { q: "How do I create an endpoint?", a: "Go to Endpoints → New Endpoint. Paste your site URL." },
                { q: "Why is my withdrawal locked?", a: "Complete KYC and pay the KES 1,000 activation fee." },
                { q: "How long does KYC take?", a: "Typically 24-48 hours for review." },
                { q: "What's the free KES 20?", a: "Every new account gets KES 20 in Service Wallet to cover initial transaction fees." },
              ].map((faq) => (
                <div key={faq.q}>
                  <p className="font-medium text-foreground">{faq.q}</p>
                  <p className="text-muted-foreground text-xs">{faq.a}</p>
                </div>
              ))}
            </div>
          </CardContent></Card>
          <Card className="rounded-2xl"><CardContent className="p-5">
            <BookOpen className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-bold text-foreground mb-3">Quick Links</h3>
            <div className="space-y-2">
              {[
                { label: "API Documentation", href: "/docs" },
                { label: "Pricing & Fees", href: "/pricing" },
                { label: "Request a Feature", href: "/feature-requests" },
                { label: "Service Status", href: "/status" },
                { label: "Referral Program", href: "/referral" },
              ].map((l) => (
                <a key={l.label} href={l.href} className="flex items-center gap-2 text-sm text-primary hover:underline"><ArrowRight className="w-3 h-3" />{l.label}</a>
              ))}
            </div>
          </CardContent></Card>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-primary/5 to-indigo/5 border border-primary/10 p-5 text-center">
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">Need instant answers?</p>
          <p className="text-xs text-muted-foreground mt-1">Use the AI Assistant (bottom-right corner) for immediate help with any BrightPay feature!</p>
        </div>

        <div className="text-center text-sm text-muted-foreground mt-6">
          <p>CEO: <strong className="text-foreground">Brighton Wanjala</strong> | BrightPay © 2026</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
