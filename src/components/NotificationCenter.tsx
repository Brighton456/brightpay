import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X, ArrowDownRight, ArrowUpRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Notification { id: string; title: string; body: string; type: string; read: boolean; created_at: string; }

export default function NotificationCenter({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!userId) return;
    // Seed from recent transactions
    const load = async () => {
      const { data: txs } = await supabase.from("transactions").select("id, type, amount, status, external_reference, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10);
      const notifs: Notification[] = (txs || []).map((tx: any) => ({
        id: tx.id,
        title: tx.status === "completed" ? "Payment Completed" : tx.status === "failed" ? "Payment Failed" : "Payment Pending",
        body: `KES ${Number(tx.amount).toLocaleString()} ${tx.type} — ${tx.external_reference || tx.type}`,
        type: tx.type,
        read: false,
        created_at: tx.created_at,
      }));
      setNotifications(notifs.slice(0, 8));
    };
    load();
  }, [userId]);

  const markRead = (id: string) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const clearAll = () => setNotifications([]);

  const icon = (type: string) => {
    if (type === "withdrawal") return <ArrowUpRight className="w-4 h-4 text-amber" />;
    if (type === "transfer") return <Zap className="w-4 h-4 text-indigo" />;
    return <ArrowDownRight className="w-4 h-4 text-emerald" />;
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-[9px] text-white flex items-center justify-center font-bold">{unread}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute right-0 top-12 z-[91] w-80 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                <div className="flex gap-1">
                  {unread > 0 && <Button size="sm" variant="ghost" className="text-xs h-7" onClick={markAllRead}><Check className="w-3 h-3 mr-1" /> Read all</Button>}
                  <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={clearAll}><X className="w-3 h-3" /></Button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">No notifications</p>
                ) : notifications.map((n) => (
                  <button key={n.id} onClick={() => markRead(n.id)} className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 ${!n.read ? "bg-primary/5" : ""}`}>
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">{icon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{n.body}</p>
                      <p className="text-[9px] text-muted-foreground/60 mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
