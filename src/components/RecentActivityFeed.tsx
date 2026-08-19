import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Send, Zap } from "lucide-react";
export default function RecentActivityFeed({ transactions }: { transactions: any[] }) {
  const feed = useMemo(() => transactions.slice(0, 8), [transactions]);
  const icon = (t: string) => t === "withdrawal" ? <ArrowUpRight className="w-3 h-3 text-amber" /> : t === "transfer" ? <Send className="w-3 h-3 text-indigo" /> : <ArrowDownRight className="w-3 h-3 text-emerald" />;
  return (
    <div className="space-y-1">{feed.map((tx) => (
      <div key={tx.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition-colors text-xs">
        {icon(tx.type)}
        <span className="flex-1 truncate text-foreground">{tx.external_reference || tx.type}</span>
        <span className="font-semibold">KES {Number(tx.amount).toLocaleString()}</span>
      </div>
    ))}</div>
  );
}
