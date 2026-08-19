import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, TrendingUp, Activity, Zap } from "lucide-react";

interface Props { transactions: any[]; incomeBalance: number; serviceBalance: number; }

export default function WeeklySummary({ transactions, incomeBalance, serviceBalance }: Props) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = transactions.filter((t) => new Date(t.created_at) >= weekAgo && t.status === "completed");
    const prevWeek = transactions.filter((t) => {
      const d = new Date(t.created_at);
      const twoWeeksAgo = new Date(weekAgo); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);
      return d >= twoWeeksAgo && d < weekAgo && t.status === "completed";
    });

    const thisWeekDeposits = thisWeek.filter((t) => t.type === "deposit" || t.type === "endpoint").reduce((s, t) => s + Number(t.amount), 0);
    const prevWeekDeposits = prevWeek.filter((t) => t.type === "deposit" || t.type === "endpoint").reduce((s, t) => s + Number(t.amount), 0);
    const thisWeekTx = thisWeek.length;
    const change = prevWeekDeposits > 0 ? ((thisWeekDeposits - prevWeekDeposits) / prevWeekDeposits * 100).toFixed(1) : thisWeekDeposits > 0 ? "100" : "0";

    return { thisWeekDeposits, thisWeekTx, change: Number(change), totalBalance: incomeBalance + serviceBalance };
  }, [transactions, incomeBalance, serviceBalance]);

  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> This Week</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-emerald/5 border border-emerald/20">
            <div className="flex items-center gap-1 text-emerald mb-1"><TrendingUp className="w-3.5 h-3.5" /><span className="text-[10px] font-semibold">Deposits</span></div>
            <p className="text-lg font-black text-foreground">KES {stats.thisWeekDeposits.toLocaleString()}</p>
            <p className={`text-[10px] font-semibold mt-0.5 ${stats.change >= 0 ? "text-emerald" : "text-destructive"}`}>{stats.change >= 0 ? "+" : ""}{stats.change}% vs last week</p>
          </div>
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-1 text-primary mb-1"><Activity className="w-3.5 h-3.5" /><span className="text-[10px] font-semibold">Transactions</span></div>
            <p className="text-lg font-black text-foreground">{stats.thisWeekTx}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">this week</p>
          </div>
          <div className="col-span-2 p-3 rounded-xl bg-muted/30 flex items-center gap-3">
            <Zap className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">Total Balance</p>
              <p className="text-lg font-black text-foreground">KES {stats.totalBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
