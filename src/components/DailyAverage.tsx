import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
export default function DailyAverage({ transactions }: { transactions: any[] }) {
  const stats = useMemo(() => {
    const completed = transactions.filter((t) => t.status === "completed" && (t.type === "deposit" || t.type === "endpoint"));
    if (completed.length === 0) return { avg: 0, today: 0, days: 0 };
    const days = new Set(completed.map((t) => t.created_at?.split("T")[0])).size || 1;
    const total = completed.reduce((s, t) => s + Number(t.amount), 0);
    const today = new Date().toISOString().split("T")[0];
    const todayAmt = completed.filter((t) => t.created_at?.startsWith(today)).reduce((s, t) => s + Number(t.amount), 0);
    return { avg: Math.round(total / days), today: todayAmt, days };
  }, [transactions]);
  return (
    <Card className="rounded-2xl border-border/70">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-primary" /></div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Daily Average</p>
          <p className="text-lg font-black text-foreground">KES {stats.avg.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Today</p>
          <p className="text-sm font-bold text-primary">KES {stats.today.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}
