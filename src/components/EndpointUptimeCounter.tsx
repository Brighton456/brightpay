import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server } from "lucide-react";
export default function EndpointUptimeCounter({ endpoint }: { endpoint: any }) {
  const uptime = endpoint.total_transactions > 0 ? ((endpoint.successful_transactions / endpoint.total_transactions) * 100).toFixed(1) : "0.0";
  return (
    <Card className="rounded-2xl border-border/70">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald/10 flex items-center justify-center"><Server className="w-4 h-4 text-emerald" /></div>
        <div className="flex-1"><p className="text-[10px] text-muted-foreground">Uptime</p><p className="text-lg font-black text-foreground">{uptime}%</p></div>
        <div className="text-right"><p className="text-[10px] text-muted-foreground">Total Tx</p><p className="text-sm font-bold">{endpoint.total_transactions || 0}</p></div>
      </CardContent>
    </Card>
  );
}
