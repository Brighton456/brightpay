import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export default function BillSplitter() {
  const [total, setTotal] = useState("");
  const [people, setPeople] = useState<string[]>(["", ""]);
  const [splitResult, setSplitResult] = useState<number | null>(null);

  const addPerson = () => setPeople([...people, ""]);
  const removePerson = (i: number) => { if (people.length > 2) setPeople(people.filter((_, idx) => idx !== i)); };
  const updatePerson = (i: number, v: string) => { const next = [...people]; next[i] = v; setPeople(next); };

  const split = () => {
    const t = Number(total);
    if (!t || t <= 0) { toast.error("Enter a valid total amount"); return; }
    const valid = people.filter((p) => p.trim());
    if (valid.length < 2) { toast.error("Enter at least 2 people"); return; }
    setSplitResult(Math.ceil(t / valid.length));
  };

  const copyAmounts = () => {
    if (!splitResult) return;
    const text = people.filter((p) => p.trim()).map((p) => `${p}: KES ${splitResult.toLocaleString()}`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Bill Splitter</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Total Bill (KES)</p>
          <Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Enter total amount" className="text-sm" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">People</p>
          {people.map((p, i) => (
            <div key={i} className="flex gap-2">
              <Input value={p} onChange={(e) => updatePerson(i, e.target.value)} placeholder={`Person ${i + 1}`} className="text-xs flex-1" />
              <Button size="icon" variant="ghost" className="h-9 w-9 flex-shrink-0" onClick={() => removePerson(i)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="btn-press" onClick={addPerson}><Plus className="w-3 h-3 mr-1" /> Add Person</Button>
        </div>
        <Button className="w-full gradient-primary text-primary-foreground btn-press" onClick={split}>Split Bill</Button>
        {splitResult !== null && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
            <p className="text-2xl font-black text-foreground">KES {splitResult.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">per person ({people.filter((p) => p.trim()).length} people)</p>
            <Button size="sm" variant="ghost" className="mt-2 text-xs btn-press" onClick={copyAmounts}><Copy className="w-3 h-3 mr-1" /> Copy split</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
