import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";
const KEY = "bp-monthly-goal";
export default function MonthlyGoal({ transactions }: { transactions: any[] }) {
  const goal = useMemo(() => { try { return Number(localStorage.getItem(KEY) || "50000"); } catch { return 50000; } }, []);
  const collected = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return transactions.filter((t) => t.created_at?.startsWith(month) && t.status === "completed" && (t.type === "deposit" || t.type === "endpoint")).reduce((s, t) => s + Number(t.amount), 0);
  }, [transactions]);
  const pct = Math.min((collected / goal) * 100, 100);
  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Monthly Goal</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <div><p className="text-2xl font-black text-foreground">KES {collected.toLocaleString()}</p><p className="text-xs text-muted-foreground">of KES {goal.toLocaleString()} goal</p></div>
          <span className="text-lg font-black text-primary">{Math.round(pct)}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        {pct >= 100 && <p className="text-xs text-emerald font-semibold text-center">🎉 Goal reached! Great work!</p>}
      </CardContent>
    </Card>
  );
}
