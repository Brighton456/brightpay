import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";
export default function SuccessRateGauge({ rate }: { rate: number }) {
  const color = rate >= 80 ? "#10b981" : rate >= 50 ? "#f59e0b" : "#ef4444";
  const dashOffset = 75 - (rate / 100) * 75;
  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Gauge className="w-5 h-5 text-primary" /> Success Rate</CardTitle></CardHeader>
      <CardContent className="flex flex-col items-center">
        <svg viewBox="0 0 36 20" className="w-32 h-16">
          <path d="M 3 17 A 15 15 0 0 1 33 17" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" strokeLinecap="round" />
          <path d="M 3 17 A 15 15 0 0 1 33 17" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray="75" strokeDashoffset={dashOffset} />
        </svg>
        <p className="text-3xl font-black -mt-1" style={{ color }}>{rate}%</p>
        <p className="text-xs text-muted-foreground mt-1">{rate >= 80 ? "Excellent" : rate >= 50 ? "Good" : "Needs attention"}</p>
      </CardContent>
    </Card>
  );
}
