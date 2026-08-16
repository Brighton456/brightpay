import { Fragment, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield, Users, BarChart3, CheckCircle2, XCircle, Clock, Eye, Ban, Edit, Search,
  DollarSign, Zap, Image, UserCheck, AlertTriangle, Flag, ArrowUpRight, ArrowDownRight,
  Megaphone, MessageCircle, Settings, Crown, TrendingUp, Plus, Trash2, Radio, Wallet, Bot
} from "lucide-react";
import ProfitWallets from "@/components/admin/ProfitWallets";
import AdminCards from "@/components/admin/AdminCards";

import ProviderFees from "@/components/admin/ProviderFees";
import ArchiveControls from "@/components/admin/ArchiveControls";
import DevAI from "@/components/admin/DevAI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-500",
  beginner: "bg-primary/10 text-primary",
  idle: "bg-amber-500/10 text-amber-500",
};
const PIE_COLORS = ["hsl(38,92%,50%)", "hsl(199,89%,48%)", "hsl(160,84%,39%)", "hsl(0,84%,60%)"];

export default function AdminPanel() {
  const { isAdmin, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<any[]>([]);
  const [featureRequests, setFeatureRequests] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ users: 0, transactions: 0, endpoints: 0, revenue: 0, chartData: [], statusBreakdown: {} });

  const [userSearch, setUserSearch] = useState("");
  const [txSearch, setTxSearch] = useState("");
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [kycFilter, setKycFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editingFees, setEditingFees] = useState(false);
  const [feeEdits, setFeeEdits] = useState<any[]>([]);
  const [viewingKycUser, setViewingKycUser] = useState<string | null>(null);
  const [kycImages, setKycImages] = useState<Record<string, string>>({});
  const [newAnnTitle, setNewAnnTitle] = useState("");
  const [newAnnContent, setNewAnnContent] = useState("");
  const [newAnnAudience, setNewAnnAudience] = useState("all");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingPkg, setEditingPkg] = useState<any>(null);
  const [settingEdits, setSettingEdits] = useState<Record<string, string>>({});
  const [frResponse, setFrResponse] = useState("");
  const [balanceEdit, setBalanceEdit] = useState({ userId: "", walletType: "income", amount: "" });
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [channelApproval, setChannelApproval] = useState<any>(null);
  const [channelId, setChannelId] = useState("");

  useEffect(() => {
    if (!isAdmin) { navigate("/dashboard"); return; }
    fetchAll();
  }, [isAdmin]);

  const invokeAdmin = async (action: string, params: any = {}) => {
    const { data, error } = await supabase.functions.invoke("admin-action", { body: { action, ...params } });
    if (error) throw error;
    return data;
  };

  const fetchAll = async () => {
    try {
      const [usersData, kycData, statsData, txData, pwData, frData, settingsData] = await Promise.all([
        invokeAdmin("get_all_users"), invokeAdmin("get_all_kyc"), invokeAdmin("get_stats"),
        invokeAdmin("get_all_transactions"), invokeAdmin("get_pending_withdrawals"),
        invokeAdmin("get_feature_requests"), invokeAdmin("get_settings"),
      ]);
      setUsers(usersData || []);
      setKycDocs(kycData || []);
      setStats(statsData || {});
      setAllTransactions(txData || []);
      setPendingWithdrawals(pwData || []);
      setAllWithdrawals((txData || []).filter((t: any) => t.type === "withdrawal"));
      setFeatureRequests(frData || []);
      setSettings(settingsData || []);

      const settMap: Record<string, string> = {};
      (settingsData || []).forEach((s: any) => { settMap[s.key] = s.value; });
      setSettingEdits(settMap);

      const { data: feesData } = await supabase.from("fees").select("*").order("min_amount");
      setFees((feesData as any[]) || []);
      const { data: pkgData } = await supabase.from("packages").select("*");
      setPackages((pkgData as any[]) || []);
      const { data: annData } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      setAnnouncements((annData as any[]) || []);
      const { data: chData } = await supabase.from("channels").select("*").order("created_at", { ascending: false });
      setChannels((chData as any[]) || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // --- Action Handlers ---
  const handleBan = async (userId: string, ban: boolean) => { await invokeAdmin(ban ? "ban_user" : "unban_user", { user_id: userId }); toast({ title: ban ? "User banned" : "User unbanned" }); fetchAll(); };
  const handleKyc = async (userId: string, action: "approve" | "reject", reason?: string) => { await invokeAdmin(action === "approve" ? "approve_kyc" : "reject_kyc", { user_id: userId, reason }); toast({ title: action === "approve" ? "KYC Approved!" : "KYC Rejected" }); fetchAll(); };
  const handleToggleActivation = async (userId: string) => { await invokeAdmin("toggle_activation", { user_id: userId }); toast({ title: "Activation toggled" }); fetchAll(); };
  const handleSaveFees = async () => { for (const f of feeEdits) { await invokeAdmin("update_fee", { fee_id: f.id, service_fee: f.service_fee, withdrawal_fee: f.withdrawal_fee, cost_per_transaction: f.cost_per_transaction || 0, service_cost: f.service_cost || 0, withdrawal_cost: f.withdrawal_cost || 0 }); } toast({ title: "Fees updated!" }); setEditingFees(false); fetchAll(); };
  const handleApproveWithdrawal = async (txId: string) => { try { await invokeAdmin("approve_withdrawal", { transaction_id: txId }); toast({ title: "Withdrawal approved" }); fetchAll(); } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); } };
  const handleRejectWithdrawal = async (txId: string) => { await invokeAdmin("reject_withdrawal", { transaction_id: txId, reason: "Rejected by admin" }); toast({ title: "Withdrawal rejected" }); fetchAll(); };
  const handleUpdatePrivileges = async (userId: string, updates: any) => { await invokeAdmin("update_privileges", { user_id: userId, ...updates }); toast({ title: "Privileges updated" }); setEditingUser(null); fetchAll(); };
  const handleFlagUser = async (userId: string, flag: boolean) => { await invokeAdmin(flag ? "flag_user" : "unflag_user", { user_id: userId }); toast({ title: flag ? "User flagged" : "User unflagged" }); fetchAll(); };
  const handleIgnoreFlag = async (userId: string) => { await invokeAdmin("ignore_flag", { user_id: userId }); toast({ title: "Flag ignored, privileges restored" }); fetchAll(); };
  const handleAddAdmin = async (userId: string) => { try { await invokeAdmin("add_admin", { user_id: userId }); toast({ title: "Admin role added" }); fetchAll(); } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); } };
  const handleRemoveAdmin = async (userId: string) => { try { await invokeAdmin("remove_admin", { user_id: userId }); toast({ title: "Admin role removed" }); fetchAll(); } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); } };
  const handlePostAnnouncement = async () => { if (!newAnnTitle || !newAnnContent) return; await supabase.from("announcements").insert({ title: newAnnTitle, content: newAnnContent, created_by: session?.user?.id, audience: newAnnAudience } as any); toast({ title: "Announcement posted!" }); setNewAnnTitle(""); setNewAnnContent(""); setNewAnnAudience("all"); fetchAll(); };
  const handleDeleteAnnouncement = async (id: string) => { await supabase.from("announcements").delete().eq("id", id); toast({ title: "Deleted" }); fetchAll(); };
  const handleUpdateSetting = async (key: string, value: string) => { await invokeAdmin("update_setting", { key, value }); toast({ title: `Setting updated` }); };
  const handleRespondFeatureRequest = async (id: string, response: string, status: string) => { await invokeAdmin("respond_feature_request", { request_id: id, response, status }); toast({ title: "Response sent" }); setFrResponse(""); fetchAll(); };
  const handleUpdatePackage = async () => {
    if (!editingPkg) return;
    await invokeAdmin("update_package", { package_id: editingPkg.id, name: editingPkg.name, price: Number(editingPkg.price), tx_limit: Number(editingPkg.tx_limit), endpoint_limit: Number(editingPkg.endpoint_limit), description: editingPkg.description });
    toast({ title: "Package updated" }); setEditingPkg(null); fetchAll();
  };
  const handleEditBalance = async () => {
    if (!balanceEdit.userId || !balanceEdit.amount) return;
    await invokeAdmin("edit_balance", { user_id: balanceEdit.userId, wallet_type: balanceEdit.walletType, amount: Number(balanceEdit.amount) });
    toast({ title: "Balance updated" }); setShowBalanceDialog(false); setBalanceEdit({ userId: "", walletType: "income", amount: "" }); fetchAll();
  };
  const handleApproveChannel = async () => {
    if (!channelApproval || !channelId) return;
    await invokeAdmin("approve_channel", { channel_id: channelApproval.id, swiftwallet_channel_id: channelId });
    toast({ title: "Channel approved" }); setChannelApproval(null); setChannelId(""); fetchAll();
  };
  const handleRejectChannel = async (id: string) => {
    await invokeAdmin("reject_channel", { channel_id: id });
    toast({ title: "Channel rejected" }); fetchAll();
  };

  const viewKycDoc = async (filePath: string) => {
    if (kycImages[filePath]) { setViewingKycUser(filePath); return; }
    const data = await invokeAdmin("get_kyc_file_url", { file_path: filePath });
    if (data?.url) { setKycImages(prev => ({ ...prev, [filePath]: data.url })); setViewingKycUser(filePath); }
  };

  const filteredUsers = users.filter(u => (u.full_name || "").toLowerCase().includes(userSearch.toLowerCase()) || (u.email || "").toLowerCase().includes(userSearch.toLowerCase()));
  const filteredKyc = kycFilter === "all" ? kycDocs : kycDocs.filter((d: any) => d.status === kycFilter);
  const uniqueKycUsers = [...new Set(filteredKyc.map((d: any) => d.user_id))];
  const filteredTx = allTransactions.filter((tx: any) => (tx.external_reference || "").toLowerCase().includes(txSearch.toLowerCase()) || (tx.phone || "").includes(txSearch) || (tx.mpesa_receipt || "").toLowerCase().includes(txSearch.toLowerCase()));
  const pendingChannels = channels.filter((c: any) => c.status === "pending");
  const pieData = stats.statusBreakdown ? Object.entries(stats.statusBreakdown).filter(([, v]) => (v as number) > 0).map(([name, value]) => ({ name, value })) : [];
  const chartConfig = { deposits: { label: "Deposits", color: "hsl(160 84% 39%)" }, withdrawals: { label: "Withdrawals", color: "hsl(38 92% 50%)" } };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center"><Shield className="w-6 h-6 text-white" /></div>
        <div><h1 className="text-2xl font-black text-foreground">Admin Command Center</h1><p className="text-sm text-muted-foreground">Full platform control</p></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Users", value: stats.users, icon: Users, gradient: "from-blue-500 to-blue-600" },
          { label: "Transactions", value: stats.transactions, icon: BarChart3, gradient: "from-emerald-500 to-emerald-600" },
          { label: "Revenue", value: `KES ${(stats.revenue || 0).toLocaleString()}`, icon: DollarSign, gradient: "from-purple-500 to-purple-600" },
          { label: "Endpoints", value: stats.endpoints, icon: Zap, gradient: "from-amber-500 to-amber-600" },
          { label: "Pending KYC", value: stats.pendingKyc || 0, icon: Clock, gradient: "from-orange-500 to-orange-600" },
          { label: "Pending W/D", value: stats.pendingWithdrawals || 0, icon: AlertTriangle, gradient: "from-red-500 to-red-600" },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className={`rounded-2xl bg-gradient-to-br ${s.gradient} p-4 text-white`}>
              <s.icon className="w-5 h-5 mb-2 opacity-80" />
              <div className="text-xl font-black">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> 30-Day Volume</CardTitle></CardHeader>
          <CardContent>
            {(stats.chartData || []).length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <BarChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" tickFormatter={(v) => v.split("-").slice(1).join("/")} className="text-xs" /><YAxis className="text-xs" /><ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="deposits" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} /><Bar dataKey="withdrawals" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : <p className="text-center text-muted-foreground py-8 text-sm">No data</p>}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> User Distribution</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            {pieData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={140} height={140}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60}>{pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer>
                <div className="space-y-2">{pieData.map((d, i) => (<div key={d.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} /><span className="text-xs capitalize text-foreground font-medium">{d.name}: {d.value as number}</span></div>))}</div>
              </div>
            ) : <p className="text-muted-foreground text-sm">No data</p>}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="users"><Users className="w-3.5 h-3.5 mr-1" /> Users</TabsTrigger>
          <TabsTrigger value="kyc"><Shield className="w-3.5 h-3.5 mr-1" /> KYC</TabsTrigger>
          <TabsTrigger value="transactions"><BarChart3 className="w-3.5 h-3.5 mr-1" /> Transactions</TabsTrigger>
          <TabsTrigger value="withdrawals"><ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Withdrawals</TabsTrigger>
          <TabsTrigger value="channels"><Radio className="w-3.5 h-3.5 mr-1" /> Channels ({pendingChannels.length})</TabsTrigger>
          <TabsTrigger value="fees"><DollarSign className="w-3.5 h-3.5 mr-1" /> Fees & Packages</TabsTrigger>
          <TabsTrigger value="finance"><TrendingUp className="w-3.5 h-3.5 mr-1" /> Finance</TabsTrigger>
          <TabsTrigger value="devai"><Bot className="w-3.5 h-3.5 mr-1" /> Dev AI</TabsTrigger>
          <TabsTrigger value="announcements"><Megaphone className="w-3.5 h-3.5 mr-1" /> Announcements</TabsTrigger>
          <TabsTrigger value="features"><MessageCircle className="w-3.5 h-3.5 mr-1" /> Features</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-3.5 h-3.5 mr-1" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="finance">
          <div className="space-y-6">
            <ProfitWallets />
            <ProviderFees />
            <AdminCards />
            <ArchiveControls />
          </div>
        </TabsContent>


        <TabsContent value="devai">
          <DevAI />
        </TabsContent>


        {/* ===== USERS TAB ===== */}
        <TabsContent value="users">
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-lg">All Users ({users.length})</CardTitle>
                <div className="flex gap-2">
                  <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-9" /></div>
                  <Button size="sm" variant="outline" onClick={() => setShowBalanceDialog(true)}><Wallet className="w-3.5 h-3.5 mr-1" /> Edit Balance</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  {["User", "Email", "Status", "KYC", "Phone", "Roles", "Actions"].map(h => (<th key={h} className="text-left text-xs font-semibold text-muted-foreground px-3 py-2">{h}</th>))}
                </tr></thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <div className="text-sm font-semibold text-foreground">{u.full_name || "Unnamed"}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{u.id.slice(0, 12)}...</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{u.email || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`status-pill ${statusColors[u.account_status] || ""} capitalize`}>{u.account_status}</span>
                        {u.banned && <span className="status-pill bg-destructive/10 text-destructive ml-1">Banned</span>}
                        {u.flagged && <span className="status-pill bg-amber-500/10 text-amber-500 ml-1">Flagged</span>}
                      </td>
                      <td className="px-3 py-2"><span className={`text-xs font-medium capitalize ${u.kyc_status === "approved" ? "text-emerald-500" : u.kyc_status === "pending" ? "text-amber-500" : u.kyc_status === "rejected" ? "text-destructive" : "text-muted-foreground"}`}>{(u.kyc_status || "").replace("_", " ")}</span></td>
                      <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{u.phone || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 flex-wrap">{(u.roles || []).map((r: string) => (<span key={r} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r === "admin" ? "bg-red-500/10 text-red-500" : r === "grand_admin" ? "bg-purple-500/10 text-purple-500" : "bg-muted text-muted-foreground"}`}>{r}</span>))}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => setEditingUser(u)}><Edit className="w-3 h-3 mr-1" /> Manage</Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleBan(u.id, !u.banned)} title={u.banned ? "Unban" : "Ban"}>{u.banned ? <UserCheck className="w-3 h-3 text-emerald-500" /> : <Ban className="w-3 h-3 text-destructive" />}</Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleFlagUser(u.id, !u.flagged)}><Flag className={`w-3 h-3 ${u.flagged ? "text-amber-500" : "text-muted-foreground"}`} /></Button>
                          {u.flagged && <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-emerald-500" onClick={() => handleIgnoreFlag(u.id)}>Ignore</Button>}
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleToggleActivation(u.id)}><Zap className={`w-3 h-3 ${u.activation_paid ? "text-emerald-500" : "text-muted-foreground"}`} /></Button>
                          {!(u.roles || []).includes("admin") && <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleAddAdmin(u.id)}><Crown className="w-3 h-3 text-primary" /></Button>}
                          {(u.roles || []).includes("admin") && <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemoveAdmin(u.id)}><XCircle className="w-3 h-3 text-destructive" /></Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== KYC TAB (ALL HISTORY) ===== */}
        <TabsContent value="kyc">
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-lg">KYC Documents ({kycDocs.length})</CardTitle>
                <Select value={kycFilter} onValueChange={setKycFilter}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {uniqueKycUsers.length === 0 ? <p className="text-center text-muted-foreground py-8">No KYC documents found</p> : (
                <div className="space-y-4">
                  {uniqueKycUsers.map(userId => {
                    const userDocs = filteredKyc.filter((d: any) => d.user_id === userId);
                    const userName = userDocs[0]?.user_name || "Unknown";
                    const allPending = userDocs.every((d: any) => d.status === "pending");
                    const allApproved = userDocs.every((d: any) => d.status === "approved");
                    return (
                      <div key={String(userId)} className="p-4 rounded-xl border border-border bg-muted/20">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <div>
                            <p className="text-sm font-bold text-foreground">{userName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{String(userId).slice(0, 12)}...</p>
                          </div>
                          <div className="flex gap-2">
                            {allApproved ? <span className="text-xs font-bold text-emerald-500">✅ Approved</span> : (
                              <>
                                <Button size="sm" className="bg-emerald-500 text-white btn-press" onClick={() => handleKyc(String(userId), "approve")}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve</Button>
                                <Button size="sm" variant="destructive" className="btn-press" onClick={() => handleKyc(String(userId), "reject")}><XCircle className="w-3.5 h-3.5 mr-1" /> Reject</Button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-2">
                          {userDocs.map((doc: any) => (
                            <button key={doc.id} onClick={() => viewKycDoc(doc.file_url)} className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors text-left">
                              <Image className="w-4 h-4 text-primary" />
                              <div>
                                <span className="text-xs font-semibold text-foreground capitalize">{doc.document_type.replace("_", " ")}</span>
                                <p className={`text-[10px] capitalize ${doc.status === "approved" ? "text-emerald-500" : doc.status === "rejected" ? "text-destructive" : "text-amber-500"}`}>{doc.status}</p>
                              </div>
                              <Eye className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TRANSACTIONS TAB ===== */}
        <TabsContent value="transactions">
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-lg">All Transactions ({allTransactions.length})</CardTitle>
                <div className="relative w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search ref, phone, receipt..." value={txSearch} onChange={(e) => setTxSearch(e.target.value)} className="pl-9" /></div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">{["Ref", "User", "Type", "Gateway", "Amount", "Fee", "Phone", "Status", "Receipt", "Date"].map(h => (<th key={h} className="text-left text-xs font-semibold text-muted-foreground px-3 py-2">{h}</th>))}</tr></thead>
                <tbody>
                  {filteredTx.slice(0, 200).map((tx: any) => {
                    const txUser = users.find(u => u.id === tx.user_id);
                    const isOpen = expandedTx === tx.id;
                    return (
                      <Fragment key={tx.id}>
                      <tr className="border-b border-border/50 hover:bg-muted/20 cursor-pointer" onClick={() => setExpandedTx(isOpen ? null : tx.id)}>
                        <td className="px-3 py-2 text-xs font-mono text-foreground">{tx.external_reference || tx.id.slice(0, 8)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{txUser?.full_name || tx.user_id.slice(0, 8)}</td>
                        <td className="px-3 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${tx.type === "deposit" ? "bg-emerald-500/10 text-emerald-500" : tx.type === "withdrawal" ? "bg-amber-500/10 text-amber-500" : tx.type === "endpoint" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{tx.type}</span></td>
                        <td className="px-3 py-2 text-[10px] capitalize text-muted-foreground">{tx.provider || "—"}</td>
                        <td className="px-3 py-2 text-xs font-bold text-foreground">KES {Number(tx.amount).toLocaleString()}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">KES {Number(tx.fee)}</td>
                        <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{tx.phone || "—"}</td>
                        <td className="px-3 py-2"><span className={`text-[10px] font-bold capitalize ${tx.status === "completed" ? "text-emerald-500" : tx.status === "pending" ? "text-amber-500" : "text-destructive"}`}>{tx.status}</span>{tx.verified_via && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground capitalize">via {tx.verified_via}</span>}</td>
                        <td className="px-3 py-2 text-[10px] font-mono text-primary">{tx.mpesa_receipt || "—"}</td>
                        <td className="px-3 py-2 text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-muted/10 border-b border-border/50">
                          <td colSpan={10} className="px-4 py-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div><div className="text-muted-foreground">Transaction ID</div><div className="font-mono break-all">{tx.id}</div></div>
                              <div><div className="text-muted-foreground">Gateway</div><div className="capitalize">{tx.provider || "swiftwallet"}</div></div>
                              <div><div className="text-muted-foreground">Wallet</div><div className="capitalize">{tx.wallet_type || "—"}</div></div>
                              <div><div className="text-muted-foreground">Checkout ID</div><div className="font-mono break-all">{tx.swiftwallet_checkout_id || "—"}</div></div>
                              <div><div className="text-muted-foreground">Endpoint</div><div className="font-mono break-all">{tx.endpoint_id || "—"}</div></div>
                              <div><div className="text-muted-foreground">Profit allocated</div><div>{tx.profit_allocated ? "Yes" : "No"}</div></div>
                              <div><div className="text-muted-foreground">Flagged</div><div>{tx.flagged ? "Yes" : "No"}</div></div>
                              <div><div className="text-muted-foreground">Updated</div><div>{new Date(tx.updated_at).toLocaleString()}</div></div>
                              {tx.error_message && <div className="col-span-full"><div className="text-muted-foreground">Gateway error</div><div className="text-red-500">{tx.error_message}</div></div>}
                              {tx.admin_review_notes && <div className="col-span-full"><div className="text-muted-foreground">Admin notes</div><div>{tx.admin_review_notes}</div></div>}
                              {tx.callback_data && (
                                <div className="col-span-full">
                                  <div className="text-muted-foreground mb-1">Gateway response</div>
                                  <pre className="p-2 rounded bg-muted/50 overflow-x-auto text-[10px] max-h-64">{JSON.stringify(tx.callback_data, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== WITHDRAWALS TAB (ALL HISTORY) ===== */}
        <TabsContent value="withdrawals">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-lg">All Withdrawals ({allWithdrawals.length})</CardTitle></CardHeader>
            <CardContent>
              {allWithdrawals.length === 0 ? <p className="text-center text-muted-foreground py-8">No withdrawals</p> : (
                <div className="space-y-3">
                  {allWithdrawals.map((tx: any) => {
                    const txUser = users.find(u => u.id === tx.user_id);
                    return (
                      <div key={tx.id} className="flex items-center gap-4 p-4 rounded-xl border border-border">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.status === "completed" ? "bg-emerald-500/10" : tx.status === "pending" ? "bg-amber-500/10" : "bg-destructive/10"}`}>
                          {tx.status === "completed" ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : tx.status === "pending" ? <Clock className="w-5 h-5 text-amber-500" /> : <XCircle className="w-5 h-5 text-destructive" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-foreground">KES {Number(tx.amount).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{txUser?.full_name || "Unknown"} • {tx.phone} • {new Date(tx.created_at).toLocaleString()}</div>
                          <span className={`text-[10px] font-bold capitalize ${tx.status === "completed" ? "text-emerald-500" : tx.status === "pending" ? "text-amber-500" : "text-destructive"}`}>{tx.status}</span>
                          {tx.verified_via && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground capitalize">via {tx.verified_via}</span>}
                          {tx.mpesa_receipt && <span className="ml-1 text-[9px] font-mono text-primary">{tx.mpesa_receipt}</span>}
                          {tx.admin_review_notes && <p className="text-[10px] text-muted-foreground italic mt-1">{tx.admin_review_notes}</p>}
                        </div>
                        {tx.status === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-emerald-500 text-white btn-press" onClick={() => handleApproveWithdrawal(tx.id)}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve</Button>
                            <Button size="sm" variant="destructive" className="btn-press" onClick={() => handleRejectWithdrawal(tx.id)}><XCircle className="w-3.5 h-3.5 mr-1" /> Reject</Button>
                          </div>
                        )}
                        {(tx.status === "pending" || tx.status === "failed") && tx.provider === "makamesco" && (
                          <Button size="sm" variant="outline" className="btn-press" onClick={async () => {
                            const receipt = window.prompt("Enter the M-Pesa receipt from the Makamesco log (e.g. UFBK67AREW). This will mark the withdrawal completed and deduct wallets if they were refunded.");
                            if (receipt === null) return;
                            try {
                              await invokeAdmin("reconcile_withdrawal", { transaction_id: tx.id, receipt, note: "Reconciled against Makamesco log" });
                              toast({ title: "Withdrawal reconciled" }); fetchAll();
                            } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
                          }}>Reconcile</Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== CHANNELS TAB ===== */}
        <TabsContent value="channels">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-lg">Payment Channels ({channels.length})</CardTitle></CardHeader>
            <CardContent>
              {channels.length === 0 ? <p className="text-center text-muted-foreground py-8">No channels submitted</p> : (
                <div className="space-y-3">
                  {channels.map((ch: any) => {
                    const chUser = users.find(u => u.id === ch.user_id);
                    return (
                      <div key={ch.id} className="p-4 rounded-xl border border-border">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <p className="text-sm font-bold text-foreground">{ch.name} <span className="text-[10px] font-normal text-muted-foreground capitalize">({ch.channel_type})</span></p>
                            <p className="text-xs text-muted-foreground">{chUser?.full_name || "Unknown"} • {ch.business_number}{ch.account_number ? ` / ${ch.account_number}` : ""}{ch.bank_name ? ` • ${ch.bank_name}` : ""}</p>
                            {ch.swiftwallet_channel_id && <p className="text-[10px] text-primary font-mono">SW ID: {ch.swiftwallet_channel_id}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold capitalize ${ch.status === "approved" || ch.status === "active" ? "text-emerald-500" : ch.status === "pending" ? "text-amber-500" : "text-destructive"}`}>{ch.status}</span>
                            {ch.status === "pending" && (
                              <>
                                <Button size="sm" className="bg-emerald-500 text-white" onClick={() => { setChannelApproval(ch); setChannelId(""); }}>Approve</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectChannel(ch.id)}>Reject</Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== FEES & PACKAGES TAB ===== */}
        <TabsContent value="fees">
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Fee Structure</CardTitle>
                {editingFees ? (
                  <div className="flex gap-2"><Button size="sm" onClick={handleSaveFees} className="gradient-primary text-primary-foreground">Save</Button><Button size="sm" variant="outline" onClick={() => setEditingFees(false)}>Cancel</Button></div>
                ) : (
                  <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => { setEditingFees(true); setFeeEdits([...fees]); }}><Edit className="w-4 h-4 mr-1" /> Edit</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">Range (KES)</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">Service Fee</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">Svc Cost</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">Svc Profit</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">W/D Fee</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">W/D Cost</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">W/D Profit</th>
                </tr></thead>
                <tbody>
                  {(editingFees ? feeEdits : fees).map((f, i) => {
                    const svcCost = Number(f.service_cost || 0);
                    const wdCost = Number(f.withdrawal_cost || 0);
                    const svcProfit = Number(f.service_fee) - svcCost;
                    const wdProfit = Number(f.withdrawal_fee) - wdCost;
                    return (
                      <tr key={f.id} className="border-b border-border/50">
                        <td className="py-2 px-3 text-foreground">{Number(f.min_amount).toLocaleString()} – {Number(f.max_amount).toLocaleString()}</td>
                        <td className="py-2 px-3">{editingFees ? <Input type="number" value={f.service_fee} onChange={(e) => { const n = [...feeEdits]; n[i].service_fee = Number(e.target.value); setFeeEdits(n); }} className="h-8 w-20" /> : <span className="font-medium text-foreground">KES {Number(f.service_fee)}</span>}</td>
                        <td className="py-2 px-3">{editingFees ? <Input type="number" value={f.service_cost || 0} onChange={(e) => { const n = [...feeEdits]; n[i].service_cost = Number(e.target.value); setFeeEdits(n); }} className="h-8 w-20" /> : <span className="text-muted-foreground">KES {svcCost}</span>}</td>
                        <td className="py-2 px-3"><span className={`font-bold ${svcProfit > 0 ? "text-emerald-500" : "text-destructive"}`}>KES {svcProfit}</span></td>
                        <td className="py-2 px-3">{editingFees ? <Input type="number" value={f.withdrawal_fee} onChange={(e) => { const n = [...feeEdits]; n[i].withdrawal_fee = Number(e.target.value); setFeeEdits(n); }} className="h-8 w-20" /> : <span className="font-medium text-foreground">KES {Number(f.withdrawal_fee)}</span>}</td>
                        <td className="py-2 px-3">{editingFees ? <Input type="number" value={f.withdrawal_cost || 0} onChange={(e) => { const n = [...feeEdits]; n[i].withdrawal_cost = Number(e.target.value); setFeeEdits(n); }} className="h-8 w-20" /> : <span className="text-muted-foreground">KES {wdCost}</span>}</td>
                        <td className="py-2 px-3"><span className={`font-bold ${wdProfit > 0 ? "text-emerald-500" : "text-destructive"}`}>KES {wdProfit}</span></td>
                        
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card className="mt-4 rounded-2xl">
            <CardHeader><CardTitle className="text-lg">Packages & Limits</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="p-4 rounded-xl border border-border bg-muted/20">
                    <h4 className="font-bold text-foreground mb-2 capitalize">{pkg.name}</h4>
                    <p className="text-xs text-muted-foreground">Price: <strong className="text-primary">KES {Number(pkg.price).toLocaleString()}/mo</strong></p>
                    <p className="text-xs text-muted-foreground">Transactions: <strong className="text-foreground">{pkg.tx_limit === -1 ? "Unlimited" : `${pkg.tx_limit}/mo`}</strong></p>
                    <p className="text-xs text-muted-foreground">Endpoints: <strong className="text-foreground">{pkg.endpoint_limit === -1 ? "Unlimited" : pkg.endpoint_limit}</strong></p>
                    <Button size="sm" variant="outline" className="mt-3 w-full text-xs" onClick={() => setEditingPkg({ ...pkg })}><Edit className="w-3 h-3 mr-1" /> Edit</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ANNOUNCEMENTS ===== */}
        <TabsContent value="announcements">
          <Card className="rounded-2xl mb-4">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" /> Post Announcement</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Title" value={newAnnTitle} onChange={(e) => setNewAnnTitle(e.target.value)} />
              <Textarea placeholder="Content..." value={newAnnContent} onChange={(e) => setNewAnnContent(e.target.value)} rows={3} />
              <div>
                <Label className="text-xs text-muted-foreground mb-1">Target Audience</Label>
                <Select value={newAnnAudience} onValueChange={setNewAnnAudience}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="active_package">Active Package Holders</SelectItem>
                    <SelectItem value="active">Active Accounts</SelectItem>
                    <SelectItem value="beginner">Beginners</SelectItem>
                    <SelectItem value="idle">Idle Accounts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="gradient-primary text-primary-foreground" onClick={handlePostAnnouncement} disabled={!newAnnTitle || !newAnnContent}><Plus className="w-4 h-4 mr-1" /> Post</Button>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="pt-6">
              {announcements.map((a: any) => (
                <div key={a.id} className="p-4 rounded-xl border border-border flex items-start gap-3 mb-3">
                  <Megaphone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-foreground">{a.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{a.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary capitalize">{(a.audience || "all").replace("_", " ")}</span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteAnnouncement(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== FEATURES ===== */}
        <TabsContent value="features">
          <Card className="rounded-2xl"><CardContent className="pt-6">
            {featureRequests.map((fr: any) => (
              <div key={fr.id} className="p-4 rounded-xl border border-border mb-3">
                <div className="flex items-start justify-between gap-3">
                  <div><h4 className="text-sm font-bold text-foreground">{fr.title}</h4><p className="text-xs text-muted-foreground mt-1">{fr.description}</p><span className={`text-[10px] font-bold mt-2 inline-block capitalize ${fr.status === "approved" ? "text-emerald-500" : fr.status === "rejected" ? "text-destructive" : "text-amber-500"}`}>{fr.status}</span>{fr.admin_response && <p className="text-xs text-primary mt-1 italic">Admin: {fr.admin_response}</p>}</div>
                  <span className="text-xs text-muted-foreground">{fr.votes} votes</span>
                </div>
                {fr.status === "pending" && (
                  <div className="mt-3 flex gap-2 items-end"><Input placeholder="Response..." className="flex-1 h-8 text-xs" value={frResponse} onChange={(e) => setFrResponse(e.target.value)} /><Button size="sm" className="h-8 bg-emerald-500 text-white" onClick={() => handleRespondFeatureRequest(fr.id, frResponse, "approved")}>Approve</Button><Button size="sm" variant="destructive" className="h-8" onClick={() => handleRespondFeatureRequest(fr.id, frResponse, "rejected")}>Reject</Button></div>
                )}
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        {/* ===== SETTINGS ===== */}
        <TabsContent value="settings">
          <Card className="rounded-2xl mb-4"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Settings className="w-5 h-5" /> Payment Providers</CardTitle></CardHeader><CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Choose which gateway handles each payment flow. Changes apply immediately to new transactions.</p>
            {[
              { key: "provider_deposits", label: "Deposits (user top-ups)" },
              { key: "provider_endpoints", label: "Endpoint Payments (developer API)" },
              { key: "provider_withdrawals", label: "Withdrawals (B2C payouts)" },
            ].map(s => (
              <div key={s.key} className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">{s.label}</Label>
                  <Select value={settingEdits[s.key] || "swiftwallet"} onValueChange={(v) => setSettingEdits(prev => ({ ...prev, [s.key]: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="swiftwallet">SwiftWallet</SelectItem>
                      <SelectItem value="makamesco">Makamesco Nexus Pay</SelectItem>
                      <SelectItem value="mpay">M-Pay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => handleUpdateSetting(s.key, settingEdits[s.key] || "swiftwallet")}>Save</Button>
              </div>
            ))}
          </CardContent></Card>
          <Card className="rounded-2xl mb-4"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Settings className="w-5 h-5" /> Makamesco & M-Pay</CardTitle></CardHeader><CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Makamesco deposit destination</Label>
              <div className="flex gap-3 mt-1">
                <Select value={settingEdits["makamesco_deposit_destination"] || "payments"} onValueChange={(v) => setSettingEdits(prev => ({ ...prev, makamesco_deposit_destination: v }))}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payments">Payments wallet (collection — default)</SelectItem>
                    <SelectItem value="b2c">B2C wallet (fund withdrawal float)</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => handleUpdateSetting("makamesco_deposit_destination", settingEdits["makamesco_deposit_destination"] || "payments")}>Save</Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Affects new Makamesco STK pushes. 'B2C wallet' calls /api/b2c/wallet/topup instead of /api/payments/stkpush.</p>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1"><Label className="text-xs text-muted-foreground">M-Pay default payment_id (fallback when channel has none)</Label><Input value={settingEdits["mpay_default_payment_id"] || ""} onChange={(e) => setSettingEdits(prev => ({ ...prev, mpay_default_payment_id: e.target.value }))} className="mt-1" /></div>
              <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => handleUpdateSetting("mpay_default_payment_id", settingEdits["mpay_default_payment_id"] || "")}>Save</Button>
            </div>
          </CardContent></Card>
          <Card className="rounded-2xl"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Settings className="w-5 h-5" /> Platform Settings</CardTitle></CardHeader><CardContent className="space-y-4">
            {[{ key: "support_whatsapp", label: "WhatsApp Support Number" }, { key: "support_prefilled_message", label: "WhatsApp Prefilled Message" }].map(s => (
              <div key={s.key} className="flex items-end gap-3"><div className="flex-1"><Label className="text-xs text-muted-foreground">{s.label}</Label><Input value={settingEdits[s.key] || ""} onChange={(e) => setSettingEdits(prev => ({ ...prev, [s.key]: e.target.value }))} className="mt-1" /></div><Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => handleUpdateSetting(s.key, settingEdits[s.key] || "")}>Save</Button></div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOGS ===== */}

      {/* User Management Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Manage User — {editingUser?.full_name}</DialogTitle></DialogHeader>
          {editingUser && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 rounded-lg bg-muted/50"><span className="text-muted-foreground">Email:</span> <span className="font-semibold text-foreground">{editingUser.email}</span></div>
                <div className="p-2 rounded-lg bg-muted/50"><span className="text-muted-foreground">Phone:</span> <span className="font-semibold text-foreground">{editingUser.phone || "—"}</span></div>
                <div className="p-2 rounded-lg bg-muted/50"><span className="text-muted-foreground">Status:</span> <span className="font-semibold text-foreground capitalize">{editingUser.account_status}</span></div>
                <div className="p-2 rounded-lg bg-muted/50"><span className="text-muted-foreground">KYC:</span> <span className="font-semibold text-foreground capitalize">{editingUser.kyc_status?.replace("_", " ")}</span></div>
                <div className="p-2 rounded-lg bg-muted/50"><span className="text-muted-foreground">Referral:</span> <span className="font-semibold text-foreground">{editingUser.referral_code}</span></div>
                <div className="p-2 rounded-lg bg-muted/50"><span className="text-muted-foreground">Joined:</span> <span className="font-semibold text-foreground">{new Date(editingUser.created_at).toLocaleDateString()}</span></div>
              </div>
              <div className="border-t border-border pt-3">
                <h4 className="text-sm font-bold text-foreground mb-3">Privileges</h4>
                {[{ key: "can_deposit", label: "Can Deposit" }, { key: "can_withdraw", label: "Can Withdraw" }, { key: "can_create_endpoints", label: "Can Create Endpoints" }, { key: "withdrawal_review_required", label: "Withdrawal Review Required" }].map(p => (
                  <div key={p.key} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-foreground">{p.label}</span>
                    <Switch checked={editingUser[p.key]} onCheckedChange={(v) => setEditingUser((prev: any) => ({ ...prev, [p.key]: v }))} />
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3">
                <h4 className="text-sm font-bold text-foreground mb-2">Disabled gateways for this user</h4>
                <div className="flex gap-3 flex-wrap">
                  {(["swiftwallet","makamesco","mpay"] as const).map(p => {
                    const disabled: string[] = editingUser.disabled_providers || [];
                    const checked = disabled.includes(p);
                    return (
                      <label key={p} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={(e) => {
                          const next = e.target.checked ? Array.from(new Set([...disabled, p])) : disabled.filter(x => x !== p);
                          setEditingUser((prev: any) => ({ ...prev, disabled_providers: next }));
                        }} />
                        Block {p}
                      </label>
                    );
                  })}
                </div>
                <Button size="sm" variant="outline" className="mt-2" onClick={async () => {
                  await invokeAdmin("update_disabled_providers", { user_id: editingUser.id, providers: editingUser.disabled_providers || [] });
                  toast({ title: "Gateway permissions updated" }); fetchAll();
                }}>Save gateway permissions</Button>
              </div>
              <Button className="w-full gradient-primary text-primary-foreground" onClick={() => handleUpdatePrivileges(editingUser.id, { can_deposit: editingUser.can_deposit, can_withdraw: editingUser.can_withdraw, can_create_endpoints: editingUser.can_create_endpoints, withdrawal_review_required: editingUser.withdrawal_review_required })}>Save Privileges</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* KYC Viewer */}
      <Dialog open={!!viewingKycUser} onOpenChange={() => setViewingKycUser(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>KYC Document</DialogTitle></DialogHeader>{viewingKycUser && kycImages[viewingKycUser] && <img src={kycImages[viewingKycUser]} alt="KYC" className="w-full rounded-lg" />}</DialogContent>
      </Dialog>

      {/* Balance Edit Dialog */}
      <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Edit User Balance</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>User ID</Label>
              <Select value={balanceEdit.userId} onValueChange={(v) => setBalanceEdit(prev => ({ ...prev, userId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent className="max-h-60">{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email} ({u.id.slice(0, 8)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Wallet Type</Label>
              <Select value={balanceEdit.walletType} onValueChange={(v) => setBalanceEdit(prev => ({ ...prev, walletType: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="income">Income</SelectItem><SelectItem value="service">Service</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>New Balance (KES)</Label><Input type="number" value={balanceEdit.amount} onChange={(e) => setBalanceEdit(prev => ({ ...prev, amount: e.target.value }))} className="mt-1" /></div>
            <Button className="w-full gradient-primary text-primary-foreground" onClick={handleEditBalance} disabled={!balanceEdit.userId || !balanceEdit.amount}>Update Balance</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Package Edit Dialog */}
      <Dialog open={!!editingPkg} onOpenChange={() => setEditingPkg(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Edit Package</DialogTitle></DialogHeader>
          {editingPkg && (
            <div className="space-y-4 mt-2">
              <div><Label>Name</Label><Input value={editingPkg.name} onChange={(e) => setEditingPkg((p: any) => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
              <div><Label>Description</Label><Textarea value={editingPkg.description} onChange={(e) => setEditingPkg((p: any) => ({ ...p, description: e.target.value }))} className="mt-1" rows={2} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Price (KES)</Label><Input type="number" value={editingPkg.price} onChange={(e) => setEditingPkg((p: any) => ({ ...p, price: e.target.value }))} className="mt-1" /></div>
                <div><Label>Tx Limit</Label><Input type="number" value={editingPkg.tx_limit} onChange={(e) => setEditingPkg((p: any) => ({ ...p, tx_limit: e.target.value }))} className="mt-1" /></div>
                <div><Label>EP Limit</Label><Input type="number" value={editingPkg.endpoint_limit} onChange={(e) => setEditingPkg((p: any) => ({ ...p, endpoint_limit: e.target.value }))} className="mt-1" /></div>
              </div>
              <Button className="w-full gradient-primary text-primary-foreground" onClick={handleUpdatePackage}>Save Package</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Channel Approval Dialog */}
      <Dialog open={!!channelApproval} onOpenChange={() => setChannelApproval(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Approve Channel</DialogTitle></DialogHeader>
          {channelApproval && (
            <div className="space-y-4 mt-2">
              <div className="p-3 rounded-xl bg-muted/50 text-xs space-y-1">
                <p><strong>Name:</strong> {channelApproval.name}</p>
                <p><strong>Type:</strong> {channelApproval.channel_type}</p>
                <p><strong>Business #:</strong> {channelApproval.business_number}</p>
                {channelApproval.account_number && <p><strong>Account #:</strong> {channelApproval.account_number}</p>}
                {channelApproval.bank_name && <p><strong>Bank:</strong> {channelApproval.bank_name}</p>}
              </div>
              <div><Label>SwiftWallet Channel ID *</Label><Input placeholder="Enter the channel ID from SwiftWallet" value={channelId} onChange={(e) => setChannelId(e.target.value)} className="mt-1" /></div>
              <p className="text-[10px] text-muted-foreground">Create this channel on SwiftWallet first, then enter the resulting channel ID here.</p>
              <Button className="w-full gradient-primary text-primary-foreground" onClick={handleApproveChannel} disabled={!channelId}>Approve Channel</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
