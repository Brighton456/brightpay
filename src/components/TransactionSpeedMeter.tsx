import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer } from "lucide-react";
export default function TransactionSpeedMeter({ transactions }: { transactions: any[] }) {
  const avgSpeed = useMemo(() => {
    const completed = transactions.filter((t) => t.status === "completed" && t.updated_at && t.created_at);
    if (completed.length === 0) return null;
    const speeds = completed.map((t) => (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / 1000);
    return Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length);
  }, [transactions]);
  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Timer className="w-5 h-5 text-primary" /> Avg Speed</CardTitle></CardHeader>
      <CardContent className="text-center py-4">
        {avgSpeed === null ? <p className="text-xs text-muted-foreground">No data</p> : (
          <>
            <p className="text-4xl font-black text-foreground">{avgSpeed}<span className="text-lg text-muted-foreground">s</span></p>
            <p className="text-xs text-muted-foreground mt-1">Average transaction completion time</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
