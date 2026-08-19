import { useMemo } from "react";
import { motion } from "framer-motion";

interface Props { transactions: any[]; onSelect: (amount: number) => void; }

export default function SmartAmountChips({ transactions, onSelect }: Props) {
  const amounts = useMemo(() => {
    const freq: Record<number, number> = {};
    transactions.filter((t) => t.status === "completed").forEach((t) => {
      const a = Math.round(Number(t.amount));
      freq[a] = (freq[a] || 0) + 1;
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([a]) => Number(a));
  }, [transactions]);

  if (amounts.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold">Quick amounts</p>
      <div className="flex flex-wrap gap-1.5">
        {amounts.map((a, i) => (
          <motion.button key={a} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(a)}
            className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors btn-press">
            KES {a.toLocaleString()}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
