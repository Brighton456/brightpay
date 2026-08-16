import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Heart, Plus, Copy, Trash2, Share2, Users, TrendingUp,
  Calendar, CheckCircle2, Clock, Target, Sparkles, Gift,
  Globe, Shield, QrCode, Download, BarChart3, XCircle,
  ArrowUpRight, Search, Eye
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportTransactionsPDF } from "@/lib/pdf-export";

interface Fundraiser {
  id: string;
  name: string;
  description: string;
  target_amount: number;
  collected_amount: number;
  contributor_count: number;
  status: string;
  endpoint_id: string;
  api_key: string;
  created_at: string;
  deadline: string | null;
}

export default function FundraiserPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", target_amount: "", deadline: "", walletType: "income" as "income" | "service", redirectUrl: "", channelId: "" });
  const [channels, setChannels] = useState<any[]>([]);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [selectedFundraiser, setSelectedFundraiser] = useState<Fundraiser | null>(null);
  const [fundTx, setFundTx] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const baseUrl = "https://brightpay.ddns.net";

  useEffect(() => {
    if (user) {
      fetchFundraisers();
      supabase.from("channels").select("*").eq("user_id", user.id).eq("status", "approved")
        .then(({ data }) => setChannels((data as any[]) || []));
    }
  }, [user]);

  const fetchFundraisers = async () => {
    if (!user) return;
    const { data } = await supabase.from("endpoints").select("*")
      .eq("user_id", user.id).like("name", "fundraiser:%").order("created_at", { ascending: false });
    const items: Fundraiser[] = (data || []).map((ep: any) => {
      const meta = (() => { try { return JSON.parse(ep.callback_url); } catch { return {}; } })();
      return {
        id: ep.id, name: ep.name.replace("fundraiser:", ""), description: meta.description || "",
        target_amount: meta.target_amount || 0, collected_amount: ep.total_collected,
        contributor_count: ep.successful_transactions, status: ep.status, endpoint_id: ep.id,
        api_key: ep.api_key, created_at: ep.created_at, deadline: meta.deadline || null,
      };
    });
    setFundraisers(items);
    setLoading(false);
  };

  const fetchFundTx = async (f: Fundraiser) => {
    setSelectedFundraiser(f);
    const { data } = await supabase.from("transactions").select("*")
      .eq("user_id", user!.id).eq("endpoint_id", f.id).order("created_at", { ascending: false });
    setFundTx((data as any[]) || []);
  };

  const handleCreate = async () => {
    if (!user || !form.name || !form.target_amount) return;
    setCreating(true);
    const callbackMeta = JSON.stringify({
      type: "fundraiser", description: form.description,
      target_amount: Number(form.target_amount), deadline: form.deadline || null,
      wallet_type: form.walletType, redirect_url: form.redirectUrl.trim() || null,
      channel_id: form.channelId || null,
    });
    const { error } = await supabase.from("endpoints").insert({
      user_id: user.id, name: `fundraiser:${form.name}`, callback_url: callbackMeta,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Fundraiser Created! 🎉" });
      setForm({ name: "", description: "", target_amount: "", deadline: "", walletType: "income", redirectUrl: "", channelId: "" });
      fetchFundraisers();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("endpoints").delete().eq("id", id);
    toast({ title: "Fundraiser deleted" });
    fetchFundraisers();
  };

  const getPayLink = (apiKey: string) => `${baseUrl}/pay/${apiKey}`;
  const copyLink = (apiKey: string) => { navigator.clipboard.writeText(getPayLink(apiKey)); toast({ title: "Link copied! 📋" }); };
  const shareLink = (name: string, apiKey: string) => {
    const link = getPayLink(apiKey);
    if (navigator.share) { navigator.share({ title: `Support: ${name}`, text: `Contribute to "${name}" via BrightPay`, url: link }); }
    else { copyLink(apiKey); }
  };

  const totalRaised = fundraisers.reduce((s, f) => s + f.collected_amount, 0);
  const totalContributors = fundraisers.reduce((s, f) => s + f.contributor_count, 0);
  const activeFundraisers = fundraisers.filter((f) => f.status === "active").length;

  const filteredFundraisers = fundraisers.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (profile?.account_status === "idle") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center mb-6">
            <Heart className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Complete Verification First</h2>
          <p className="text-muted-foreground mb-6 max-w-md">Verify your identity to create fundraising campaigns and start collecting contributions.</p>
          <Button onClick={() => window.location.href = "/kyc"} className="gradient-primary text-primary-foreground h-12 px-8 rounded-xl text-base">Start Verification</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Hero */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-none -mx-3 sm:-mx-4 lg:-mx-6 sm:rounded-[2rem] sm:mx-0 p-6 sm:p-10 text-white mb-8"
        style={{ background: "linear-gradient(135deg, hsl(350 80% 45%) 0%, hsl(340 70% 35%) 40%, hsl(280 60% 30%) 100%)" }}>
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-0 right-0 w-80 h-80 bg-rose-300 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold mb-4 border border-white/20">
            <Gift className="w-3.5 h-3.5" /> Fundraising Campaigns
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
            Rally Support for <br className="hidden sm:block" />
            What Matters Most
          </h1>
          <p className="max-w-lg text-sm text-white/60 leading-relaxed">
            Create beautiful fundraising campaigns with progress tracking, contributor counts, and shareable links with QR codes.
          </p>
          <div className="flex items-center gap-4 mt-5 text-xs text-white/50">
            <div className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> Secure</div>
            <div className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> Shareable</div>
            <div className="flex items-center gap-1.5"><Target className="w-4 h-4" /> Goal Tracking</div>
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[
          { label: "Total Raised", value: `KES ${totalRaised.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Contributors", value: totalContributors.toString(), icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "Active Campaigns", value: activeFundraisers.toString(), icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10" },
          { label: "Total Campaigns", value: fundraisers.length.toString(), icon: Target, color: "text-indigo-500", bg: "bg-indigo-500/10" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="rounded-2xl border-border/50 hover:shadow-md transition-all">
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
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search campaigns..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-muted/50 border-border/50" />
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white btn-press h-10 rounded-xl w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-rose-500" />
                </div>
                Create Fundraiser
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-sm font-semibold">Campaign Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Medical Fund, School Fees, Community Project" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1.5 h-11 rounded-xl" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Description</Label>
                <Textarea placeholder="Tell the story behind this campaign — why it matters, who it helps, how contributions will be used..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1.5 rounded-xl min-h-[100px]" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Target Amount (KES) <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="e.g. 100000" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} className="mt-1.5 h-11 rounded-xl text-lg font-bold" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Deadline <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="mt-1.5 h-11 rounded-xl" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Payment Wallet <span className="text-destructive">*</span></Label>
                <Select value={form.walletType} onValueChange={(v: "income" | "service") => setForm({ ...form, walletType: v })}>
                  <SelectTrigger className="mt-1.5 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income Wallet — Contributions go here</SelectItem>
                    <SelectItem value="service">Service Wallet — For operational use</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">Choose where raised funds will be deposited.</p>
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
                  <p className="text-[11px] text-muted-foreground mt-1">Use your own approved channel for contributions.</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-semibold">Redirect URL after Payment <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input placeholder="https://yoursite.com/thank-you" value={form.redirectUrl} onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })} className="mt-1.5 h-11 rounded-xl" />
                <p className="text-[11px] text-muted-foreground mt-1">Contributors will be redirected here after a successful payment.</p>
              </div>
            </div>
            <DialogFooter className="mt-6 gap-2">
              <DialogClose asChild><Button variant="outline" className="rounded-xl h-10">Cancel</Button></DialogClose>
              <Button onClick={handleCreate} disabled={creating || !form.name || !form.target_amount}
                className="bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl h-10 min-w-[140px]">
                {creating ? "Creating..." : "Create Campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Fundraiser Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredFundraisers.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-2">
          <CardContent className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/5 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-rose-500/30" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              {searchQuery ? "No campaigns match your search" : "No fundraisers yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {searchQuery ? "Try a different search term" : "Create your first fundraising campaign to start collecting contributions from supporters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {filteredFundraisers.map((f, i) => {
            const progress = f.target_amount > 0 ? Math.min((f.collected_amount / f.target_amount) * 100, 100) : 0;
            const isExpired = f.deadline ? new Date(f.deadline) < new Date() : false;
            const isCompleted = progress >= 100;
            return (
              <motion.div key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="rounded-2xl border-border/50 hover:shadow-lg hover:border-rose-500/20 transition-all overflow-hidden group">
                  {/* Progress bar top */}
                  <div className="h-1.5 bg-muted">
                    <div className={`h-full transition-all duration-700 ${isCompleted ? "bg-emerald-500" : "bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400"}`}
                      style={{ width: `${progress}%` }} />
                  </div>
                  <CardContent className="p-5 sm:p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-foreground mb-1 truncate">{f.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant={isCompleted ? "default" : isExpired ? "secondary" : "outline"}
                            className={`text-[10px] ${isCompleted ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}>
                            {isCompleted ? "✓ Goal Reached" : isExpired ? "Ended" : "● Active"}
                          </Badge>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/15 to-rose-500/5 flex items-center justify-center flex-shrink-0 ring-1 ring-rose-500/10">
                        <Heart className={`w-6 h-6 ${isCompleted ? "text-emerald-500" : "text-rose-500"}`} />
                      </div>
                    </div>

                    {/* Description */}
                    {f.description && (
                      <p className="text-xs text-muted-foreground mb-4 leading-relaxed line-clamp-3">{f.description}</p>
                    )}

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-xl font-black text-foreground">KES {f.collected_amount.toLocaleString()}</span>
                        <span className="text-sm text-muted-foreground">of KES {f.target_amount.toLocaleString()}</span>
                      </div>
                      <Progress value={progress} className="h-2.5 rounded-full" />
                      <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">{Math.round(progress)}% raised</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {f.contributor_count} contributors</span>
                      </div>
                    </div>

                    {/* Deadline */}
                    {f.deadline && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 p-2.5 rounded-lg bg-muted/30">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{isExpired ? "Campaign ended" : "Ends"} {new Date(f.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        {!isExpired && f.deadline && (
                          <span className="ml-auto font-semibold text-foreground">
                            {Math.max(0, Math.ceil((new Date(f.deadline).getTime() - Date.now()) / 86400000))} days left
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-border/40">
                      <Button size="sm" variant="outline" className="flex-1 text-xs rounded-lg h-9 btn-press" onClick={() => shareLink(f.name, f.api_key)}>
                        <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs rounded-lg h-9 btn-press" onClick={() => copyLink(f.api_key)}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs rounded-lg h-9 btn-press" onClick={() => setShowQR(f.api_key)}>
                        <QrCode className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs rounded-lg h-9 btn-press" onClick={() => fetchFundTx(f)}>
                        <BarChart3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs rounded-lg h-9 text-destructive hover:text-destructive hover:bg-destructive/10 btn-press" onClick={() => handleDelete(f.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={!!showQR} onOpenChange={() => setShowQR(null)}>
        <DialogContent className="max-w-sm text-center rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg">Campaign QR Code</DialogTitle></DialogHeader>
          {showQR && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="p-5 bg-white rounded-2xl shadow-xl ring-1 ring-border/20">
                <QRCodeSVG value={getPayLink(showQR)} size={220} level="H" />
              </div>
              <p className="text-xs text-muted-foreground break-all max-w-[260px]">{getPayLink(showQR)}</p>
              <div className="flex gap-2 w-full">
                <Button className="flex-1 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl h-10" onClick={() => copyLink(showQR)}>
                  <Copy className="w-4 h-4 mr-2" /> Copy Link
                </Button>
                <Button variant="outline" className="rounded-xl h-10" onClick={() => shareLink("Campaign", showQR)}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={!!selectedFundraiser} onOpenChange={() => setSelectedFundraiser(null)}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-rose-500" />
              </div>
              {selectedFundraiser?.name} — Analytics
            </DialogTitle>
          </DialogHeader>
          {selectedFundraiser && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                  <div className="text-xl font-black text-emerald-500">KES {selectedFundraiser.collected_amount.toLocaleString()}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">Raised</div>
                </div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
                  <div className="text-xl font-black text-primary">{selectedFundraiser.contributor_count}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">Contributors</div>
                </div>
                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-center">
                  <div className="text-xl font-black text-rose-500">
                    {selectedFundraiser.target_amount > 0 ? Math.round((selectedFundraiser.collected_amount / selectedFundraiser.target_amount) * 100) : 0}%
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">Progress</div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => exportTransactionsPDF(fundTx, `Fundraiser: ${selectedFundraiser.name}`)}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export PDF
                </Button>
              </div>
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {fundTx.length === 0 ? (
                  <div className="text-center py-10">
                    <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No contributions yet</p>
                  </div>
                ) : fundTx.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tx.status === "completed" ? "bg-emerald-500/10" : tx.status === "pending" ? "bg-amber-500/10" : "bg-destructive/10"}`}>
                      {tx.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : tx.status === "pending" ? <Clock className="w-4 h-4 text-amber-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{tx.phone || tx.id.slice(0, 8)}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
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
