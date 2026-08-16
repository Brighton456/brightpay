import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Percent } from "lucide-react";

export default function ProviderFees() {
  const [rows, setRows] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, any>>({});
  const { toast } = useToast();

  const fetchRows = async () => {
    const { data } = await supabase.from("provider_fees" as any).select("*").order("provider");
    setRows((data as any[]) || []);
    const map: Record<string, any> = {};
    (data as any[] || []).forEach(r => { map[r.provider] = { ...r }; });
    setEdits(map);
  };
  useEffect(() => { fetchRows(); }, []);

  const save = async (provider: string) => {
    const r = edits[provider];
    const { error } = await supabase.from("provider_fees" as any).update({
      deposit_cost_pct: Number(r.deposit_cost_pct),
      deposit_fee_pct: Number(r.deposit_fee_pct),
      withdrawal_cost_pct: Number(r.withdrawal_cost_pct),
      withdrawal_fee_pct: Number(r.withdrawal_fee_pct),
      enabled: !!r.enabled,
      updated_at: new Date().toISOString(),
    }).eq("provider", provider);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved", description: `${provider} fees updated` });
    fetchRows();
  };

  const update = (p: string, k: string, v: any) => setEdits(prev => ({ ...prev, [p]: { ...prev[p], [k]: v } }));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><Percent className="w-5 h-5" /> Per-Provider Fees</h2>
      <p className="text-xs text-muted-foreground">Profit per transaction = fee% − cost%. Applied to all amounts for the selected provider.</p>
      <div className="grid lg:grid-cols-3 gap-3">
        {rows.map(r => {
          const e = edits[r.provider] || r;
          return (
            <Card key={r.provider}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm capitalize">{r.provider}</CardTitle>
                <Switch checked={!!e.enabled} onCheckedChange={(v) => update(r.provider, "enabled", v)} />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[10px] text-muted-foreground">Deposit cost %</label><Input type="number" value={e.deposit_cost_pct} onChange={(ev) => update(r.provider, "deposit_cost_pct", ev.target.value)} /></div>
                  <div><label className="text-[10px] text-muted-foreground">Deposit fee %</label><Input type="number" value={e.deposit_fee_pct} onChange={(ev) => update(r.provider, "deposit_fee_pct", ev.target.value)} /></div>
                  <div><label className="text-[10px] text-muted-foreground">Withdraw cost %</label><Input type="number" value={e.withdrawal_cost_pct} onChange={(ev) => update(r.provider, "withdrawal_cost_pct", ev.target.value)} /></div>
                  <div><label className="text-[10px] text-muted-foreground">Withdraw fee %</label><Input type="number" value={e.withdrawal_fee_pct} onChange={(ev) => update(r.provider, "withdrawal_fee_pct", ev.target.value)} /></div>
                </div>
                <div className="text-[10px] text-emerald-600">
                  Profit: deposit {Number(e.deposit_fee_pct) - Number(e.deposit_cost_pct)}% · withdraw {Number(e.withdrawal_fee_pct) - Number(e.withdrawal_cost_pct)}%
                </div>
                <Button size="sm" className="w-full" onClick={() => save(r.provider)}>Save</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
