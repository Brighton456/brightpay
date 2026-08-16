import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Loader2 } from "lucide-react";

export default function AdminCards() {
  const { toast } = useToast();
  const [cards, setCards] = useState<any[]>([]);
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("virtual_cards")
      .select("id, type, cardholder_name, last4, status, balance_usd, credit_limit_usd, credit_used_usd, user_id, created_at, profiles!virtual_cards_user_id_fkey(full_name, phone)" as any)
      .order("created_at", { ascending: false });
    setCards(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (id: string) => {
    const val = Number(limits[id]);
    if (!Number.isFinite(val) || val < 0) return toast({ title: "Invalid limit", variant: "destructive" });
    setSaving(id);
    const { error } = await supabase.rpc("admin_set_card_limit", { p_card_id: id, p_limit_usd: val });
    setSaving(null);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Limit updated" });
    load();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Virtual Cards</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : cards.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No cards issued yet</p>
        ) : (
          <div className="space-y-3">
            {cards.map((c) => (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border">
                <div className="flex-1">
                  <p className="font-medium text-sm">{c.cardholder_name} <Badge variant="outline" className="ml-1">{c.type}</Badge> <Badge variant="secondary" className="ml-1 capitalize">{c.status}</Badge></p>
                  <p className="text-xs text-muted-foreground">•••• {c.last4} • {(c as any).profiles?.full_name || "—"} • {(c as any).profiles?.phone || ""}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.type === "prepaid"
                      ? `Balance $${Number(c.balance_usd).toFixed(2)}`
                      : `Limit $${Number(c.credit_limit_usd).toFixed(2)} • Used $${Number(c.credit_used_usd).toFixed(2)}`}
                  </p>
                </div>
                {c.type === "postpaid" && (
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number" step="0.01" min="0" placeholder="Limit (USD)"
                      className="w-32 h-9"
                      value={limits[c.id] ?? c.credit_limit_usd}
                      onChange={(e) => setLimits({ ...limits, [c.id]: e.target.value })}
                    />
                    <Button size="sm" onClick={() => save(c.id)} disabled={saving === c.id}>
                      {saving === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
