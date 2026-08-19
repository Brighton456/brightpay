import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Zap, Clock, CheckCircle2, XCircle } from "lucide-react";
export default function QuickStatsRow({ transactions }: { transactions: any[] }) {
  const s = useMemo(() => {
    const c = transactions.filter((t) => t.status === "completed");
    const today = new Date().toISOString().split("T")[0];
    const todayTx = c.filter((t) => t.created_at?.startsWith(today));
    return {
      todayCount: todayTx.length,
      todayAmt: todayTx.reduce((a, t) => a + Number(t.amount), 0),
      successRate: transactions.length > 0 ? Math.round((c.length / transactions.length) * 100) : 0,
    };
  }, [transactions]);
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="p-2 rounded-xl bg-emerald/5 border border-emerald/20 text-center"><p className="text-xs text-emerald font-bold">{s.todayCount}</p><p className="text-[9px] text-muted-foreground">Today's Tx</p></div>
      <div className="p-2 rounded-xl bg-primary/5 border border-primary/20 text-center"><p className="text-xs text-primary font-bold">KES {s.todayAmt.toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Today's Volume</p></div>
      <div className="p-2 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center"><p className="text-xs text-blue-500 font-bold">{s.successRate}%</p><p className="text-[9px] text-muted-foreground">Success</p></div>
    </div>
  );
}
