import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Wifi, Zap, Clock } from "lucide-react";

export default function ApiUsageStats({ transactions }: { transactions: any[] }) {
  const stats = useMemo(() => {
    const completed = transactions.filter((t) => t.status === "completed");
    const totalCalls = transactions.length;
    const successful = completed.length;
    const failed = transactions.filter((t) => t.status === "failed").length;
    const pending = transactions.filter((t) => t.status === "pending").length;
    const totalVolume = completed.reduce((s, t) => s + Number(t.amount), 0);
    const avgAmount = successful > 0 ? Math.round(totalVolume / successful) : 0;

    // Requests per hour estimate
    const firstTx = transactions.length > 0 ? new Date(transactions[transactions.length - 1].created_at) : new Date();
    const hoursSince = Math.max((Date.now() - firstTx.getTime()) / 3600000, 1);
    const requestsPerHour = Math.round(totalCalls / hoursSince * 10) / 10;

    return { totalCalls, successful, failed, pending, totalVolume, avgAmount, requestsPerHour };
  }, [transactions]);

  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> API Usage</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <Wifi className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
            <p className="text-sm font-black text-foreground">{stats.totalCalls}</p>
            <p className="text-[9px] text-muted-foreground">Total Calls</p>
          </div>
          <div className="p-2 rounded-lg bg-emerald/5 border border-emerald/20 text-center">
            <Zap className="w-3.5 h-3.5 text-emerald mx-auto mb-0.5" />
            <p className="text-sm font-black text-emerald">{stats.successful}</p>
            <p className="text-[9px] text-muted-foreground">Successful</p>
          </div>
          <div className="p-2 rounded-lg bg-amber/5 border border-amber/20 text-center">
            <Clock className="w-3.5 h-3.5 text-amber mx-auto mb-0.5" />
            <p className="text-sm font-black text-amber">{stats.pending}</p>
            <p className="text-[9px] text-muted-foreground">Pending</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 border border-border/50 text-center">
            <Activity className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" />
            <p className="text-sm font-black text-foreground">{stats.requestsPerHour}</p>
            <p className="text-[9px] text-muted-foreground">Calls/Hr</p>
          </div>
        </div>
        <div className="mt-2 p-2 rounded-lg bg-muted/30 text-center">
          <p className="text-[10px] text-muted-foreground">Avg Amount: <span className="font-bold text-foreground">KES {stats.avgAmount.toLocaleString()}</span> · Failed: <span className="font-bold text-destructive">{stats.failed}</span></p>
        </div>
      </CardContent>
    </Card>
  );
}
