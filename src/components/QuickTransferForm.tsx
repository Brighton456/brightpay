import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function QuickTransferForm() {
  const { user, incomeBalance, serviceBalance, refreshWallets } = useAuth();
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"income-to-service" | "service-to-income">("income-to-service");
  const [loading, setLoading] = useState(false);

  const fromBalance = direction === "income-to-service" ? incomeBalance : serviceBalance;
  const toLabel = direction === "income-to-service" ? "Service Wallet" : "Income Wallet";
  const fromLabel = direction === "income-to-service" ? "Income Wallet" : "Service Wallet";

  const handleTransfer = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > Number(fromBalance)) { toast.error("Insufficient balance"); return; }
    setLoading(true);
    try {
      const fromType = direction === "income-to-service" ? "income" : "service";
      const toType = direction === "income-to-service" ? "service" : "income";
      const { error: e1 } = await supabase.rpc("decrement_wallet" as any, { p_user_id: user!.id, p_type: fromType, p_amount: amt });
      const { error: e2 } = await supabase.rpc("increment_wallet" as any, { p_user_id: user!.id, p_type: toType, p_amount: amt });
      if (e1 || e2) throw new Error("Transfer failed");
      await supabase.from("transactions").insert({
        user_id: user!.id,
        type: "transfer" as any,
        amount: amt,
        fee: 0,
        status: "completed" as any,
        external_reference: `TRF-${Date.now()}`,
        wallet_type: toType as any,
      });
      await refreshWallets();
      toast.success(`KES ${amt.toLocaleString()} transferred to ${toLabel}`);
      setAmount("");
    } catch (err: any) {
      toast.error("Transfer failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> Quick Transfer</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{fromLabel}</span>
          <button
            onClick={() => setDirection(d => d === "income-to-service" ? "service-to-income" : "income-to-service")}
            className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors btn-press"
          >
            <ArrowRight className={`w-3.5 h-3.5 text-primary transition-transform ${direction === "service-to-income" ? "rotate-180" : ""}`} />
          </button>
          <span className="font-medium text-foreground">{toLabel}</span>
        </div>
        <div>
          <Label className="text-xs">Amount (KES)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="mt-1.5"
            min={1}
            max={Number(fromBalance)}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">Available: KES {Number(fromBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        <Button
          className="w-full gradient-primary text-primary-foreground btn-press"
          onClick={handleTransfer}
          disabled={loading || !amount}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Transferring...</>
          ) : (
            <><Send className="w-4 h-4 mr-2" /> Transfer KES {amount ? Number(amount).toLocaleString() : "0"}</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
