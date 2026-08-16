import { useState } from "react";
import { Users, Copy, Gift, TrendingUp, Star, ArrowRight, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Referral() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const referralCode = profile?.referral_code || "BP-XXXXXX";
  const referralLink = `https://brightpay.ddns.net/auth?mode=register&ref=${referralCode}`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4"><Gift className="w-8 h-8 text-amber-600" /></div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Referral Program</h1>
          <p className="text-muted-foreground">Earn <strong className="text-primary">0.5%</strong> of the first 10 deposits from everyone you refer!</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-bold text-foreground mb-3 flex items-center gap-2"><Share2 className="w-5 h-5 text-primary" /> Your Referral Link</h2>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm font-mono text-foreground truncate">{referralLink}</code>
              <Button size="icon" variant="outline" onClick={() => copy(referralLink)}><Copy className="w-4 h-4" /></Button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Your Code:</span>
              <code className="px-2 py-1 rounded-md bg-primary/10 text-primary font-bold text-sm">{referralCode}</code>
              <Button size="sm" variant="ghost" onClick={() => copy(referralCode)}><Copy className="w-3 h-3" /></Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card><CardContent className="p-5 text-center">
            <Users className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">0</div>
            <div className="text-xs text-muted-foreground">Total Referrals</div>
          </CardContent></Card>
          <Card><CardContent className="p-5 text-center">
            <TrendingUp className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">KES 0</div>
            <div className="text-xs text-muted-foreground">Total Earned</div>
          </CardContent></Card>
          <Card><CardContent className="p-5 text-center">
            <Star className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">0.5%</div>
            <div className="text-xs text-muted-foreground">Commission Rate</div>
          </CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-bold text-foreground mb-4">How It Works</h2>
            <div className="space-y-4">
              {[
                { step: "1", title: "Share Your Link", desc: "Share your unique referral link with friends, colleagues, and on social media" },
                { step: "2", title: "They Sign Up", desc: "When someone signs up using your link, they're automatically linked to your account" },
                { step: "3", title: "Earn Commissions", desc: "Earn 0.5% of their first 10 deposits — paid directly to your Income Wallet!" },
              ].map((s) => (
                <div key={s.step} className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0">{s.step}</div>
                  <div><h3 className="font-semibold text-foreground">{s.title}</h3><p className="text-sm text-muted-foreground">{s.desc}</p></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
          <p className="text-sm font-semibold text-amber-800">💰 The more you refer, the more you earn! Share BrightPay and watch your earnings grow.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
