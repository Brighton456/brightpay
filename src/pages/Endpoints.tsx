import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Link2,
  Plus,
  Copy,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Code,
  AlertTriangle,
  Globe,
  Sparkles,
  CheckCircle2,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { buildCallbackUrl, DEFAULT_CALLBACK_PATH, getEndpointLimit, getSiteFromCallbackUrl, normalizeSiteUrl } from "@/lib/endpoint-utils";
import EndpointQR from "@/components/EndpointQR";
import PaymentLinkGenerator from "@/components/PaymentLinkGenerator";
import EndpointHealthBadge from "@/components/EndpointHealthBadge";
import EndpointUptimeCounter from "@/components/EndpointUptimeCounter";

export default function Endpoints() {
  const { user, profile } = useAuth();
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSiteUrl, setEditSiteUrl] = useState("");
  const [newWalletType, setNewWalletType] = useState<"income" | "service">("income");
  const [newChannelId, setNewChannelId] = useState<string>("");
  const [newIntegrationType, setNewIntegrationType] = useState<"platform" | "daraja_own">("platform");
  const [editWalletType, setEditWalletType] = useState<"income" | "service">("income");
  const [channels, setChannels] = useState<any[]>([]);
  const [showDaraja, setShowDaraja] = useState(false);
  const [darajaMeta, setDarajaMeta] = useState<any>(null);
  const [daraja, setDaraja] = useState<any>({
    environment: "sandbox", business_short_code: "", party_b: "",
    b2c_short_code: "", b2c_initiator_name: "",
    consumer_key: "", consumer_secret: "", passkey: "", b2c_security_credential: "",
    stk_enabled: true, b2c_enabled: false, c2b_enabled: false,
    test_phone: "",
  });
  const [darajaBusy, setDarajaBusy] = useState(false);
  const { toast } = useToast();


  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const endpointLimit = getEndpointLimit(profile?.account_status);
  const hasReachedLimit = endpointLimit !== Infinity && endpoints.length >= endpointLimit;
  const generatedCreateCallback = buildCallbackUrl(newSiteUrl);
  const generatedEditCallback = buildCallbackUrl(editSiteUrl);

  useEffect(() => {
    if (user) {
      fetchEndpoints();
      supabase.from("channels").select("*").eq("user_id", user.id).eq("status", "approved")
        .then(({ data }) => setChannels((data as any[]) || []));
      fetchDaraja();
    }
  }, [user]);

  const fetchEndpoints = async () => {
    const { data } = await supabase.from("endpoints").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    setEndpoints((data as any[]) || []);
  };

  const fetchDaraja = async () => {
    const { data } = await (supabase as any).from("user_daraja_credentials_public").select("*").eq("user_id", user!.id).maybeSingle();
    setDarajaMeta(data || null);
    if (data) {
      setDaraja((d: any) => ({
        ...d,
        environment: data.environment,
        business_short_code: data.business_short_code || "",
        party_b: data.party_b || "",
        b2c_short_code: data.b2c_short_code || "",
        b2c_initiator_name: data.b2c_initiator_name || "",
        stk_enabled: !!data.stk_enabled,
        b2c_enabled: !!data.b2c_enabled,
        c2b_enabled: !!data.c2b_enabled,
      }));
    }
  };

  const saveDaraja = async () => {
    setDarajaBusy(true);
    try {
      const payload: any = { ...daraja };
      // Only send secret fields if user entered them (so we don't wipe stored ones)
      ["consumer_key","consumer_secret","passkey","b2c_security_credential"].forEach(k => {
        if (!payload[k]) delete payload[k];
      });
      const { error } = await supabase.functions.invoke("daraja-save-credentials", { body: payload });
      if (error) throw error;
      toast({ title: "Daraja credentials saved" });
      await fetchDaraja();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setDarajaBusy(false); }
  };

  const testDaraja = async () => {
    setDarajaBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("daraja-test", { body: { test_phone: daraja.test_phone } });
      if (error) throw error;
      const ok = (data as any)?.ok;
      toast({
        title: ok ? "✅ Daraja test passed" : "⚠️ Daraja test issues",
        description: ok ? "Your credentials work. Endpoints can now use your own Daraja." : "Check the steps below and Safaricom dashboard.",
        variant: ok ? "default" : "destructive",
      });
      await fetchDaraja();
    } catch (e: any) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally { setDarajaBusy(false); }
  };


  if (profile?.account_status === "idle") {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto mt-12 text-center">
          <div className="w-20 h-20 rounded-full bg-amber/10 flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-10 h-10 text-amber" /></div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Endpoints Locked</h2>
          <p className="text-muted-foreground mb-6">Complete KYC verification to create payment endpoints.</p>
          <Button className="gradient-primary text-primary-foreground btn-press" onClick={() => window.location.href = "/kyc"}>Start KYC</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleCreate = async () => {
    if (!newName) return;
    if (hasReachedLimit) {
      toast({ title: "Endpoint limit reached", description: "Upgrade your account stage or package before creating more endpoints.", variant: "destructive" });
      return;
    }

    let callbackUrl: string;
    if (newSiteUrl.trim()) {
      const siteUrl = normalizeSiteUrl(newSiteUrl);
      const built = buildCallbackUrl(newSiteUrl);
      if (!siteUrl || !built) {
        toast({ title: "Invalid website link", description: "Enter a valid site URL such as https://your-site.com or leave it blank.", variant: "destructive" });
        return;
      }
      callbackUrl = built;
    } else {
      callbackUrl = JSON.stringify({ type: "endpoint", wallet_type: newWalletType, channel_id: newChannelId || null });
    }

    if (newIntegrationType === "daraja_own" && !darajaMeta?.verified) {
      toast({ title: "Own Daraja not verified", description: "Save & test your Daraja credentials first.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { error } = await (supabase as any).from("endpoints").insert({ user_id: user!.id, name: newName, callback_url: callbackUrl, integration_type: newIntegrationType });
      if (error) throw error;
      toast({ title: "🎉 Endpoint Created!", description: `${newName} is now ready. Payments will go to your ${newWalletType} wallet.` });
      setShowCreate(false);
      setNewName("");
      setNewSiteUrl("");
      setNewWalletType("income");
      setNewChannelId("");
      setNewIntegrationType("platform");
      fetchEndpoints();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("endpoints").delete().eq("id", id);
    toast({ title: "Endpoint deleted" });
    fetchEndpoints();
  };

  const handleUpdate = async (id: string) => {
    if (!editName) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }

    let callbackUrl: string;
    if (editSiteUrl.trim()) {
      const siteUrl = normalizeSiteUrl(editSiteUrl);
      const built = buildCallbackUrl(editSiteUrl);
      if (!siteUrl || !built) {
        toast({ title: "Invalid website link", description: "Enter a valid site URL or leave it blank.", variant: "destructive" });
        return;
      }
      callbackUrl = built;
    } else {
      callbackUrl = JSON.stringify({ type: "endpoint", wallet_type: editWalletType });
    }

    await supabase.from("endpoints").update({ name: editName, callback_url: callbackUrl }).eq("id", id);
    toast({ title: "Endpoint updated" });
    setEditingId(null);
    fetchEndpoints();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  return (
    <DashboardLayout>
      <div className="mb-6 rounded-[2rem] gradient-hero p-6 text-secondary-foreground">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Website Collections
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Payment Endpoints</h1>
            <p className="max-w-2xl text-sm text-secondary-foreground/75 leading-7">
              Just enter your website link and BrightPay prepares a clean callback destination for you automatically — no manual webhook path setup needed.
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-primary-foreground/10 bg-primary-foreground/10 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-secondary-foreground/55">Available Slots</div>
            <div className="text-3xl font-black mt-1">{endpointLimit === Infinity ? "∞" : Math.max(endpointLimit - endpoints.length, 0)}</div>
            <div className="text-xs text-secondary-foreground/65 mt-1">{endpointLimit === Infinity ? "Unlimited active endpoints" : `${endpoints.length}/${endpointLimit} in use`}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="rounded-[1.2rem] border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Auto callback path:</span> {DEFAULT_CALLBACK_PATH}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="btn-press" onClick={() => setShowDaraja(true)}>
            <Shield className="w-4 h-4 mr-2" /> Own Daraja
            {darajaMeta?.verified && <span className="ml-2 text-[10px] text-emerald font-semibold">✓ Verified</span>}
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground btn-press" disabled={hasReachedLimit}><Plus className="w-4 h-4 mr-2" /> New Endpoint</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Payment Endpoint</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Endpoint Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. My E-Commerce Store" value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Payment Wallet <span className="text-destructive">*</span></Label>
                <Select value={newWalletType} onValueChange={(v: "income" | "service") => setNewWalletType(v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income Wallet — For received payments</SelectItem>
                    <SelectItem value="service">Service Wallet — For service fees & costs</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Choose which wallet receives the collected payments.</p>
              </div>
              <div>
                <Label>Integration Route <span className="text-destructive">*</span></Label>
                <Select value={newIntegrationType} onValueChange={(v: "platform" | "daraja_own") => setNewIntegrationType(v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">BrightPay Platform (recommended)</SelectItem>
                    <SelectItem value="daraja_own" disabled={!darajaMeta?.verified}>
                      My Own Daraja {darajaMeta?.verified ? "✓" : "— set up first"}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Own Daraja routes STK/B2C through your Safaricom app at a reduced platform fee.</p>
              </div>
              {channels.length > 0 && newIntegrationType === "platform" && (
                <div>
                  <Label>Payment Channel <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Select value={newChannelId || "__none__"} onValueChange={(v) => setNewChannelId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Default channel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Default Channel</SelectItem>
                      {channels.map((ch: any) => (
                        <SelectItem key={ch.id} value={ch.id}>{ch.name} ({ch.channel_type}{ch.business_number ? ` — ${ch.business_number}` : ""})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Use your own approved channel for payments.</p>
                </div>
              )}
              <div>
                <Label>Website Link <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input placeholder="https://your-site.com" value={newSiteUrl} onChange={(e) => setNewSiteUrl(e.target.value)} className="mt-1.5" />
                <p className="text-xs text-muted-foreground mt-1">If provided, BrightPay generates a callback route automatically. Leave blank if not needed.</p>
              </div>
              {newSiteUrl.trim() && (
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1"><Globe className="w-3.5 h-3.5 text-primary" /> Generated callback URL</div>
                  <div className="text-xs text-muted-foreground break-all">{generatedCreateCallback || "Enter a valid website link to preview."}</div>
                </div>
              )}
              <Button className="w-full gradient-primary text-primary-foreground btn-press" onClick={handleCreate} disabled={creating || !newName || hasReachedLimit}>{creating ? "Creating..." : "Create Endpoint"}</Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={showDaraja} onOpenChange={setShowDaraja}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Your Own Daraja (M-Pesa) Integration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4 text-sm">
            <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              Enter your Safaricom Daraja app credentials. They are encrypted and used only when an endpoint is set to <b>Own Daraja</b>. BrightPay charges a reduced platform fee on this route.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Environment</Label>
                <Select value={daraja.environment} onValueChange={(v) => setDaraja({ ...daraja, environment: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="live">Live (Production)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Business Short Code / Paybill</Label>
                <Input value={daraja.business_short_code} onChange={(e) => setDaraja({ ...daraja, business_short_code: e.target.value })} placeholder="174379" className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Consumer Key {darajaMeta?.has_consumer_key && <span className="text-[10px] text-emerald ml-1">stored</span>}</Label>
                <Input type="password" value={daraja.consumer_key} onChange={(e) => setDaraja({ ...daraja, consumer_key: e.target.value })} placeholder={darajaMeta?.has_consumer_key ? "•••••• (leave blank to keep)" : ""} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Consumer Secret {darajaMeta?.has_consumer_secret && <span className="text-[10px] text-emerald ml-1">stored</span>}</Label>
                <Input type="password" value={daraja.consumer_secret} onChange={(e) => setDaraja({ ...daraja, consumer_secret: e.target.value })} placeholder={darajaMeta?.has_consumer_secret ? "•••••• (leave blank to keep)" : ""} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>STK Passkey {darajaMeta?.has_passkey && <span className="text-[10px] text-emerald ml-1">stored</span>}</Label>
                <Input type="password" value={daraja.passkey} onChange={(e) => setDaraja({ ...daraja, passkey: e.target.value })} placeholder={darajaMeta?.has_passkey ? "•••••• (leave blank to keep)" : ""} className="mt-1" />
              </div>
              <div>
                <Label>B2C Short Code</Label>
                <Input value={daraja.b2c_short_code} onChange={(e) => setDaraja({ ...daraja, b2c_short_code: e.target.value })} placeholder="Optional" className="mt-1" />
              </div>
              <div>
                <Label>B2C Initiator Name</Label>
                <Input value={daraja.b2c_initiator_name} onChange={(e) => setDaraja({ ...daraja, b2c_initiator_name: e.target.value })} placeholder="Optional" className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>B2C Security Credential {darajaMeta?.has_b2c_security_credential && <span className="text-[10px] text-emerald ml-1">stored</span>}</Label>
                <Input type="password" value={daraja.b2c_security_credential} onChange={(e) => setDaraja({ ...daraja, b2c_security_credential: e.target.value })} placeholder="Optional — for withdrawals" className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={daraja.stk_enabled} onChange={(e) => setDaraja({ ...daraja, stk_enabled: e.target.checked })} /> Enable STK (deposits)</label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={daraja.b2c_enabled} onChange={(e) => setDaraja({ ...daraja, b2c_enabled: e.target.checked })} /> Enable B2C (withdrawals)</label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={daraja.c2b_enabled} onChange={(e) => setDaraja({ ...daraja, c2b_enabled: e.target.checked })} /> Enable C2B</label>
            </div>
            <div>
              <Label>Test phone (for KES 1 STK test)</Label>
              <Input value={daraja.test_phone} onChange={(e) => setDaraja({ ...daraja, test_phone: e.target.value })} placeholder="07XXXXXXXX" className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button className="gradient-primary text-primary-foreground btn-press flex-1" onClick={saveDaraja} disabled={darajaBusy}>Save credentials</Button>
              <Button variant="outline" className="btn-press flex-1" onClick={testDaraja} disabled={darajaBusy || !darajaMeta}>
                <RefreshCw className={`w-4 h-4 mr-2 ${darajaBusy ? "animate-spin" : ""}`} /> Test integration
              </Button>
            </div>
            {darajaMeta?.last_test_result && (
              <div className="rounded-xl bg-muted/50 p-3 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                <div className="font-semibold mb-1">Last test result ({darajaMeta.verified ? "✅ verified" : "⚠️ not verified"})</div>
                <pre className="text-[10px]">{JSON.stringify(darajaMeta.last_test_result, null, 2)}</pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>


      {hasReachedLimit && (
        <div className="mb-6 rounded-[1.2rem] border border-amber/30 bg-amber/10 p-4 text-sm text-foreground">
          <div className="flex items-center gap-2 font-semibold mb-1"><AlertTriangle className="w-4 h-4 text-amber" /> Endpoint limit reached</div>
          <p className="text-muted-foreground">Your current stage supports {endpointLimit} endpoint{endpointLimit === 1 ? "" : "s"}. Upgrade to unlock more capacity.</p>
        </div>
      )}

      {endpoints.length === 0 ? (
        <Card className="rounded-[1.75rem]"><CardContent className="p-10 text-center">
          <Link2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground text-sm">No endpoints yet. Create your first one and BrightPay will wire the callback path for you.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {endpoints.map((ep, i) => (
            <motion.div key={ep.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="overflow-hidden rounded-[1.75rem]">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedId(expandedId === ep.id ? null : ep.id)}>
                    <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0"><Link2 className="w-5 h-5 text-primary-foreground" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-foreground">{ep.name}</h3>
                        <span className="status-success">Active</span>
                        <EndpointHealthBadge endpoint={ep} />
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary"><CheckCircle2 className="w-3 h-3" /> Auto callback</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{getSiteFromCallbackUrl(ep.callback_url)}</p>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-right">
                      <div><p className="text-sm font-bold text-foreground">KES {Number(ep.total_collected).toLocaleString()}</p><p className="text-xs text-muted-foreground">Collected</p></div>
                      <div><p className="text-sm font-bold text-emerald">{ep.total_transactions > 0 ? Math.round((ep.successful_transactions / ep.total_transactions) * 100) : 0}%</p><p className="text-xs text-muted-foreground">Success</p></div>
                      <div><p className="text-sm font-bold text-foreground">{ep.total_transactions}</p><p className="text-xs text-muted-foreground">Transactions</p></div>
                    </div>
                    {expandedId === ep.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  {expandedId === ep.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-border">
                      <div className="p-4 space-y-4">
                        {editingId === ep.id ? (
                          <div className="space-y-3">
                            <div><Label>Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" /></div>
                            <div><Label>Website Link</Label><Input value={editSiteUrl} onChange={(e) => setEditSiteUrl(e.target.value)} className="mt-1" /></div>
                            <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground break-all">{generatedEditCallback || "Enter a valid website link to preview the callback destination."}</div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleUpdate(ep.id)} className="gradient-primary text-primary-foreground">Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <Label className="text-xs text-muted-foreground">Endpoint API Key</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm font-mono text-foreground">{ep.api_key}</code>
                                <Button size="icon" variant="outline" className="h-9 w-9 btn-press" onClick={() => copyToClipboard(ep.api_key, "API Key")}><Copy className="w-4 h-4" /></Button>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Generated callback destination</Label>
                              <div className="mt-1 p-3 rounded-lg bg-muted text-xs text-foreground break-all">{ep.callback_url}</div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Code className="w-3 h-3" /> Quick Integration (cURL)</Label>
                              <div className="mt-1 p-3 rounded-lg bg-secondary text-secondary-foreground font-mono text-xs overflow-x-auto">
                                <pre>{`curl -X POST "https://${projectId}.supabase.co/functions/v1/endpoint-pay" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${ep.api_key}" \\
  -d '{
    "amount": 1500,
    "phone_number": "0798765432",
    "external_reference": "ORDER-12345"
  }'`}</pre>
                              </div>
                              <Button size="sm" variant="ghost" className="mt-1 text-xs text-primary btn-press" onClick={() => copyToClipboard(`curl -X POST "https://${projectId}.supabase.co/functions/v1/endpoint-pay" -H "Content-Type: application/json" -H "x-api-key: ${ep.api_key}" -d '{"amount": 1500, "phone_number": "0798765432", "external_reference": "ORDER-12345"}'`, "cURL command")}><Copy className="w-3 h-3 mr-1" /> Copy cURL</Button>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI / Developer Prompt</Label>
                              <div className="mt-1 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-indigo/5 border border-primary/20 text-xs text-muted-foreground">
                                <p className="mb-2 text-foreground font-semibold text-[11px]">Copy this prompt to any AI coding assistant or use directly:</p>
                                <div className="p-2 rounded-lg bg-secondary text-secondary-foreground font-mono text-[10px] overflow-x-auto max-h-48 overflow-y-auto">
                                  <pre>{`Integrate BrightPay M-Pesa payments into my app.

API Endpoint: POST https://${projectId}.supabase.co/functions/v1/endpoint-pay
Status Endpoint: GET https://${projectId}.supabase.co/functions/v1/endpoint-status
API Key (header x-api-key): ${ep.api_key}

STEP 1 - Initiate Payment:
POST /endpoint-pay with JSON body:
- amount (number, required): Amount in KES
- phone_number (string, required): M-Pesa number (07... or 254...)
- external_reference (string, required): YOUR unique order/tracking ID

Response: { success: true, transaction_id, checkout_id }

STEP 2 - Poll for Payment Status (no backend/callback needed!):
GET /endpoint-status?checkout_id={checkout_id}
Headers: x-api-key: ${ep.api_key}

Response: { status: "PENDING" | "COMPLETED" | "FAILED", amount, mpesa_receipt, ... }

Poll every 3 seconds until status is COMPLETED or FAILED (max ~2 minutes).

Example polling code:
const poll = setInterval(async () => {
  const res = await fetch(statusUrl + "?checkout_id=" + checkoutId, {
    headers: { "x-api-key": "${ep.api_key}" }
  });
  const data = await res.json();
  if (data.status === "COMPLETED") { clearInterval(poll); /* success! */ }
  if (data.status === "FAILED") { clearInterval(poll); /* failed */ }
}, 3000);

IMPORTANT: Use a unique external_reference per transaction to avoid confusion.
Generate a complete frontend-only integration with error handling.`}</pre>
                                </div>
                                <Button size="sm" variant="ghost" className="mt-1 text-xs text-primary btn-press" onClick={() => copyToClipboard(`Integrate BrightPay M-Pesa payments into my app.\n\nAPI Endpoint: POST https://${projectId}.supabase.co/functions/v1/endpoint-pay\nStatus Endpoint: GET https://${projectId}.supabase.co/functions/v1/endpoint-status\nAPI Key (header x-api-key): ${ep.api_key}\n\nSTEP 1 - Initiate Payment:\nPOST /endpoint-pay with JSON body:\n- amount (number, required): Amount in KES\n- phone_number (string, required): M-Pesa number (07... or 254...)\n- external_reference (string, required): YOUR unique order/tracking ID\n\nResponse: { success: true, transaction_id, checkout_id }\n\nSTEP 2 - Poll for Payment Status (no backend/callback needed!):\nGET /endpoint-status?checkout_id={checkout_id}\nHeaders: x-api-key: ${ep.api_key}\n\nResponse: { status: "PENDING" | "COMPLETED" | "FAILED", amount, mpesa_receipt, ... }\n\nPoll every 3 seconds until status is COMPLETED or FAILED (max ~2 minutes).\n\nIMPORTANT: Use a unique external_reference per transaction to avoid confusion.\nGenerate a complete frontend-only integration with error handling.`, "AI/Developer Prompt")}><Copy className="w-3 h-3 mr-1" /> Copy AI/Developer Prompt</Button>
                              </div>
                            </div>
                            <ApiSecuritySection endpoint={ep} projectId={projectId} onChange={fetchEndpoints} copy={copyToClipboard} />
                            <EndpointUptimeCounter endpoint={ep} />
                            <div className="flex items-center gap-3 flex-wrap">
                              <EndpointQR endpointId={ep.id} apiKey={ep.api_key} projectName={ep.name} />
                              <PaymentLinkGenerator apiKey={ep.api_key} endpointName={ep.name} />
                              <Button size="sm" variant="outline" className="btn-press" onClick={() => { setEditingId(ep.id); setEditName(ep.name); setEditSiteUrl(getSiteFromCallbackUrl(ep.callback_url)); }}><Edit className="w-4 h-4 mr-1" /> Edit</Button>
                              <Button size="sm" variant="outline" className="text-destructive btn-press" onClick={() => handleDelete(ep.id)}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

function ApiSecuritySection({ endpoint, projectId, onChange, copy }: { endpoint: any; projectId: string; onChange: () => void; copy: (t: string, l: string) => void }) {
  const { toast } = useToast();
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exposeInfo, setExposeInfo] = useState<boolean>(endpoint.expose_account_info ?? true);
  const [wdEnabled, setWdEnabled] = useState<boolean>(endpoint.withdrawals_enabled ?? false);
  const [dailyLimit, setDailyLimit] = useState<string>(String(endpoint.withdrawal_daily_limit ?? 5000));
  const [whitelist, setWhitelist] = useState<string>((endpoint.withdrawal_phone_whitelist || []).join(", "));

  const baseUrl = `https://${projectId}.supabase.co/functions/v1`;

  const save = async () => {
    setSaving(true);
    const wl = whitelist.split(",").map((s) => s.trim()).filter(Boolean);
    const limit = Number(dailyLimit) || 0;
    const { error } = await supabase.from("endpoints").update({
      expose_account_info: exposeInfo,
      withdrawals_enabled: wdEnabled,
      withdrawal_daily_limit: limit,
      withdrawal_phone_whitelist: wl,
    }).eq("id", endpoint.id);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "API security updated" });
    onChange();
  };

  const rotateSecret = async () => {
    if (!confirm("Rotate the withdrawal signing secret? Existing integrations will stop working until updated.")) return;
    const newSecret = "bp_ws_" + Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("endpoints").update({ withdrawal_secret: newSecret }).eq("id", endpoint.id);
    if (error) { toast({ title: "Rotate failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Secret rotated", description: "Update your integration with the new secret." });
    onChange();
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-bold text-foreground">API Security & Account Access</h4>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Expose account info via API</p>
          <p className="text-xs text-muted-foreground">Lets your integration read wallet balances, account status & limits.</p>
        </div>
        <Switch checked={exposeInfo} onCheckedChange={setExposeInfo} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Enable API withdrawals</p>
          <p className="text-xs text-muted-foreground">High-risk: requires HMAC-signed requests. Off by default.</p>
        </div>
        <Switch checked={wdEnabled} onCheckedChange={setWdEnabled} />
      </div>

      {wdEnabled && (
        <div className="space-y-3 pl-2 border-l-2 border-primary/30">
          <div>
            <Label className="text-xs">Daily withdrawal limit (KES)</Label>
            <Input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Phone whitelist (comma-separated, leave blank to allow any)</Label>
            <Input placeholder="0712345678, 254799000111" value={whitelist} onChange={(e) => setWhitelist(e.target.value)} className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">Recommended: lock withdrawals to your own M-Pesa numbers.</p>
          </div>
          <div>
            <Label className="text-xs flex items-center justify-between">
              <span>Withdrawal Signing Secret</span>
              <button type="button" className="text-primary inline-flex items-center gap-1" onClick={rotateSecret}>
                <RefreshCw className="w-3 h-3" /> Rotate
              </button>
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-xs font-mono break-all">
                {showSecret ? endpoint.withdrawal_secret : "•".repeat(32)}
              </code>
              <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setShowSecret((s) => !s)} type="button">
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => copy(endpoint.withdrawal_secret, "Signing Secret")} type="button">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Treat this like a password — never expose in client-side code.</p>
          </div>
        </div>
      )}

      <Button size="sm" className="gradient-primary text-primary-foreground btn-press" onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Save API Settings"}
      </Button>

      {exposeInfo && (
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1"><Code className="w-3 h-3" /> Account Info — GET /endpoint-account</Label>
          <div className="mt-1 p-3 rounded-lg bg-secondary text-secondary-foreground font-mono text-xs overflow-x-auto">
            <pre>{`curl "${baseUrl}/endpoint-account" \\
  -H "x-api-key: ${endpoint.api_key}"`}</pre>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Returns wallet balances, account status, KYC, daily withdrawal usage.</p>
        </div>
      )}

      {wdEnabled && (
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1"><Shield className="w-3 h-3" /> Withdraw — POST /endpoint-withdraw</Label>
          <div className="mt-1 p-3 rounded-lg bg-secondary text-secondary-foreground font-mono text-xs overflow-x-auto">
            <pre>{`# Server-side only! Sign request with HMAC-SHA256.
TS=$(date +%s000)
BODY='{"amount":100,"phone_number":"0712345678","external_reference":"WD-1"}'
SIG=$(printf "%s.%s" "$TS" "$BODY" | openssl dgst -sha256 -hmac "${endpoint.withdrawal_secret}" -hex | awk '{print $2}')

curl -X POST "${baseUrl}/endpoint-withdraw" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${endpoint.api_key}" \\
  -H "x-timestamp: $TS" \\
  -H "x-signature: $SIG" \\
  -d "$BODY"`}</pre>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Signature = HMAC-SHA256(secret, <code>timestamp + "." + rawBody</code>) hex. Timestamp must be within 5 minutes (unix-ms).
          </p>
        </div>
      )}
    </div>
  );
}
