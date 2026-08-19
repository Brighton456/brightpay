import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Keyboard, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
const shortcuts = [
  { key: "D", label: "Dashboard", path: "/dashboard" },
  { key: "T", label: "Transactions", path: "/transactions" },
  { key: "E", label: "Endpoints", path: "/endpoints" },
  { key: "W", label: "Withdraw", path: "/withdraw" },
  { key: "S", label: "Settings", path: "/settings" },
  { key: "?", label: "Show shortcuts", path: "" },
];
export default function KeyboardShortcuts() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "?") { e.preventDefault(); setShow(true); return; }
      const s = shortcuts.find((s) => s.key.toLowerCase() === e.key.toLowerCase() && s.path);
      if (s) { e.preventDefault(); navigate(s.path); setShow(false); }
      if (e.key === "Escape") setShow(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-foreground/30 backdrop-blur-sm" onClick={() => setShow(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-80 rounded-2xl bg-card border border-border shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2"><Keyboard className="w-4 h-4 text-primary" /> Keyboard Shortcuts</h3>
              <button onClick={() => setShow(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="space-y-2">{shortcuts.filter((s) => s.path).map((s) => (
              <div key={s.key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{s.label}</span>
                <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-foreground">{s.key.toUpperCase()}</kbd>
              </div>
            ))}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
