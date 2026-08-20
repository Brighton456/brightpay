import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";

export default function TotalVolumeCard({ transactions }: { transactions: any[] }) {
  const { deposits, withdrawals } = useMemo(() => {
    const c = transactions.filter((t) => t.status === "completed");
    return {
      deposits: c.filter((t) => t.type === "deposit" || t.type === "endpoint").reduce((s, t) => s + Number(t.amount), 0),
      withdrawals: c.filter((t) => t.type === "withdrawal" || t.type === "transfer").reduce((s, t) => s + Number(t.amount), 0),
    };
  }, [transactions]);

  const net = deposits - withdrawals;

  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Volume</p>
            <p className="text-lg font-black text-foreground">KES {deposits.toLocaleString()}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-emerald/5 border border-emerald/20 text-center">
            <TrendingUp className="w-3.5 h-3.5 text-emerald mx-auto mb-0.5" />
            <p className="text-xs font-bold text-emerald">KES {deposits.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">Incoming</p>
          </div>
          <div className="p-2 rounded-lg bg-amber/5 border border-amber/20 text-center">
            <TrendingDown className="w-3.5 h-3.5 text-amber mx-auto mb-0.5" />
            <p className="text-xs font-bold text-amber">KES {withdrawals.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">Outgoing</p>
          </div>
        </div>
        <div className="mt-2 text-center">
          <p className={`text-xs font-bold ${net >= 0 ? "text-emerald" : "text-destructive"}`}>
            Net: KES {net.toLocaleString()} {net >= 0 ? "↑" : "↓"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
