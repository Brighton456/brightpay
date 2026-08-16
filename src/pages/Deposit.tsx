import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, Phone, ArrowRight, CheckCircle2, Loader2, CreditCard, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function Deposit() {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [walletType, setWalletType] = useState<"income" | "service">("income");
  const [channelId, setChannelId] = useState<string>("");
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const { user, profile, session } = useAuth();

  const quickAmounts = [100, 500, 1000, 5000];

  useEffect(() => {
    if (user) {
      supabase.from("channels").select("*").eq("user_id", user.id).eq("status", "approved")
        .then(({ data }) => setChannels((data as any[]) || []));
    }
  }, [user]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !phone) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("stk-push", {
        body: { amount: Number(amount), phone_number: phone, wallet_type: walletType, channel_id: channelId || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
      toast({
        title: "📱 STK Push Sent!",
        description: `Check your phone (${phone}) and enter your M-Pesa PIN to complete the deposit of KES ${Number(amount).toLocaleString()}.`,
      });

      // Poll status after STK push; Makamesco may confirm via webhook/IPN up to 3 minutes later.
      const txId = (data as any)?.transaction_id;
      if (txId) {
        let polls = 0;
        const poll = async () => {
          polls++;
          try {
            await supabase.functions.invoke("makamesco-poll", { body: { transaction_id: txId } });
            const { data: row } = await supabase.from("transactions").select("status").eq("id", txId).single();
            if (row?.status === "completed") {
              toast({ title: "✅ Payment Received", description: `KES ${Number(amount).toLocaleString()} confirmed.` });
              return;
            }
            if (row?.status === "failed" && polls >= 36) {
              toast({ title: "Payment not confirmed", description: "If money was deducted, contact support with your M-Pesa message.", variant: "destructive" });
              return;
            }
          } catch { /* ignore */ }
          if (polls < 36) setTimeout(poll, 5000);
        };
        setTimeout(poll, 5000);
      }
    } catch (err: any) {
      toast({ title: "Deposit Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto mt-12">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <div className="w-20 h-20 rounded-full bg-emerald/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">STK Push Sent!</h2>
            <p className="text-muted-foreground mb-2">Please check your phone and enter your M-Pesa PIN to complete the deposit.</p>
            <p className="text-sm text-muted-foreground mb-6">
              Amount: <strong className="text-foreground">KES {Number(amount).toLocaleString()}</strong> →{" "}
              <strong className="text-foreground">{walletType === "income" ? "Income" : "Service"} Wallet</strong>
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" className="btn-press" onClick={() => { setSuccess(false); setAmount(""); }}>New Deposit</Button>
              <Button className="gradient-primary text-primary-foreground btn-press" onClick={() => window.location.href = "/dashboard"}>Back to Dashboard</Button>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Deposit Funds</h1>
        <p className="text-sm text-muted-foreground mb-6">Add funds to your wallet via M-Pesa STK Push</p>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button type="button" onClick={() => setWalletType("income")}
                className={`p-4 rounded-xl border-2 text-left transition-all btn-press ${walletType === "income" ? "border-emerald bg-emerald/5" : "border-border hover:border-muted-foreground/30"}`}>
                <Wallet className={`w-5 h-5 mb-2 ${walletType === "income" ? "text-emerald" : "text-muted-foreground"}`} />
                <div className="text-sm font-semibold text-foreground">Income Wallet</div>
                <div className="text-xs text-muted-foreground">Withdrawable</div>
              </button>
              <button type="button" onClick={() => setWalletType("service")}
                className={`p-4 rounded-xl border-2 text-left transition-all btn-press ${walletType === "service" ? "border-indigo bg-indigo/5" : "border-border hover:border-muted-foreground/30"}`}>
                <CreditCard className={`w-5 h-5 mb-2 ${walletType === "service" ? "text-indigo" : "text-muted-foreground"}`} />
                <div className="text-sm font-semibold text-foreground">Service Wallet</div>
                <div className="text-xs text-muted-foreground">For fees & operations</div>
              </button>
            </div>

            {channels.length > 0 && (
              <div className="mb-4">
                <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-primary" /> Payment Channel <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Select value={channelId || "__none__"} onValueChange={(v) => setChannelId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Default channel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Default Channel</SelectItem>
                    {channels.map((ch: any) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        {ch.name} ({ch.channel_type}{ch.business_number ? ` — ${ch.business_number}` : ""})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">Use your own approved channel for this deposit.</p>
              </div>
            )}

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-foreground">Amount (KES)</Label>
                <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5 text-lg font-semibold h-12" min={1} required />
                <div className="flex gap-2 mt-2">
                  {quickAmounts.map((qa) => (
                    <button key={qa} type="button" onClick={() => setAmount(qa.toString())}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all btn-press ${amount === qa.toString() ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                      KES {qa.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Phone Number</Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="0798765432" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 h-12" required />
                </div>
                <p className="text-xs text-muted-foreground mt-1">You will receive an STK push on this number</p>
              </div>
              <Button type="submit" disabled={loading || !amount || !phone} className="w-full h-12 gradient-primary text-primary-foreground btn-press text-base">
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending STK Push...</> : <>Deposit KES {amount ? Number(amount).toLocaleString() : "0"} <ArrowRight className="w-5 h-5 ml-2" /></>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
