import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Phone, ArrowRight, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function Withdraw() {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fees, setFees] = useState<any[]>([]);
  const { toast } = useToast();
  const { profile, incomeBalance, serviceBalance } = useAuth();

  useEffect(() => {
    supabase.from("fees").select("*").order("min_amount").then(({ data }) => { if (data) setFees(data as any[]); });
  }, []);

  const getFee = (amt: number) => {
    const f = fees.find(f => amt >= Number(f.min_amount) && amt <= Number(f.max_amount));
    return f ? Number(f.withdrawal_fee) : 0;
  };

  if (profile?.account_status !== "active") {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto mt-12 text-center">
          <div className="w-20 h-20 rounded-full bg-amber/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-amber" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Withdrawal Locked</h2>
          <p className="text-muted-foreground mb-6">Only Active accounts can withdraw. Complete KYC and pay the activation fee to unlock.</p>
          <Button className="gradient-primary text-primary-foreground btn-press" onClick={() => window.location.href = "/settings"}>View Account Status</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (amt > incomeBalance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    const fee = getFee(amt);
    if (serviceBalance < fee) {
      toast({ title: "Insufficient service wallet for fee", description: `You need KES ${fee} in your service wallet.`, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("b2c-withdraw", {
        body: { amount: amt, phone_number: phone },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSuccess(true);
      toast({ title: "💸 Withdrawal Initiated!", description: `KES ${amt.toLocaleString()} is being sent to ${phone}` });
      const txId = (data as any)?.transaction_id;
      if (txId) {
        let polls = 0;
        const poll = async () => {
          polls++;
          try {
            await supabase.functions.invoke("makamesco-poll", { body: { transaction_id: txId } });
            const { data: row } = await supabase.from("transactions").select("status").eq("id", txId).single();
            if (row?.status === "completed") {
              toast({ title: "✅ Withdrawal Completed", description: `KES ${amt.toLocaleString()} has been sent.` });
              return;
            }
          } catch { /* keep polling */ }
          if (polls < 36) setTimeout(poll, 5000);
        };
        setTimeout(poll, 5000);
      }
    } catch (err: any) {
      const message = String(err?.message || "");
      const userMessage = /income wallet|service wallet|account|balance/i.test(message)
        ? message
        : "Withdrawal could not be started. Please try again shortly or contact support.";
      toast({ title: "Withdrawal Failed", description: userMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto mt-12 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="w-20 h-20 rounded-full bg-emerald/10 flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10 text-emerald" /></div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Withdrawal Initiated!</h2>
            <p className="text-muted-foreground mb-6">KES {Number(amount).toLocaleString()} is being sent to {phone}.</p>
            <Button className="gradient-primary text-primary-foreground btn-press" onClick={() => window.location.href = "/dashboard"}>Back to Dashboard</Button>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  const fee = amount ? getFee(Number(amount)) : 0;

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Withdraw Funds</h1>
        <p className="text-sm text-muted-foreground mb-6">Send money from your Income Wallet to M-Pesa</p>
        <Card className="mb-4">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl wallet-income flex items-center justify-center"><ArrowUpRight className="w-6 h-6 text-primary-foreground" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-extrabold text-foreground">KES {Number(incomeBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-foreground">Amount (KES)</Label>
                <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5 text-lg font-semibold h-12" min={10} required />
                {Number(amount) > incomeBalance && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Exceeds available balance</p>}
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Phone Number</Label>
                <div className="relative mt-1.5"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="0798765432" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 h-12" required /></div>
              </div>
              {amount && Number(amount) > 0 && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="text-foreground font-medium">KES {Number(amount).toLocaleString()}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-muted-foreground">Withdrawal Fee (from Service Wallet)</span><span className="text-foreground font-medium">KES {fee}</span></div>
                  <div className="border-t border-border my-2" />
                  <div className="flex justify-between font-bold"><span className="text-foreground">You Receive</span><span className="text-foreground">KES {Number(amount).toLocaleString()}</span></div>
                </div>
              )}
              <Button type="submit" disabled={loading || !amount || !phone || Number(amount) > incomeBalance} className="w-full h-12 gradient-primary text-primary-foreground btn-press text-base">
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</> : <>Withdraw <ArrowRight className="w-5 h-5 ml-2" /></>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
