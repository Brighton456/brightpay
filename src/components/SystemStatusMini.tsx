import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Wifi, Server, CheckCircle2 } from "lucide-react";
export default function SystemStatusMini() {
  const [ping, setPing] = useState<number | null>(null);
  useEffect(() => {
    const check = async () => { const start = Date.now(); try { await fetch("/ping", { method: "HEAD" }); } catch {} setPing(Date.now() - start); };
    check(); const t = setInterval(check, 30000); return () => clearInterval(t);
  }, []);
  return (
    <Card className="rounded-2xl border-border/70">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ping !== null ? "bg-emerald/10" : "bg-amber/10"}`}>
          <Server className={`w-4 h-4 ${ping !== null ? "text-emerald" : "text-amber"}`} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-foreground">System Status</p>
          <p className="text-[10px] text-muted-foreground">{ping !== null ? `Operational · ${ping}ms` : "Checking..."}</p>
        </div>
        {ping !== null && <CheckCircle2 className="w-4 h-4 text-emerald" />}
      </CardContent>
    </Card>
  );
}
