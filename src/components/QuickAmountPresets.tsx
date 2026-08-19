import { motion } from "framer-motion";
const presets = [100, 500, 1000, 2000, 5000, 10000];
export default function QuickAmountPresets({ onSelect }: { onSelect: (amt: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">{presets.map((a, i) => (
      <motion.button key={a} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
        onClick={() => onSelect(a)} className="px-2.5 py-1 rounded-full bg-muted hover:bg-primary/10 text-xs font-semibold text-foreground hover:text-primary transition-colors btn-press">
        {a >= 1000 ? `${a / 1000}K` : a}
      </motion.button>
    ))}</div>
  );
}
