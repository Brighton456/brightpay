import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowRight, Wallet, Link2, Settings, FileText, CreditCard, ShieldCheck, Gift, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SearchResult { id: string; title: string; subtitle: string; icon: any; path: string; }

const staticPages = [
  { title: "Dashboard", path: "/dashboard", icon: Zap },
  { title: "Transactions", path: "/transactions", icon: ArrowRight },
  { title: "Deposit", path: "/deposit", icon: Wallet },
  { title: "Endpoints", path: "/endpoints", icon: Link2 },
  { title: "Bulk Pay", path: "/bulk-pay", icon: CreditCard },
  { title: "Settings", path: "/settings", icon: Settings },
  { title: "KYC Verification", path: "/kyc", icon: ShieldCheck },
  { title: "Referral Program", path: "/referral", icon: Gift },
  { title: "Documentation", path: "/docs", icon: FileText },
  { title: "Pricing", path: "/pricing", icon: CreditCard },
];

export default function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !user) { setResults([]); return; }
    setLoading(true);
    const lq = q.toLowerCase();
    const hits: SearchResult[] = [];

    // Static pages
    staticPages.forEach((p) => {
      if (p.title.toLowerCase().includes(lq)) hits.push({ id: p.path, title: p.title, subtitle: "Page", icon: p.icon, path: p.path });
    });

    // Transactions
    const { data: txs } = await supabase.from("transactions").select("id, external_reference, phone, amount, type, status").eq("user_id", user.id).or(`external_reference.ilike.%${q}%,phone.ilike.%${q}%`).limit(5);
    (txs || []).forEach((tx: any) => hits.push({ id: tx.id, title: tx.external_reference || tx.id.slice(0, 8), subtitle: `KES ${Number(tx.amount).toLocaleString()} — ${tx.type}`, icon: Wallet, path: "/transactions" }));

    // Endpoints
    const { data: eps } = await supabase.from("endpoints").select("id, name, api_key").eq("user_id", user.id).ilike("name", `%${q}%`).limit(3);
    (eps || []).forEach((ep: any) => hits.push({ id: ep.id, title: ep.name, subtitle: "Endpoint", icon: Link2, path: "/endpoints" }));

    setResults(hits.slice(0, 8));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => { if (open) { setTimeout(() => inputRef.current?.focus(), 100); setQuery(""); setResults([]); } }, [open]);
  useEffect(() => { const t = setTimeout(() => search(query), 300); return () => clearTimeout(t); }, [query, search]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors">
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline text-[10px] bg-background border border-border rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-foreground/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[101] w-full max-w-lg">
              <div className="rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 border-b border-border">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transactions, endpoints, pages..." className="flex-1 py-3 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground" />
                  <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {loading && <p className="text-center text-xs text-muted-foreground py-4">Searching...</p>}
                  {!loading && query && results.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No results found</p>}
                  {!loading && results.map((r) => (
                    <button key={r.id} onClick={() => { navigate(r.path); setOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><r.icon className="w-4 h-4 text-primary" /></div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{r.title}</p><p className="text-xs text-muted-foreground truncate">{r.subtitle}</p></div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                  {!query && (
                    <div className="text-center py-4">
                      <p className="text-xs text-muted-foreground">Type to search across transactions, endpoints, and pages</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
