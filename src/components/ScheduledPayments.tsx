import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarClock, Plus, Trash2, Play } from "lucide-react";
import { toast } from "sonner";
const KEY = "bp-scheduled";
interface Sched { id: string; phone: string; amount: number; time: string; active: boolean; }
export default function ScheduledPayments() {
  const [items, setItems] = useState<Sched[]>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } });
  const [phone, setPhone] = useState(""); const [amount, setAmount] = useState(""); const [time, setTime] = useState("09:00");
  const save = (s: Sched[]) => { setItems(s); localStorage.setItem(KEY, JSON.stringify(s)); };
  const add = () => { if (!phone || !amount) return; save([{ id: Date.now().toString(), phone, amount: Number(amount), time, active: true }, ...items]); setPhone(""); setAmount(""); toast.success("Payment scheduled"); };
  const toggle = (id: string) => save(items.map((i) => i.id === id ? { ...i, active: !i.active } : i));
  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><CalendarClock className="w-5 h-5 text-primary" /> Scheduled Payments</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="text-xs" />
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="text-xs" />
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="text-xs" />
        </div>
        <Button size="sm" className="w-full gradient-primary text-primary-foreground btn-press" onClick={add}><Plus className="w-3 h-3 mr-1" /> Schedule</Button>
        {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No scheduled payments</p>}
        {items.map((s) => (
          <div key={s.id} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${s.active ? "bg-primary/5 border border-primary/20" : "bg-muted/30 border border-border/50"}`}>
            <button onClick={() => toggle(s.id)} className={`w-7 h-4 rounded-full transition-colors flex items-center ${s.active ? "bg-primary justify-end" : "bg-muted-foreground/30 justify-start"}`}><div className="w-3 h-3 rounded-full bg-white mx-0.5" /></button>
            <span className="flex-1 font-mono">{s.phone}</span>
            <span className="font-bold">KES {s.amount.toLocaleString()}</span>
            <span className="text-muted-foreground">{s.time}</span>
            <button onClick={() => save(items.filter((i) => i.id !== s.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
