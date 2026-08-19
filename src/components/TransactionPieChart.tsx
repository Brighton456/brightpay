import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieIcon } from "lucide-react";
export default function TransactionPieChart({ transactions }: { transactions: any[] }) {
  const data = useMemo(() => {
    const types: Record<string, { count: number; amount: number; color: string }> = {
      deposit: { count: 0, amount: 0, color: "bg-emerald" },
      endpoint: { count: 0, amount: 0, color: "bg-blue-500" },
      withdrawal: { count: 0, amount: 0, color: "bg-amber" },
      transfer: { count: 0, amount: 0, color: "bg-indigo" },
    };
    transactions.filter((t) => t.status === "completed").forEach((t) => {
      const k = t.type === "endpoint" ? "endpoint" : t.type === "deposit" ? "deposit" : t.type === "withdrawal" ? "withdrawal" : "transfer";
      if (types[k]) { types[k].count++; types[k].amount += Number(t.amount); }
    });
    return Object.entries(types).filter(([, v]) => v.count > 0).sort((a, b) => b[1].amount - a[1].amount);
  }, [transactions]);
  const total = data.reduce((s, [, v]) => s + v.amount, 0);
  if (data.length === 0) return null;
  const colors: Record<string, string> = { deposit: "#10b981", endpoint: "#3b82f6", withdrawal: "#f59e0b", transfer: "#6366f1" };
  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><PieIcon className="w-5 h-5 text-primary" /> Transaction Mix</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              {data.reduce<{ elements: JSX.Element[]; offset: number }>((acc, [key, val]) => {
                const pct = total > 0 ? (val.amount / total) * 100 : 0;
                acc.elements.push(<circle key={key} cx="18" cy="18" r="15.915" fill="none" stroke={colors[key] || "#888"} strokeWidth="3" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={`${-acc.offset}`} />);
                acc.offset += pct;
                return acc;
              }, { elements: [], offset: 0 }).elements}
            </svg>
          </div>
          <div className="flex-1 space-y-2">
            {data.map(([key, val]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: colors[key] }} />
                  <span className="capitalize text-foreground font-medium">{key}</span>
                </div>
                <span className="text-muted-foreground">KES {val.amount.toLocaleString()} ({val.count}x)</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
