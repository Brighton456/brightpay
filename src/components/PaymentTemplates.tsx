import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bookmark, Plus, Trash2, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface Template { id: string; name: string; amount: number; phone: string; reference: string; }

const STORAGE_KEY = "brightpay-templates";

function loadTemplates(): Template[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveTemplates(t: Template[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); }

interface Props { onUse: (phone: string, amount: number, reference: string) => void; }

export default function PaymentTemplates({ onUse }: Props) {
  const [templates, setTemplates] = useState<Template[]>(loadTemplates);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");

  const addTemplate = () => {
    if (!name || !amount) return;
    const t: Template = { id: Date.now().toString(), name, amount: Number(amount), phone, reference };
    const next = [t, ...templates];
    setTemplates(next);
    saveTemplates(next);
    setName(""); setAmount(""); setPhone(""); setReference(""); setShowForm(false);
  };

  const removeTemplate = (id: string) => {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next);
    saveTemplates(next);
  };

  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold flex items-center gap-2"><Bookmark className="w-5 h-5 text-primary" /> Saved Templates</CardTitle>
        <Button size="sm" variant="outline" className="btn-press" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> New</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-primary/20 bg-primary/5">
            <Input placeholder="Name (e.g. Office Rent)" value={name} onChange={(e) => setName(e.target.value)} className="text-xs" />
            <Input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-xs" />
            <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} className="text-xs" />
            <Input placeholder="Reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} className="text-xs" />
            <div className="col-span-2 flex gap-2">
              <Button size="sm" className="gradient-primary text-primary-foreground btn-press" onClick={addTemplate}>Save Template</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </motion.div>
        )}
        {templates.length === 0 && !showForm && <p className="text-xs text-muted-foreground text-center py-4">No templates saved. Create one for quick payments.</p>}
        {templates.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Zap className="w-4 h-4 text-primary" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">KES {t.amount.toLocaleString()}{t.phone ? ` · ${t.phone}` : ""}</p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" className="h-7 text-xs gradient-primary text-primary-foreground btn-press" onClick={() => onUse(t.phone, t.amount, t.reference)}>Use</Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => removeTemplate(t.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
