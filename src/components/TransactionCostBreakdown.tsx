import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt } from "lucide-react";
export default function TransactionCostBreakdown({ transactions }: { transactions: any[] }) {
  const data = useMemo(() => {
    const completed = transactions.filter((t) => t.status === "completed");
    const totalFees = completed.reduce((s, t) => s + Number(t.fee || 0), 0);
    const totalAmount = completed.reduce((s, t) => s + Number(t.amount), 0);
    const byType: Record<string, { count: number; fees: number }> = {};
    completed.forEach((t) => { const k = t.type; if (!byType[k]) byType[k] = { count: 0, fees: 0 }; byType[k].count++; byType[k].fees += Number(t.fee || 0); });
    return { totalFees, totalAmount, byType };
  }, [transactions]);
  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Receipt className="w-5 h-5 text-primary" /> Cost Breakdown</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total Volume</span><span className="font-bold text-foreground">KES {data.totalAmount.toLocaleString()}</span></div>
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total Fees</span><span className="font-bold text-amber">KES {data.totalFees.toLocaleString()}</span></div>
        <div className="border-t border-border pt-2 mt-2">
          {Object.entries(data.byType).map(([type, v]) => (
            <div key={type} className="flex justify-between text-[10px] py-0.5">
              <span className="capitalize text-muted-foreground">{type} ({v.count}x)</span>
              <span className="text-foreground">KES {v.fees.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
