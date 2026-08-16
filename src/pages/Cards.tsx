import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CreditCard as CardIcon, Eye, EyeOff, Snowflake, Play, Trash2, Plus, Copy, Wifi, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface VCard {
  id: string;
  type: "prepaid" | "postpaid";
  brand: string;
  masked_pan: string | null;
  last4: string | null;
  expiry_month: string | null;
  expiry_year: string | null;
  cardholder_name: string;
  status: "active" | "frozen" | "terminated" | "pending";
  balance_usd: number;
  credit_limit_usd: number;
  credit_used_usd: number;
  design: string;
  currency: string;
}

const DESIGN_GRADIENTS: Record<string, string> = {
  aurora: "linear-gradient(135deg, #667eea 0%, #764ba2 55%, #f093fb 100%)",
  midnight: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
  emerald: "linear-gradient(135deg, #065f46 0%, #10b981 60%, #34d399 100%)",
  sunset: "linear-gradient(135deg, #dc2626 0%, #f97316 50%, #fbbf24 100%)",
  royal: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 55%, #7c3aed 100%)",
};

function CardVisual({ card, reveal }: { card: VCard; reveal?: { pan: string; cvv: string; expiry: string; name: string } | null }) {
  const brand = (card.brand || "visa").toLowerCase();
  const displayPan = reveal?.pan
    ? reveal.pan.replace(/(.{4})/g, "$1 ").trim()
    : `•••• •••• •••• ${card.last4 || "••••"}`;
  const displayExp = reveal?.expiry || `${card.expiry_month || "••"}/${card.expiry_year?.toString().slice(-2) || "••"}`;
  const displayCvv = reveal?.cvv || "•••";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative aspect-[1.586/1] w-full max-w-md rounded-2xl p-5 sm:p-6 text-white shadow-2xl overflow-hidden"
      style={{ background: DESIGN_GRADIENTS[card.design] || DESIGN_GRADIENTS.aurora }}
    >
      <div className="absolute inset-0 opacity-20 mix-blend-overlay"
           style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3), transparent 40%)" }} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest opacity-70">BrightPay</p>
          <p className="text-xs font-medium opacity-90 mt-0.5">{card.type === "prepaid" ? "Prepaid" : "Postpaid"} • {card.currency}</p>
        </div>
        <Wifi className="w-6 h-6 rotate-90 opacity-80" />
      </div>
      <div className="relative mt-8 sm:mt-10">
        <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500 opacity-90 mb-4" />
        <p className="font-mono text-lg sm:text-xl tracking-widest drop-shadow-md">{displayPan}</p>
      </div>
      <div className="relative flex justify-between items-end mt-4 sm:mt-5">
        <div>
          <p className="text-[9px] uppercase tracking-wider opacity-70">Cardholder</p>
          <p className="text-xs sm:text-sm font-semibold uppercase truncate max-w-[180px]">{reveal?.name || card.cardholder_name}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider opacity-70">Expires</p>
          <p className="text-xs sm:text-sm font-mono">{displayExp}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider opacity-70">CVV</p>
          <p className="text-xs sm:text-sm font-mono">{displayCvv}</p>
        </div>
        <p className="text-lg sm:text-xl font-black italic tracking-tight">{brand === "mastercard" ? "MC" : "VISA"}</p>
      </div>
      {card.status !== "active" && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <Badge variant="destructive" className="text-sm uppercase">{card.status}</Badge>
        </div>
      )}
    </motion.div>
  );
}

export default function Cards() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<VCard[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openFund, setOpenFund] = useState<VCard | null>(null);
  const [reveal, setReveal] = useState<Record<string, any>>({});
  const [fx, setFx] = useState({ rate: 135, markup: 2.5, fee: 300 });

  const [form, setForm] = useState({ type: "prepaid" as "prepaid" | "postpaid", cardholder_name: "", initial_fund_usd: "5", design: "aurora" });
  const [fundAmt, setFundAmt] = useState("5");

  const load = async () => {
    setLoading(true);
    const { data: cs } = await supabase.from("virtual_cards").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    const { data: t } = await supabase.from("card_transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50);
    const { data: ps } = await supabase.from("platform_settings").select("*").in("key", ["fx_kes_per_usd", "card_fx_markup_pct", "card_creation_fee_kes"]);
    const m: any = {}; ps?.forEach((r: any) => m[r.key] = r.value);
    setFx({ rate: Number(m.fx_kes_per_usd || 135), markup: Number(m.card_fx_markup_pct || 2.5), fee: Number(m.card_creation_fee_kes || 300) });
    setCards((cs || []) as any);
    setTxs(t || []);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("cards-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "virtual_cards", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "card_transactions", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const usdToKes = (usd: number) => Math.round(usd * fx.rate * (1 + fx.markup / 100));

  const createCard = async () => {
    if (!form.cardholder_name.trim()) return toast({ title: "Cardholder name required", variant: "destructive" });
    setBusy("create");
    const { data, error } = await supabase.functions.invoke("card-create", { body: form });
    setBusy(null);
    if (error || (data as any)?.error) {
      toast({ title: "Card creation failed", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Card issued!", description: "Your virtual card is ready to use." });
    setOpenCreate(false);
    load();
  };

  const doAction = async (card: VCard, action: string, extra: any = {}) => {
    setBusy(card.id + action);
    const { data, error } = await supabase.functions.invoke("card-action", { body: { card_id: card.id, action, ...extra } });
    setBusy(null);
    if (error || (data as any)?.error) {
      toast({ title: `${action} failed`, description: (data as any)?.error || error?.message, variant: "destructive" });
      return null;
    }
    if (action !== "reveal") toast({ title: `Card ${action} successful` });
    if (action !== "reveal") load();
    return data;
  };

  const fundCard = async () => {
    const amt = Number(fundAmt);
    if (!amt || amt <= 0) return toast({ title: "Enter a valid amount", variant: "destructive" });
    if (!openFund) return;
    const r = await doAction(openFund, "fund", { amount_usd: amt });
    if (r) setOpenFund(null);
  };

  const toggleReveal = async (card: VCard) => {
    if (reveal[card.id]) {
      setReveal((r) => { const n = { ...r }; delete n[card.id]; return n; });
      return;
    }
    const d: any = await doAction(card, "reveal");
    if (d?.ok) setReveal((r) => ({ ...r, [card.id]: d }));
  };

  const copy = (t: string, label: string) => { navigator.clipboard.writeText(t); toast({ title: `${label} copied` }); };

  const canIssue = profile?.account_status === "active" && profile?.kyc_status === "approved" && !profile?.banned;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><CardIcon className="w-7 h-7 text-primary" /> Virtual Cards</h1>
            <p className="text-muted-foreground text-sm mt-1">USD Visa/Mastercard cards for online payments, subscriptions & shopping</p>
          </div>
          <Button className="gradient-primary text-primary-foreground" onClick={() => setOpenCreate(true)} disabled={!canIssue}>
            <Plus className="w-4 h-4 mr-2" /> New Card
          </Button>
        </div>

        {!canIssue && (
          <Card className="border-amber/40 bg-amber/5">
            <CardContent className="pt-6 text-sm">
              To issue a card, your account must be <b>KYC-approved and active</b>. Complete KYC and activation to unlock virtual cards.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-muted-foreground text-xs">FX Rate</p><p className="font-semibold">1 USD ≈ KES {fx.rate}</p></div>
            <div><p className="text-muted-foreground text-xs">FX Markup</p><p className="font-semibold">{fx.markup}%</p></div>
            <div><p className="text-muted-foreground text-xs">Issuance Fee</p><p className="font-semibold">KES {fx.fee}</p></div>
            <div><p className="text-muted-foreground text-xs">Fund $10 costs</p><p className="font-semibold">KES {usdToKes(10)}</p></div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : cards.length === 0 ? (
          <Card><CardContent className="pt-6 text-center py-12">
            <CardIcon className="w-14 h-14 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold">No cards yet</p>
            <p className="text-sm text-muted-foreground">Issue your first virtual card to start paying online</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {cards.map((c) => {
              const r = reveal[c.id];
              return (
                <Card key={c.id} className="overflow-hidden">
                  <CardContent className="pt-6 space-y-4">
                    <CardVisual card={c} reveal={r} />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {c.type === "prepaid" ? (
                        <div><p className="text-xs text-muted-foreground">Balance</p><p className="font-bold text-lg">${Number(c.balance_usd).toFixed(2)}</p></div>
                      ) : (
                        <>
                          <div><p className="text-xs text-muted-foreground">Credit Limit</p><p className="font-bold">${Number(c.credit_limit_usd).toFixed(2)}</p></div>
                          <div><p className="text-xs text-muted-foreground">Used</p><p className="font-bold text-amber">${Number(c.credit_used_usd).toFixed(2)}</p></div>
                        </>
                      )}
                      <div><p className="text-xs text-muted-foreground">Status</p><Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize">{c.status}</Badge></div>
                    </div>
                    {r && (
                      <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between items-center"><span>PAN: {r.pan}</span><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(r.pan, "Card number")}><Copy className="w-3 h-3" /></Button></div>
                        <div className="flex justify-between items-center"><span>CVV: {r.cvv}</span><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(r.cvv, "CVV")}><Copy className="w-3 h-3" /></Button></div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggleReveal(c)} disabled={c.status === "terminated" || busy === c.id + "reveal"}>
                        {busy === c.id + "reveal" ? <Loader2 className="w-4 h-4 animate-spin" /> : r ? <><EyeOff className="w-4 h-4 mr-1" /> Hide</> : <><Eye className="w-4 h-4 mr-1" /> Reveal</>}
                      </Button>
                      {c.type === "prepaid" && (
                        <Button size="sm" onClick={() => { setFundAmt("5"); setOpenFund(c); }} disabled={c.status !== "active"}>
                          <Plus className="w-4 h-4 mr-1" /> Fund
                        </Button>
                      )}
                      {c.status === "active" ? (
                        <Button size="sm" variant="outline" onClick={() => doAction(c, "freeze")}><Snowflake className="w-4 h-4 mr-1" /> Freeze</Button>
                      ) : c.status === "frozen" ? (
                        <Button size="sm" variant="outline" onClick={() => doAction(c, "unfreeze")}><Play className="w-4 h-4 mr-1" /> Unfreeze</Button>
                      ) : null}
                      {c.status !== "terminated" && (
                        <Button size="sm" variant="destructive" onClick={() => { if (confirm("Permanently terminate this card? This cannot be undone.")) doAction(c, "terminate"); }}>
                          <Trash2 className="w-4 h-4 mr-1" /> Terminate
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {txs.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Card Activity</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {txs.map((t) => (
                  <div key={t.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                    <div>
                      <p className="font-medium capitalize">{t.kind} {t.merchant ? `— ${t.merchant}` : ""}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${Number(t.amount_usd).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">KES {Number(t.amount_kes).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue New Virtual Card</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Card Type</Label>
              <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prepaid">Prepaid — fund upfront from income wallet</SelectItem>
                  <SelectItem value="postpaid">Postpaid — spend now, settle from income wallet (admin sets limit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cardholder Name</Label>
              <Input value={form.cardholder_name} onChange={(e) => setForm({ ...form, cardholder_name: e.target.value })} placeholder="As it should appear on the card" />
            </div>
            <div>
              <Label>Design</Label>
              <Select value={form.design} onValueChange={(v) => setForm({ ...form, design: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(DESIGN_GRADIENTS).map((k) => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.type === "prepaid" && (
              <div>
                <Label>Initial Fund (USD)</Label>
                <Input type="number" step="0.01" min="2" value={form.initial_fund_usd} onChange={(e) => setForm({ ...form, initial_fund_usd: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">
                  Total debit: <b>KES {(fx.fee + usdToKes(Number(form.initial_fund_usd || 0))).toLocaleString()}</b> from income wallet
                  (KES {fx.fee} issuance + KES {usdToKes(Number(form.initial_fund_usd || 0)).toLocaleString()} for ${form.initial_fund_usd || 0})
                </p>
              </div>
            )}
            {form.type === "postpaid" && (
              <p className="text-xs text-muted-foreground">Issuance fee <b>KES {fx.fee}</b> will be debited. Credit limit is set by the admin after issuance.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button onClick={createCard} disabled={busy === "create"} className="gradient-primary text-primary-foreground">
              {busy === "create" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Issue Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fund dialog */}
      <Dialog open={!!openFund} onOpenChange={(o) => !o && setOpenFund(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fund Card</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Amount (USD)</Label>
              <Input type="number" step="0.01" min="1" value={fundAmt} onChange={(e) => setFundAmt(e.target.value)} />
            </div>
            <p className="text-sm">
              Debit from income wallet: <b>KES {usdToKes(Number(fundAmt || 0)).toLocaleString()}</b>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenFund(null)}>Cancel</Button>
            <Button onClick={fundCard} disabled={busy?.endsWith("fund")} className="gradient-primary text-primary-foreground">
              {busy?.endsWith("fund") ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Fund Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
