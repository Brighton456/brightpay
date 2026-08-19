import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, ArrowDownRight, ArrowUpRight, Send, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface Props { transactions: any[]; }

export default function ActivityTimeline({ transactions }: Props) {
  const timeline = useMemo(() => transactions.slice(0, 15).map((tx) => {
    const icon = tx.type === "withdrawal" ? ArrowUpRight : tx.type === "transfer" ? Send : ArrowDownRight;
    const color = tx.type === "withdrawal" ? "text-amber" : tx.type === "transfer" ? "text-indigo" : "text-emerald";
    const bg = tx.type === "withdrawal" ? "bg-amber/10" : tx.type === "transfer" ? "bg-indigo/10" : "bg-emerald/10";
    const statusIcon = tx.status === "completed" ? CheckCircle2 : tx.status === "failed" ? XCircle : Clock;
    const statusColor = tx.status === "completed" ? "text-emerald" : tx.status === "failed" ? "text-destructive" : "text-amber";
    return { ...tx, icon, color, bg, statusIcon, statusColor };
  }), [transactions]);

  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Activity Timeline</CardTitle></CardHeader>
      <CardContent>
        <div className="relative pl-6">
          <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4">
            {timeline.map((tx, i) => (
              <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative">
                <div className={`absolute -left-4 top-2 w-4 h-4 rounded-full ${tx.bg} flex items-center justify-center z-10`}>
                  <tx.icon className={`w-2.5 h-2.5 ${tx.color}`} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{tx.external_reference || tx.type}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs font-bold ${tx.type === "withdrawal" || tx.type === "transfer" ? "text-amber" : "text-emerald"}`}>
                      {tx.type === "withdrawal" || tx.type === "transfer" ? "-" : "+"}KES {Number(tx.amount).toLocaleString()}
                    </span>
                    <tx.statusIcon className={`w-3 h-3 ${tx.statusColor}`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
