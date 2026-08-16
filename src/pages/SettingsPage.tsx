import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Crown, Zap, Lock, ArrowRight, CheckCircle2, Shield, Bell, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user, profile, serviceBalance, refreshProfile, refreshWallets } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("profiles").update({ full_name: fullName, phone } as any).eq("id", user!.id);
    await refreshProfile();
    toast({ title: "Profile updated!" });
    setSaving(false);
  };

  const handleActivate = async () => {
    if (serviceBalance < 1000) {
      toast({ title: "Insufficient Balance", description: "You need KES 1,000 in your Service Wallet. Please deposit first.", variant: "destructive" });
      return;
    }
    setActivating(true);
    try {
      const { error } = await supabase.rpc("activate_account" as any, { p_user_id: user!.id });
      if (error) throw error;
      await refreshProfile();
      await refreshWallets();
      toast({ title: "🎉 Account Activated!", description: "Welcome to Active status! You now have full access to all BrightPay features." });
    } catch (err: any) {
      toast({ title: "Activation failed", description: err.message, variant: "destructive" });
    } finally {
      setActivating(false);
    }
  };

  const accountStatus = profile?.account_status || "idle";

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="w-5 h-5" /> Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label className="text-sm">Full Name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" /></div>
              <div><Label className="text-sm">Email</Label><Input value={user?.email || ""} className="mt-1.5" disabled /></div>
              <div><Label className="text-sm">Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" /></div>
            </div>
            <Button className="gradient-primary text-primary-foreground btn-press" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Crown className="w-5 h-5" /> Account Status</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { status: "idle", label: "Idle", desc: "Email verified. Dashboard deposits only.", icon: Zap, done: true },
                { status: "beginner", label: "Beginner", desc: "KYC approved. Create payment endpoints.", icon: Shield, done: accountStatus !== "idle" },
                { status: "active", label: "Active", desc: "Full access. Withdrawals & unlimited endpoints.", icon: Crown, done: accountStatus === "active" },
              ].map((s) => (
                <div key={s.status} className={`flex items-center gap-4 p-4 rounded-xl border ${s.done ? "border-emerald/30 bg-emerald/5" : "border-border"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.done ? "bg-emerald/10" : "bg-muted"}`}>
                    {s.done ? <CheckCircle2 className="w-5 h-5 text-emerald" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                  {accountStatus === s.status && <span className="status-pill bg-primary/10 text-primary">Current</span>}
                </div>
              ))}
            </div>

            {accountStatus === "idle" && (
              <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-sm font-semibold text-foreground mb-1">🚀 Ready to unlock more?</p>
                <p className="text-xs text-muted-foreground mb-3">Complete KYC verification to create payment endpoints.</p>
                <Button size="sm" className="gradient-primary text-primary-foreground btn-press" onClick={() => window.location.href = "/kyc"}>Start KYC <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </div>
            )}

            {accountStatus === "beginner" && !profile?.activation_paid && (
              <div className="mt-4 p-4 rounded-xl bg-emerald/5 border border-emerald/20">
                <p className="text-sm font-semibold text-foreground mb-1">⚡ Activate Full Access</p>
                <p className="text-xs text-muted-foreground mb-1">Pay a one-time fee of <strong>KES 1,000</strong> from your Service Wallet.</p>
                <p className="text-xs text-muted-foreground mb-3">Service Wallet Balance: <strong className="text-foreground">KES {Number(serviceBalance).toLocaleString()}</strong></p>
                {serviceBalance < 1000 && (
                  <div className="flex items-center gap-1 text-amber text-xs mb-3"><AlertTriangle className="w-3 h-3" /> You need at least KES 1,000 in your Service Wallet. <Button size="sm" variant="link" className="text-xs p-0 h-auto text-primary" onClick={() => window.location.href = "/deposit"}>Deposit now</Button></div>
                )}
                <Button size="sm" className="gradient-primary text-primary-foreground btn-press" onClick={handleActivate} disabled={activating || serviceBalance < 1000}>
                  {activating ? "Processing..." : "Pay KES 1,000 & Activate"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Bell className="w-5 h-5" /> Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Transaction alerts", desc: "Get notified for every payment" },
              { label: "Failed payment alerts", desc: "Notify when a payment fails" },
              { label: "Low balance warning", desc: "Alert when service wallet is low" },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-foreground">{n.label}</p><p className="text-xs text-muted-foreground">{n.desc}</p></div>
                <Switch defaultChecked />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
