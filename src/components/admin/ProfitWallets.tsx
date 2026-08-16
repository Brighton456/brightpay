import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Wallet, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const LABELS: Record<string, string> = {
  platform: "Platform Profits",
  swiftwallet: "SwiftWallet Charges",
  makamesco: "Makamesco Charges",
  mpay: "M-Pay Charges",
};

export default function ProfitWallets() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [withdrawKind, setWithdrawKind] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchWallets = async () => {
    const { data } = await supabase.from("admin_wallets" as any).select("*").order("kind");
    setWallets((data as any[]) || []);
  };

  useEffect(() => { fetchWallets(); }, []);

  const withdraw = async () => {
    if (!withdrawKind || !amount) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc("admin_withdraw_profit" as any, { p_kind: withdrawKind, p_amount: Number(amount), p_note: note || null });
      if (error) throw error;
      toast({ title: "Withdrawn", description: `KES ${amount} removed from ${LABELS[withdrawKind]}` });
      setWithdrawKind(null); setAmount(""); setNote("");
      fetchWallets();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Profit Wallets</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {wallets.map(w => (
          <Card key={w.kind}>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4" /> {LABELS[w.kind] || w.kind}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">KES {Number(w.balance).toLocaleString()}</p>
              {Number(w.archived_balance) > 0 && (
                <p className="text-xs text-muted-foreground">Archived: KES {Number(w.archived_balance).toLocaleString()}</p>
              )}
              <Button size="sm" className="mt-3 w-full" disabled={Number(w.balance) <= 0} onClick={() => setWithdrawKind(w.kind)}>Withdraw</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!withdrawKind} onOpenChange={() => setWithdrawKind(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Withdraw from {withdrawKind && LABELS[withdrawKind]}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs">Amount (KES)</label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><label className="text-xs">Note (optional)</label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. transfer to operations account" /></div>
            <p className="text-xs text-muted-foreground">This records a withdrawal in the audit log. It does NOT auto-send funds anywhere.</p>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={withdraw} disabled={loading || !amount}>Confirm Withdraw</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
