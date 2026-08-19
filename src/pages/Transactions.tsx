import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search, Download, ArrowUpRight, ArrowDownRight, Send,
  CheckCircle2, Clock, XCircle, Filter, Calendar, TrendingUp,
  Wallet, CreditCard, Hash, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { exportTransactionsPDF } from "@/lib/pdf-export";
import { generateReceipt } from "@/lib/receipt";

const statusIcon: Record<string, JSX.Element> = {
  completed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  pending: <Clock className="w-4 h-4 text-amber-500" />,
  failed: <XCircle className="w-4 h-4 text-red-500" />,
};

const statusColor: Record<string, string> = {
  completed: "text-emerald-500",
  pending: "text-amber-500",
  failed: "text-red-500",
};

const typeConfig: Record<string, { icon: any; bg: string; color: string; label: string }> = {
  deposit: { icon: ArrowDownRight, bg: "bg-emerald-500/10", color: "text-emerald-500", label: "Deposit" },
  withdrawal: { icon: ArrowUpRight, bg: "bg-amber-500/10", color: "text-amber-500", label: "Withdrawal" },
  endpoint: { icon: Zap, bg: "bg-blue-500/10", color: "text-blue-500", label: "Endpoint" },
  transfer: { icon: Send, bg: "bg-purple-500/10", color: "text-purple-500", label: "Transfer" },
  activation_fee: { icon: CreditCard, bg: "bg-rose-500/10", color: "text-rose-500", label: "Activation" },
};

export default function Transactions() {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchTransactions();
    const channel = supabase
      .channel("tx-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` }, () => fetchTransactions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    const { data } = await supabase.from("transactions").select("*").eq("user_id", user.id).is("archived_at", null).order("created_at", { ascending: false });
    setTransactions((data as any[]) || []);
    setLoading(false);
  };

  const filtered = transactions.filter((tx) => {
    const matchesSearch = (tx.external_reference || "").toLowerCase().includes(search.toLowerCase()) ||
      (tx.phone || "").includes(search) || (tx.mpesa_receipt || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalDeposits = transactions.filter(t => (t.type === "deposit" || t.type === "endpoint") && t.status === "completed").reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdrawals = transactions.filter(t => t.type === "withdrawal" && t.status === "completed").reduce((s, t) => s + Number(t.amount), 0);
  const successRate = transactions.length > 0 ? Math.round((transactions.filter(t => t.status === "completed").length / transactions.length) * 100) : 0;
  const completedCount = transactions.filter(t => t.status === "completed").length;

  const safeStatusNote = (tx: any) => {
    if (tx.status === "pending") return "Waiting for payment confirmation.";
    if (tx.status === "failed") return tx.type === "withdrawal" ? "Withdrawal was not completed." : "Payment was not completed.";
    return "Transaction completed successfully.";
  };

  const handleExport = (format: string) => {
    const blob = new Blob([
      format === "csv"
        ? "ID,Reference,Type,Amount,Phone,Status,Date,M-Pesa Receipt\n" +
          filtered.map(tx => `${tx.id},${tx.external_reference || ""},${tx.type},${tx.amount},${tx.phone || ""},${tx.status},${tx.created_at},${tx.mpesa_receipt || ""}`).join("\n")
        : JSON.stringify(filtered.map(({ id, external_reference, type, amount, phone, status, created_at, updated_at, mpesa_receipt, wallet_type }) => ({ id, external_reference, type, amount, phone, status, created_at, updated_at, mpesa_receipt, wallet_type })), null, 2)
    ], { type: format === "csv" ? "text/csv" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brightpay-transactions.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Deposits", value: `KES ${totalDeposits.toLocaleString()}`, icon: ArrowDownRight, gradient: "from-emerald-500 to-emerald-600", iconBg: "bg-emerald-400/20" },
          { label: "Total Withdrawals", value: `KES ${totalWithdrawals.toLocaleString()}`, icon: ArrowUpRight, gradient: "from-amber-500 to-amber-600", iconBg: "bg-amber-400/20" },
          { label: "Success Rate", value: `${successRate}%`, icon: TrendingUp, gradient: "from-blue-500 to-blue-600", iconBg: "bg-blue-400/20" },
          { label: "Completed", value: completedCount.toLocaleString(), icon: Hash, gradient: "from-purple-500 to-purple-600", iconBg: "bg-purple-400/20" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className={`rounded-2xl bg-gradient-to-br ${stat.gradient} p-5 text-white`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] opacity-70">Live</span>
              </div>
              <div className="text-2xl font-black tracking-tight">{stat.value}</div>
              <div className="text-xs mt-1 opacity-75">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} transaction{filtered.length !== 1 ? "s" : ""} found</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="btn-press" onClick={() => handleExport("csv")}><Download className="w-4 h-4 mr-1" /> CSV</Button>
          <Button variant="outline" size="sm" className="btn-press" onClick={() => handleExport("json")}><Download className="w-4 h-4 mr-1" /> JSON</Button>
          <Button variant="outline" size="sm" className="btn-press" onClick={() => exportTransactionsPDF(filtered, profile?.full_name)}><Download className="w-4 h-4 mr-1" /> PDF</Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by ref, phone, receipt..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">✅ Completed</SelectItem>
                <SelectItem value="pending">⏳ Pending</SelectItem>
                <SelectItem value="failed">❌ Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">💰 Deposit</SelectItem>
                <SelectItem value="withdrawal">💸 Withdrawal</SelectItem>
                <SelectItem value="endpoint">⚡ Endpoint</SelectItem>
                <SelectItem value="transfer">📤 Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <div className="space-y-3">
        {loading ? (
          <Card className="rounded-2xl"><CardContent className="p-12 text-center text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading transactions...
          </CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl"><CardContent className="p-12 text-center text-muted-foreground">
            <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium text-foreground">No transactions found</p>
            <p className="text-sm">Try adjusting your filters or make your first deposit.</p>
          </CardContent></Card>
        ) : filtered.map((tx, i) => {
          const tc = typeConfig[tx.type] || typeConfig.deposit;
          const TxIcon = tc.icon;
          const isOpen = expanded === tx.id;
          return (
            <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className="rounded-2xl hover:shadow-md transition-shadow border-border/60">
                <CardContent className="p-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : tx.id)}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${tc.bg} flex items-center justify-center flex-shrink-0`}>
                      <TxIcon className={`w-5 h-5 ${tc.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">{tx.external_reference || tx.id.slice(0, 8)}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${tc.bg} ${tc.color}`}>
                          {tc.label}
                        </span>
                        {tx.mpesa_receipt && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-foreground">#{tx.mpesa_receipt}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {tx.phone && <span className="font-mono">{tx.phone}</span>}
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(tx.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-base font-black ${tx.type === "withdrawal" || tx.type === "transfer" ? "text-amber-500" : "text-emerald-500"}`}>
                        {tx.type === "withdrawal" || tx.type === "transfer" ? "-" : "+"}KES {Number(tx.amount).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1 justify-end mt-1">
                        {statusIcon[tx.status]}
                        <span className={`text-xs font-semibold capitalize ${statusColor[tx.status]}`}>{tx.status}</span>
                      </div>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div><div className="text-muted-foreground">Transaction ID</div><div className="font-mono break-all">{tx.id}</div></div>
                      <div><div className="text-muted-foreground">Reference</div><div className="font-mono break-all">{tx.external_reference || "—"}</div></div>
                      <div><div className="text-muted-foreground">Wallet</div><div className="capitalize">{tx.wallet_type || "—"}</div></div>
                      <div><div className="text-muted-foreground">M-Pesa Receipt</div><div className="font-mono">{tx.mpesa_receipt || "—"}</div></div>
                      <div><div className="text-muted-foreground">Amount</div><div>KES {Number(tx.amount).toLocaleString()}</div></div>
                      <div><div className="text-muted-foreground">Updated</div><div>{new Date(tx.updated_at).toLocaleString()}</div></div>
                      <div className="col-span-full"><div className="text-muted-foreground">Status note</div><div className={tx.status === "failed" ? "text-destructive" : "text-foreground"}>{safeStatusNote(tx)}</div></div>
                      <div className="col-span-full"><button onClick={(e) => { e.stopPropagation(); generateReceipt({ ...tx, amount: Number(tx.amount), fee: Number(tx.fee || 0) }); }} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 btn-press font-semibold"><Download className="w-3 h-3" /> Download Receipt</button></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
