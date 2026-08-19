import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Send, CheckCircle2, Clock, XCircle } from "lucide-react";
const statusIcon: Record<string, any> = { completed: CheckCircle2, pending: Clock, failed: XCircle };
const statusColor: Record<string, string> = { completed: "text-emerald", pending: "text-amber", failed: "text-destructive" };
export default function TransactionGroupedByDate({ transactions }: { transactions: any[] }) {
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    transactions.forEach((tx) => { const d = tx.created_at?.split("T")[0] || "Unknown"; if (!map[d]) map[d] = []; map[d].push(tx); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions]);
  return (
    <div className="space-y-4">
      {grouped.map(([date, txs]) => (
        <div key={date}>
          <h4 className="text-xs font-bold text-muted-foreground mb-2">{new Date(date).toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" })} · {txs.length} tx{txs.length !== 1 ? "s" : ""}</h4>
          <div className="space-y-1">{txs.map((tx) => {
            const Icon = tx.type === "withdrawal" ? ArrowUpRight : tx.type === "transfer" ? Send : ArrowDownRight;
            const SI = statusIcon[tx.status] || Clock;
            return (
              <div key={tx.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs">
                <Icon className={`w-3.5 h-3.5 ${tx.type === "withdrawal" ? "text-amber" : "text-emerald"}`} />
                <span className="flex-1 font-medium text-foreground truncate">{tx.external_reference || tx.type}</span>
                <span className="font-bold">KES {Number(tx.amount).toLocaleString()}</span>
                <SI className={`w-3 h-3 ${statusColor[tx.status]}`} />
              </div>
            );
          })}</div>
        </div>
      ))}
    </div>
  );
}
