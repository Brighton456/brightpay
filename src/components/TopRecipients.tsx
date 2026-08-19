import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
export default function TopRecipients({ transactions }: { transactions: any[] }) {
  const top = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    transactions.filter((t) => t.status === "completed" && t.phone).forEach((t) => {
      const p = t.phone; if (!map[p]) map[p] = { count: 0, amount: 0 }; map[p].count++; map[p].amount += Number(t.amount);
    });
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount).slice(0, 5);
  }, [transactions]);
  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Top Recipients</CardTitle></CardHeader>
      <CardContent>
        {top.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No recipient data yet</p> : (
          <div className="space-y-2">{top.map(([phone, v], i) => (
            <div key={phone} className="flex items-center gap-3 text-xs">
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{i + 1}</span>
              <span className="flex-1 font-mono text-foreground">{phone}</span>
              <span className="text-muted-foreground">{v.count}x</span>
              <span className="font-bold">KES {v.amount.toLocaleString()}</span>
            </div>
          ))}</div>
        )}
      </CardContent>
    </Card>
  );
}
