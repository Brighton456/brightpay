import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2, Plus, Copy, Trash2, Share2, ExternalLink,
  TrendingUp, CheckCircle2, Clock, Zap, DollarSign, Eye,
  Download, QrCode, XCircle, Calendar, BarChart3,
  Globe, Smartphone, Shield, Sparkles, ArrowUpRight, Search
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportTransactionsPDF } from "@/lib/pdf-export";

interface LipwaLink {
  id: string;
  name: string;
  description: string;
  amount: number | null;
  amountType: string;
  status: string;
  api_key: string;
  total_collected: number;
  total_transactions: number;
  successful_transactions: number;
  created_at: string;
}

export default function LipwaPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [links, setLinks] = useState<LipwaLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", amount: "", amountType: "fixed", walletType: "income" as "income" | "service", redirectUrl: "", channelId: "" });
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedLink, setSelectedLink] = useState<LipwaLink | null>(null);
  const [linkTransactions, setLinkTransactions] = useState<any[]>([]);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const baseUrl = "https://brightpay.ddns.net";

  useEffect(() => {
    if (user) {
      fetchLinks();
      supabase.from("channels").select("*").eq("user_id", user.id).eq("status", "approved")
        .then(({ data }) => setChannels((data as any[]) || []));
    }
  }, [user]);

  const fetchLinks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("endpoints").select("*").eq("user_id", user.id)
      .like("name", "lipwa:%").order("created_at", { ascending: false });
    const items: LipwaLink[] = (data || []).map((ep: any) => {
      const meta = (() => { try { return JSON.parse(ep.callback_url); } catch { return {}; } })();
      return {
        id: ep.id, name: ep.name.replace("lipwa:", ""), description: meta.description || "",
        amount: meta.amount || null, amountType: meta.amount_type || "fixed", status: ep.status, api_key: ep.api_key,
        total_collected: ep.total_collected, total_transactions: ep.total_transactions,
        successful_transactions: ep.successful_transactions, created_at: ep.created_at,
      };
    });
    setLinks(items);
    setLoading(false);
  };

  const fetchLinkTransactions = async (link: LipwaLink) => {
    setSelectedLink(link);
    const { data } = await supabase.from("transactions").select("*")
      .eq("user_id", user!.id).eq("endpoint_id", link.id)
      .order("created_at", { ascending: false });
    setLinkTransactions((data as any[]) || []);
  };

  const handleCreate = async () => {
    if (!user || !form.name) return;
    setCreating(true);
    const callbackMeta = JSON.stringify({
      type: "lipwa", amount: form.amountType === "fixed" ? Number(form.amount) : null,
      amount_type: form.amountType, description: form.description, wallet_type: form.walletType,
      redirect_url: form.redirectUrl.trim() || null, channel_id: form.channelId || null,
    });
    const { error } = await supabase.from("endpoints").insert({
      user_id: user.id, name: `lipwa:${form.name}`, callback_url: callbackMeta,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment Link Created! ⚡" });
      setForm({ name: "", description: "", amount: "", amountType: "fixed", walletType: "income", redirectUrl: "", channelId: "" });
      fetchLinks();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("endpoints").delete().eq("id", id);
    toast({ title: "Link deleted" });
    fetchLinks();
  };

  const getPayLink = (apiKey: string) => `${baseUrl}/pay/${apiKey}`;
  const copyLink = (apiKey: string) => { navigator.clipboard.writeText(getPayLink(apiKey)); toast({ title: "Link copied! 📋" }); };
  const shareLink = (name: string, apiKey: string) => {
    const link = getPayLink(apiKey);
    if (navigator.share) { navigator.share({ title: `Pay: ${name}`, text: `Pay via BrightPay`, url: link }); }
    else { copyLink(apiKey); }
  };

  const totalCollected = links.reduce((s, l) => s + l.total_collected, 0);
  const totalTx = links.reduce((s, l) => s + l.successful_transactions, 0);
  const activeLinks = links.filter((l) => l.status === "active").length;

  const filteredLinks = links.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "active") return matchesSearch && l.status === "active";
    if (activeTab === "inactive") return matchesSearch && l.status !== "active";
    return matchesSearch;
  });

  if (profile?.account_status === "idle") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
            <Link2 className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Complete Verification First</h2>
          <p className="text-muted-foreground mb-6 max-w-md">You need to verify your identity before you can create payment links. This helps keep your payments secure.</p>
          <Button onClick={() => window.location.href = "/kyc"} className="gradient-primary text-primary-foreground h-12 px-8 rounded-xl text-base">Start Verification</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Hero Section */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-none -mx-3 sm:-mx-4 lg:-mx-6 sm:rounded-[2rem] sm:mx-0 gradient-hero p-6 sm:p-10 text-secondary-foreground mb-8">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-primary mb-4 border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" /> Lipwa Payment Links
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
              Collect Payments <br className="hidden sm:block" />
              <span className="text-gradient">Effortlessly</span>
            </h1>
            <p className="max-w-lg text-sm text-secondary-foreground/60 leading-relaxed">
              Create beautiful, shareable payment links with QR codes. Perfect for online stores, freelancers, events, and more.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-3 text-xs text-secondary-foreground/50">
              <div className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-emerald-400" /> Secure</div>
              <div className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-primary" /> Shareable</div>
              <div className="flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-amber-400" /> M-Pesa</div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[
          { label: "Total Collected", value: `KES ${totalCollected.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
          { label: "Payments Received", value: totalTx.toString(), icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10", ring: "ring-primary/20" },
          { label: "Active Links", value: activeLinks.toString(), icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10", ring: "ring-amber-500/20" },
          { label: "Total Links", value: links.length.toString(), icon: Link2, color: "text-indigo-500", bg: "bg-indigo-500/10", ring: "ring-indigo-500/20" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="rounded-2xl border-border/50 hover:shadow-md transition-all ring-1 ${stat.ring}">
              <CardContent className="p-4 sm:p-5">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="text-2xl font-black text-foreground tracking-tight">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search links..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-muted/50 border-border/50" />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden sm:block">
            <TabsList className="rounded-xl bg-muted/50 h-10">
              <TabsTrigger value="all" className="rounded-lg text-xs">All</TabsTrigger>
              <TabsTrigger value="active" className="rounded-lg text-xs">Active</TabsTrigger>
              <TabsTrigger value="inactive" className="rounded-lg text-xs">Inactive</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground btn-press h-10 rounded-xl w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Create Payment Link
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-primary" />
                </div>
                Create Payment Link
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-sm font-semibold">Link Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Shop Payment, Event Ticket, Service Fee" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 h-11 rounded-xl" />
                <p className="text-[11px] text-muted-foreground mt-1">This name will be displayed to your customers</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Description</Label>
                <Textarea placeholder="Describe what this payment is for — helps customers know what they're paying for" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 rounded-xl min-h-[80px]" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Amount Type</Label>
                <Select value={form.amountType} onValueChange={(v) => setForm({ ...form, amountType: v })}>
                  <SelectTrigger className="mt-1.5 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount — Customer pays exact amount</SelectItem>
                    <SelectItem value="custom">Open Amount — Customer enters their own amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.amountType === "fixed" && (
                <div>
                  <Label className="text-sm font-semibold">Amount (KES) <span className="text-destructive">*</span></Label>
                  <Input type="number" placeholder="e.g. 500" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1.5 h-11 rounded-xl text-lg font-bold" />
                </div>
              )}
            </div>
              <div>
                <Label className="text-sm font-semibold">Payment Wallet <span className="text-destructive">*</span></Label>
                <Select value={form.walletType} onValueChange={(v: "income" | "service") => setForm({ ...form, walletType: v })}>
                  <SelectTrigger className="mt-1.5 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income Wallet — For received payments</SelectItem>
                    <SelectItem value="service">Service Wallet — For fees & operational costs</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">Collected payments will be credited to this wallet.</p>
              </div>
              {channels.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold">Payment Channel <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Select value={form.channelId || "__none__"} onValueChange={(v) => setForm({ ...form, channelId: v === "__none__" ? "" : v })}>
                    <SelectTrigger className="mt-1.5 h-11 rounded-xl"><SelectValue placeholder="Default channel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Default Channel</SelectItem>
                      {channels.map((ch: any) => (
                        <SelectItem key={ch.id} value={ch.id}>{ch.name} ({ch.channel_type}{ch.business_number ? ` — ${ch.business_number}` : ""})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">Use your own approved channel for this link.</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-semibold">Redirect URL after Payment <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input placeholder="https://yoursite.com/thank-you" value={form.redirectUrl} onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })} className="mt-1.5 h-11 rounded-xl" />
                <p className="text-[11px] text-muted-foreground mt-1">Payer will be redirected here after a successful payment.</p>
              </div>
            <DialogFooter className="mt-6 gap-2">
              <DialogClose asChild><Button variant="outline" className="rounded-xl h-10">Cancel</Button></DialogClose>
              <Button onClick={handleCreate} disabled={creating || !form.name || (form.amountType === "fixed" && !form.amount)} className="gradient-primary text-primary-foreground rounded-xl h-10 min-w-[140px]">
                {creating ? "Creating..." : "Create Link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Links Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredLinks.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-2">
          <CardContent className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-8 h-8 text-primary/30" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              {searchQuery ? "No links match your search" : "No payment links yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {searchQuery ? "Try a different search term" : "Create your first payment link to start collecting payments instantly. Share it via WhatsApp, social media, or embed on your website."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLinks.map((link, i) => (
            <motion.div key={link.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="rounded-2xl border-border/50 hover:shadow-lg hover:border-primary/20 transition-all group overflow-hidden h-full">
                {/* Top accent bar */}
                <div className={`h-1 w-full ${link.status === "active" ? "bg-gradient-to-r from-primary via-emerald-400 to-primary" : "bg-muted"}`} />
                <CardContent className="p-5 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center flex-shrink-0 ring-1 ring-primary/10">
                        <DollarSign className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground truncate">{link.name}</h3>
                        <Badge variant={link.status === "active" ? "default" : "secondary"} className="text-[10px] mt-1">
                          {link.status === "active" ? "● Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-black text-emerald-500">KES {link.total_collected.toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground">{link.successful_transactions} payments</div>
                    </div>
                  </div>

                  {/* Description */}
                  {link.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{link.description}</p>
                  )}

                  {/* Details */}
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground mb-4 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {link.amount ? `KES ${link.amount.toLocaleString()}` : "Open amount"}
                    </span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(link.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Link preview */}
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/50 mb-4">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-[10px] text-muted-foreground font-mono truncate flex-1">{getPayLink(link.api_key)}</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyLink(link.api_key)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-3 border-t border-border/40 flex-wrap">
                    <Button size="sm" variant="outline" className="flex-1 text-xs rounded-lg h-9 btn-press" onClick={() => shareLink(link.name, link.api_key)}>
                      <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs rounded-lg h-9 btn-press" onClick={() => setShowQR(link.api_key)}>
                      <QrCode className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs rounded-lg h-9 btn-press" onClick={() => fetchLinkTransactions(link)}>
                      <BarChart3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs rounded-lg h-9 text-destructive hover:text-destructive hover:bg-destructive/10 btn-press" onClick={() => handleDelete(link.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={!!showQR} onOpenChange={() => setShowQR(null)}>
        <DialogContent className="max-w-sm text-center rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg">Payment QR Code</DialogTitle></DialogHeader>
          {showQR && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="p-5 bg-white rounded-2xl shadow-xl ring-1 ring-border/20">
                <QRCodeSVG value={getPayLink(showQR)} size={220} level="H"
                  imageSettings={{ src: "", height: 0, width: 0, excavate: false }} />
              </div>
              <p className="text-xs text-muted-foreground break-all max-w-[260px]">{getPayLink(showQR)}</p>
              <div className="flex gap-2 w-full">
                <Button className="flex-1 gradient-primary text-primary-foreground rounded-xl h-10 btn-press" onClick={() => copyLink(showQR)}>
                  <Copy className="w-4 h-4 mr-2" /> Copy Link
                </Button>
                <Button variant="outline" className="rounded-xl h-10 btn-press" onClick={() => shareLink("Payment", showQR)}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={!!selectedLink} onOpenChange={() => setSelectedLink(null)}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              {selectedLink?.name} — Analytics
            </DialogTitle>
          </DialogHeader>
          {selectedLink && (
            <div className="space-y-5 pt-2">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                  <div className="text-xl font-black text-emerald-500">KES {selectedLink.total_collected.toLocaleString()}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">Collected</div>
                </div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
                  <div className="text-xl font-black text-primary">{selectedLink.successful_transactions}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">Successful</div>
                </div>
                <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-center">
                  <div className="text-xl font-black text-destructive">{selectedLink.total_transactions - selectedLink.successful_transactions}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">Failed</div>
                </div>
              </div>

              {/* Export */}
              <div className="flex justify-end">
                <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => exportTransactionsPDF(linkTransactions, `Lipwa: ${selectedLink.name}`)}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export PDF
                </Button>
              </div>

              {/* Transaction list */}
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {linkTransactions.length === 0 ? (
                  <div className="text-center py-10">
                    <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No transactions yet</p>
                  </div>
                ) : linkTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tx.status === "completed" ? "bg-emerald-500/10" : tx.status === "pending" ? "bg-amber-500/10" : "bg-destructive/10"}`}>
                      {tx.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : tx.status === "pending" ? <Clock className="w-4 h-4 text-amber-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{tx.phone || tx.external_reference || tx.id.slice(0, 8)}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-foreground">KES {Number(tx.amount).toLocaleString()}</div>
                      {tx.mpesa_receipt && <div className="text-[10px] text-muted-foreground">{tx.mpesa_receipt}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
