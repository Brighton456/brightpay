import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wallet, ArrowUpRight, ArrowDownRight, Activity, CreditCard, AlertCircle, Zap, ArrowRight,
  CheckCircle2, Clock, XCircle, Send, Sparkles, ShieldCheck, Link2, Crown, Megaphone, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GuidedOnboarding from "@/components/onboarding/GuidedOnboarding";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCountUp } from "@/hooks/use-count-up";
import { Download } from "lucide-react";
import { generateReceipt } from "@/lib/receipt";
import TransactionHeatmap from "@/components/TransactionHeatmap";
import AchievementBadges from "@/components/AchievementBadges";
import EndpointComparison from "@/components/EndpointComparison";

const statusIcon: Record<string, JSX.Element> = {
  completed: <CheckCircle2 className="w-4 h-4 text-emerald" />,
  pending: <Clock className="w-4 h-4 text-amber" />,
  failed: <XCircle className="w-4 h-4 text-destructive" />,
};

export default function Dashboard() {
  const { user, profile, incomeBalance, serviceBalance, refreshWallets } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalCollected: 0, successRate: 0, activeEndpoints: 0, pending: 0 });
  const [transferAmount, setTransferAmount] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [archived, setArchived] = useState<Record<string, { balance: number; note: string | null; date: string }>>({});
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [endpointsList, setEndpointsList] = useState<any[]>([]);
  const [endpointDetails, setEndpointDetails] = useState<any[]>([]);
  const animCollected = useCountUp(stats.totalCollected, 1200, 200);
  const animRate = useCountUp(Math.round(stats.successRate * 10), 1200, 300);
  const animEndpoints = useCountUp(stats.activeEndpoints, 800, 400);
  const animPending = useCountUp(stats.pending, 800, 500);

  useEffect(() => {
    if (!user) return;
    fetchData();
    const channel = supabase
      .channel("tx-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` }, () => {
        fetchData();
        refreshWallets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const { data: txs } = await supabase.from("transactions").select("*").eq("user_id", user.id).is("archived_at", null).order("created_at", { ascending: false }).limit(10);
    setTransactions((txs as any[]) || []);

    const { data: archRows } = await supabase.rpc("get_my_archived_balances" as any);
    const archMap: Record<string, { balance: number; note: string | null; date: string }> = {};
    ((archRows as any[]) || []).forEach((r: any) => {
      const k = r.wallet_type;
      if (!archMap[k]) archMap[k] = { balance: 0, note: r.note, date: r.archived_at };
      archMap[k].balance += Number(r.balance);
    });
    setArchived(archMap);

    const { data: allTxs } = await supabase.from("transactions").select("status, amount, type, created_at").eq("user_id", user.id).is("archived_at", null);
    setAllTransactions((allTxs as any[]) || []);
    const all = (allTxs as any[]) || [];
    const completed = all.filter((t) => t.status === "completed");
    const deposits = completed.filter((t) => t.type === "deposit" || t.type === "endpoint");
    const totalCollected = deposits.reduce((sum, t) => sum + Number(t.amount), 0);
    const successRate = all.length > 0 ? (completed.length / all.length) * 100 : 0;
    const pending = all.filter((t) => t.status === "pending").length;

    // Build 7-day chart
    const days: Record<string, { deposits: number; withdrawals: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days[d.toISOString().split("T")[0]] = { deposits: 0, withdrawals: 0 };
    }
    all.filter(t => t.status === "completed").forEach(t => {
      const day = t.created_at.split("T")[0];
      if (days[day]) {
        if (t.type === "deposit" || t.type === "endpoint") days[day].deposits += Number(t.amount);
        if (t.type === "withdrawal") days[day].withdrawals += Number(t.amount);
      }
    });
    setChartData(Object.entries(days).map(([date, d]) => ({ date: date.slice(5), ...d })));

    const { count: epCount } = await supabase.from("endpoints").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active");
    const { data: allEps } = await supabase.from("endpoints").select("id, status, name, total_collected, total_transactions, successful_transactions").eq("user_id", user.id);
    setEndpointDetails((allEps as any[]) || []);
    setEndpointsList((allEps as any[]) || []);
    setStats({ totalCollected, successRate: Math.round(successRate * 10) / 10, activeEndpoints: epCount || 0, pending });

    const { data: annData } = await supabase.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(10);
    // Filter by audience
    const userStatus = profile?.account_status || "idle";
    const hasPackage = !!profile?.current_package_id;
    const filtered = (annData || []).filter((a: any) => {
      const audience = a.audience || "all";
      if (audience === "all") return true;
      if (audience === "active_package") return hasPackage;
      if (audience.startsWith("user:")) return audience.slice(5) === user!.id;
      return audience === userStatus;
    });
    setAnnouncements(filtered.slice(0, 3));
  };

  const handleTransfer = async () => {
    const amt = Number(transferAmount);
    if (!amt || amt <= 0 || amt > incomeBalance) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    setTransferring(true);
    try {
      const { error: e1 } = await supabase.rpc("decrement_wallet" as any, { p_user_id: user!.id, p_type: "income", p_amount: amt });
      const { error: e2 } = await supabase.rpc("increment_wallet" as any, { p_user_id: user!.id, p_type: "service", p_amount: amt });
      if (e1 || e2) throw new Error("Transfer failed");
      await supabase.from("transactions").insert({ user_id: user!.id, type: "transfer" as any, amount: amt, fee: 0, status: "completed" as any, external_reference: `TRF-${Date.now()}`, wallet_type: "service" as any });
      await refreshWallets();
      toast({ title: "✅ Transfer Complete!", description: `KES ${amt.toLocaleString()} moved to Service Wallet` });
      setShowTransfer(false); setTransferAmount(""); fetchData();
    } catch (err: any) { toast({ title: "Transfer failed", description: err.message, variant: "destructive" }); }
    finally { setTransferring(false); }
  };

  const chartConfig = {
    deposits: { label: "Deposits", color: "hsl(160 84% 39%)" },
    withdrawals: { label: "Withdrawals", color: "hsl(38 92% 50%)" },
  };

  const quickStats = [
    { label: "Total Collected", value: `KES ${animCollected.toLocaleString()}`, icon: CreditCard, gradient: "from-emerald-500 to-teal-600" },
    { label: "Success Rate", value: `${(animRate / 10).toFixed(1)}%`, icon: Activity, gradient: "from-blue-500 to-cyan-600" },
    { label: "Active Endpoints", value: String(animEndpoints), icon: Link2, gradient: "from-indigo-500 to-violet-600" },
    { label: "Pending Actions", value: String(animPending), icon: AlertCircle, gradient: "from-amber-500 to-orange-600" },
  ];

  return (
    <DashboardLayout>
      <GuidedOnboarding fullName={profile?.full_name} accountStatus={profile?.account_status} createdAt={(profile as any)?.created_at} />

      {/* Announcements Banner */}
      {announcements.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 space-y-2">
          {announcements.map(a => (
            <div key={a.id} className="rounded-2xl bg-gradient-to-r from-primary/10 to-indigo/10 border border-primary/20 p-4 flex items-start gap-3">
              <Megaphone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-foreground">{a.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{a.content}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Hero */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-none -mx-3 sm:-mx-4 lg:-mx-6 sm:rounded-[2rem] sm:mx-0 gradient-hero p-4 sm:p-6 text-secondary-foreground mb-4 sm:mb-6">
        <div className="relative z-10 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Member Command Center
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3">
              Welcome back, {profile?.full_name?.split(" ")[0] || "Member"} 👋
            </h1>
            <p className="max-w-2xl text-sm md:text-base text-secondary-foreground/75 leading-7 mb-5">
              Your hosted payment engine is ready. Track collections, monitor wallet movement, and launch website payments.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Deposit Funds", href: "/deposit", icon: ArrowDownRight },
                { label: "Create Endpoint", href: "/endpoints", icon: Link2 },
                { label: "Complete KYC", href: "/kyc", icon: ShieldCheck },
              ].map((action) => (
                <Link key={action.label} to={action.href}>
                  <Button className="bg-primary-foreground/12 hover:bg-primary-foreground/18 text-secondary-foreground border border-primary-foreground/10 btn-press">
                    <action.icon className="w-4 h-4 mr-2" /> {action.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[1.5rem] bg-primary-foreground/10 p-5 border border-primary-foreground/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-[0.2em] text-secondary-foreground/55">Account Stage</span>
                <Crown className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-black capitalize">{profile?.account_status || "idle"}</div>
              <p className="mt-2 text-sm text-secondary-foreground/70">
                {profile?.account_status === "active" ? "Full platform access enabled."
                  : profile?.account_status === "beginner" ? "Endpoints unlocked. Activate for full access."
                    : "Complete KYC to unlock endpoint collections."}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-primary-foreground/10 p-5 border border-primary-foreground/10">
              <div className="text-xs uppercase tracking-[0.2em] text-secondary-foreground/55 mb-3">Live Summary</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-2xl font-black">KES {Number(incomeBalance).toLocaleString()}</div>
                  <div className="text-xs text-secondary-foreground/60">Income wallet</div>
                </div>
                <div>
                  <div className="text-2xl font-black">KES {Number(serviceBalance).toLocaleString()}</div>
                  <div className="text-xs text-secondary-foreground/60">Service wallet</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Wallets */}
      <div className="grid md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="wallet-income rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 text-primary-foreground">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Wallet className="w-5 h-5" /><span className="text-sm font-medium opacity-90">Income Wallet</span></div>
            <span className="text-xs px-2 py-1 rounded-full bg-primary-foreground/20">Withdrawable</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">KES {Number(incomeBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <p className="text-sm opacity-80">Collections land here first.</p>
          {archived.income && (
            <div className="mt-2 inline-flex flex-col gap-0.5 px-3 py-1.5 rounded-lg bg-primary-foreground/15 border border-primary-foreground/20 text-xs">
              <span className="font-semibold">📦 Archived: KES {archived.income.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <span className="opacity-75 text-[10px]">{archived.income.note || "Admin reset"} · {new Date(archived.income.date).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex gap-2 mt-5 flex-wrap">
            {profile?.account_status === "active" && <Link to="/withdraw"><Button size="sm" className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 btn-press">Withdraw</Button></Link>}
            <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
              <DialogTrigger asChild><Button size="sm" variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 btn-press"><Send className="w-4 h-4 mr-1" /> Transfer to Service</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Transfer to Service Wallet</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Available: <strong className="text-foreground">KES {Number(incomeBalance).toLocaleString()}</strong></p>
                  <div><Label>Amount (KES)</Label><Input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="Enter amount" className="mt-1.5" min={1} max={incomeBalance} /></div>
                  <Button className="w-full gradient-primary text-primary-foreground btn-press" disabled={transferring} onClick={handleTransfer}>
                    {transferring ? "Transferring..." : `Transfer KES ${transferAmount ? Number(transferAmount).toLocaleString() : "0"}`}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="wallet-service rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 text-primary-foreground">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><CreditCard className="w-5 h-5" /><span className="text-sm font-medium opacity-90">Service Wallet</span></div>
            <span className="text-xs px-2 py-1 rounded-full bg-primary-foreground/20">Operations</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">KES {Number(serviceBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <p className="text-sm opacity-80">Transaction fees are deducted automatically.</p>
          {archived.service && (
            <div className="mt-2 inline-flex flex-col gap-0.5 px-3 py-1.5 rounded-lg bg-primary-foreground/15 border border-primary-foreground/20 text-xs">
              <span className="font-semibold">📦 Archived: KES {archived.service.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <span className="opacity-75 text-[10px]">{archived.service.note || "Admin reset"} · {new Date(archived.service.date).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex gap-2 mt-5"><Link to="/deposit"><Button size="sm" className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 btn-press">Top Up</Button></Link></div>
        </motion.div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {quickStats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
            <div className={`rounded-2xl bg-gradient-to-br ${stat.gradient} p-4 text-white`}>
              <div className="flex items-center justify-between mb-3">
                <stat.icon className="w-5 h-5 opacity-80" />
                <span className="text-[10px] uppercase tracking-[0.2em] opacity-70">Live</span>
              </div>
              <div className="text-2xl font-black tracking-tight">{stat.value}</div>
              <div className="text-xs mt-1 opacity-75">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart + Recent */}
      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-4 sm:gap-6 mb-6 overflow-hidden">
        <Card className="rounded-[1.75rem] border-border/70 min-w-0 overflow-hidden">
          <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> 7-Day Activity</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="deposits" stroke="hsl(160 84% 39%)" fill="hsl(160 84% 39% / 0.2)" />
                  <Area type="monotone" dataKey="withdrawals" stroke="hsl(38 92% 50%)" fill="hsl(38 92% 50% / 0.2)" />
                </AreaChart>
              </ChartContainer>
            ) : <p className="text-center text-muted-foreground py-8 text-sm">Make transactions to see your chart</p>}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-border/70 min-w-0">
          <CardHeader><CardTitle className="text-lg font-bold">Growth Checklist</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Top up service wallet", done: serviceBalance > 0, href: "/deposit" },
              { label: "Submit KYC verification", done: profile?.kyc_status === "approved", href: "/kyc" },
              { label: "Create your first endpoint", done: stats.activeEndpoints > 0, href: "/endpoints" },
            ].map((item) => (
              <Link key={item.label} to={item.href} className="block">
                <div className="flex items-center justify-between rounded-[1.2rem] border border-border/60 p-4 hover:bg-muted/40 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">Keep progressing to unlock the full BrightPay experience.</p>
                  </div>
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center ${item.done ? "bg-emerald/10" : "bg-primary/10"}`}>
                    {item.done ? <CheckCircle2 className="w-4 h-4 text-emerald" /> : <ArrowRight className="w-4 h-4 text-primary" />}
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Endpoint Comparison */}
      {endpointDetails.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <EndpointComparison endpoints={endpointDetails} />
        </div>
      )}

      {/* Achievements */}
      <div className="mb-4 sm:mb-6">
        <AchievementBadges profile={profile} transactions={allTransactions} endpoints={endpointsList} />
      </div>

      {/* Heatmap */}
      <div className="mb-4 sm:mb-6">
        <TransactionHeatmap transactions={transactions} />
      </div>

      {/* Recent Transactions */}
      <Card className="rounded-[1.75rem] border-border/70">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-bold">Recent Transactions</CardTitle>
          <Link to="/transactions"><Button variant="ghost" size="sm" className="text-primary btn-press">View All <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No transactions yet. Make your first deposit!</p>
              <Link to="/deposit"><Button size="sm" className="mt-3 gradient-primary text-primary-foreground btn-press">Make Deposit</Button></Link>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, i) => (
                <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-4 rounded-[1.25rem] border border-border/60 bg-muted/30 p-3 hover:bg-muted/50 transition-colors">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tx.type === "withdrawal" ? "bg-amber/10" : tx.type === "transfer" ? "bg-indigo/10" : "bg-emerald/10"}`}>
                    {tx.type === "withdrawal" ? <ArrowUpRight className="w-5 h-5 text-amber" /> : tx.type === "transfer" ? <Send className="w-5 h-5 text-indigo" /> : <ArrowDownRight className="w-5 h-5 text-emerald" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{tx.external_reference || tx.type}</span>
                      {tx.phone && <span className="text-xs text-muted-foreground">{tx.phone}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${tx.type === "withdrawal" || tx.type === "transfer" ? "text-amber" : "text-emerald"}`}>
                      {tx.type === "withdrawal" || tx.type === "transfer" ? "-" : "+"}KES {Number(tx.amount).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      {statusIcon[tx.status]}
                      <span className={`text-xs capitalize ${tx.status === "completed" ? "text-emerald" : tx.status === "pending" ? "text-amber" : "text-destructive"}`}>{tx.status}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); generateReceipt({ ...tx, amount: Number(tx.amount), fee: Number(tx.fee || 0) }); }} className="mt-1 text-[10px] text-primary hover:text-primary/80 flex items-center gap-1 btn-press"><Download className="w-3 h-3" /> Receipt</button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
