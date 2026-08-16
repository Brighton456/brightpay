import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Radio, Plus, CheckCircle2, Clock, XCircle, Trash2, Building2,
  CreditCard, Store, Zap, Shield, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const KENYAN_BANKS = [
  { name: "KCB Bank", code: "522522" },
  { name: "Equity Bank", code: "247247" },
  { name: "Co-operative Bank", code: "400200" },
  { name: "ABSA Bank Kenya", code: "303030" },
  { name: "Standard Chartered", code: "329329" },
  { name: "Stanbic Bank", code: "600100" },
  { name: "Diamond Trust Bank", code: "516516" },
  { name: "I&M Bank", code: "542542" },
  { name: "NCBA Bank", code: "880880" },
  { name: "Family Bank", code: "222111" },
  { name: "National Bank", code: "625625" },
  { name: "Prime Bank", code: "900700" },
  { name: "Bank of Africa", code: "972900" },
  { name: "Sidian Bank", code: "300300" },
  { name: "Victoria Commercial Bank", code: "523523" },
  { name: "Guardian Bank", code: "301301" },
  { name: "Gulf African Bank", code: "985050" },
  { name: "First Community Bank", code: "765765" },
  { name: "Credit Bank", code: "600600" },
  { name: "Consolidated Bank", code: "700700" },
  { name: "Development Bank of Kenya", code: "800800" },
  { name: "Ecobank Kenya", code: "800900" },
  { name: "Spire Bank", code: "900800" },
  { name: "Middle East Bank", code: "700600" },
  { name: "Mayfair CIB Bank", code: "901901" },
  { name: "Kingdom Bank", code: "800700" },
  { name: "Access Bank", code: "900300" },
  { name: "UBA Kenya", code: "900400" },
  { name: "M-Oriental Bank", code: "900200" },
  { name: "DIB Bank Kenya", code: "600200" },
];

const channelTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
  till: { icon: Store, label: "Till Number", color: "from-emerald-500 to-emerald-600" },
  paybill: { icon: CreditCard, label: "Paybill", color: "from-blue-500 to-blue-600" },
  bank: { icon: Building2, label: "Bank Account", color: "from-purple-500 to-purple-600" },
};

export default function ChannelsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", type: "till", business_number: "", account_number: "", bank_name: "", bank_code: "" });

  useEffect(() => { if (user) fetchChannels(); }, [user]);

  const fetchChannels = async () => {
    if (!user) return;
    const { data } = await supabase.from("channels").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setChannels((data as any[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !form.name || !form.business_number) return;
    setCreating(true);
    const { error } = await supabase.from("channels").insert({
      user_id: user.id, name: form.name, channel_type: form.type,
      business_number: form.business_number, account_number: form.account_number || null,
      bank_name: form.type === "bank" ? form.bank_name : null,
      bank_code: form.type === "bank" ? form.bank_code : null,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Channel submitted for review! 🎉", description: "An admin will review and approve your channel." });
      setForm({ name: "", type: "till", business_number: "", account_number: "", bank_name: "", bank_code: "" });
      fetchChannels();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("channels").delete().eq("id", id);
    toast({ title: "Channel deleted" });
    fetchChannels();
  };

  if (profile?.account_status !== "active") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Radio className="w-16 h-16 text-primary/30 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Active Account Required</h2>
          <p className="text-sm text-muted-foreground mb-4">Upgrade to an Active account to create custom payment channels</p>
          <Button onClick={() => window.location.href = "/settings"} className="gradient-primary text-primary-foreground">Upgrade Account</Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusIcon: Record<string, JSX.Element> = {
    active: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    approved: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    pending: <Clock className="w-4 h-4 text-amber-500" />,
    rejected: <XCircle className="w-4 h-4 text-destructive" />,
  };

  return (
    <DashboardLayout>
      {/* Hero */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-none -mx-3 sm:-mx-4 lg:-mx-6 sm:rounded-[2rem] sm:mx-0 gradient-hero p-5 sm:p-8 text-secondary-foreground mb-6">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary mb-4">
            <Radio className="w-3.5 h-3.5" /> Payment Channels
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Payment Channels</h1>
          <p className="max-w-xl text-sm text-secondary-foreground/70 leading-relaxed">
            Route payments to different destinations — Till numbers, Paybills, or Bank accounts. Each channel requires admin approval.
          </p>
        </div>
      </motion.section>

      <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 mb-6 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Default Channel Active</p>
          <p className="text-xs text-muted-foreground">Your payments are routed through the platform's default channel. Create custom channels below to route to your own destinations.</p>
        </div>
      </div>

      {/* Header + Create */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Radio className="w-5 h-5 text-primary" /> Your Channels</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground btn-press"><Plus className="w-4 h-4 mr-2" /> New Channel</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Create Payment Channel</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Channel Name *</Label><Input placeholder="e.g. My Business Till" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
              <div><Label>Channel Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, bank_name: "", bank_code: "" })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="till">Till Number</SelectItem>
                    <SelectItem value="paybill">Paybill</SelectItem>
                    <SelectItem value="bank">Bank Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{form.type === "till" ? "Till Number *" : form.type === "paybill" ? "Paybill Number *" : "Bank Paybill *"}</Label>
                <Input placeholder={form.type === "till" ? "e.g. 123456" : form.type === "paybill" ? "e.g. 400200" : "Bank paybill number"}
                  value={form.business_number} onChange={(e) => setForm({ ...form, business_number: e.target.value })} className="mt-1" />
              </div>
              {(form.type === "paybill" || form.type === "bank") && (
                <div><Label>Account Number *</Label><Input placeholder="Your account number" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} className="mt-1" /></div>
              )}
              {form.type === "bank" && (
                <div><Label>Select Bank *</Label>
                  <Select value={form.bank_name} onValueChange={(v) => {
                    const bank = KENYAN_BANKS.find(b => b.name === v);
                    setForm({ ...form, bank_name: v, bank_code: bank?.code || "", business_number: bank?.code || "" });
                  }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Choose bank..." /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {KENYAN_BANKS.map(b => <SelectItem key={b.name} value={b.name}>{b.name} ({b.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 mb-1"><AlertTriangle className="w-3.5 h-3.5" /> Review Required</div>
                <p className="text-[10px] text-muted-foreground">Your channel will be reviewed and approved by an admin. You'll be notified once approved.</p>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleCreate} disabled={creating || !form.name || !form.business_number || (form.type === "bank" && !form.bank_name)}
                className="gradient-primary text-primary-foreground">{creating ? "Submitting..." : "Submit Channel"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Channels List */}
      {loading ? (
        <Card className="rounded-2xl"><CardContent className="p-12 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></CardContent></Card>
      ) : channels.length === 0 ? (
        <Card className="rounded-2xl"><CardContent className="p-12 text-center text-muted-foreground">
          <Radio className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-foreground">No custom channels yet</p>
          <p className="text-sm">Your payments use the default platform channel. Create a custom one to route payments elsewhere.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {channels.map((ch, i) => {
            const typeConf = channelTypeConfig[ch.channel_type] || channelTypeConfig.till;
            const TypeIcon = typeConf.icon;
            return (
              <motion.div key={ch.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="rounded-2xl border-border/60 hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${typeConf.color} flex items-center justify-center flex-shrink-0`}>
                        <TypeIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-foreground">{ch.name}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{typeConf.label}</span>
                          {ch.is_default && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Default</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span className="font-mono">{ch.business_number}</span>
                          {ch.account_number && <><span>•</span><span>Acc: {ch.account_number}</span></>}
                          {ch.bank_name && <><span>•</span><span>{ch.bank_name}</span></>}
                        </div>
                        {ch.swiftwallet_channel_id && (
                          <p className="text-[10px] text-primary font-mono mt-1">Channel ID: {ch.swiftwallet_channel_id}</p>
                        )}
                        {ch.admin_notes && <p className="text-[10px] text-muted-foreground mt-1 italic">Note: {ch.admin_notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          {statusIcon[ch.status] || statusIcon.pending}
                          <span className={`text-xs font-semibold capitalize ${ch.status === "approved" || ch.status === "active" ? "text-emerald-500" : ch.status === "pending" ? "text-amber-500" : "text-destructive"}`}>{ch.status}</span>
                        </div>
                        {ch.status === "pending" && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(ch.id)}><Trash2 className="w-4 h-4" /></Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
