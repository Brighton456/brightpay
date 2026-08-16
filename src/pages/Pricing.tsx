import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Layers, Tag, Info, Shield, Calculator, Wallet, Gift, Rocket, Crown, Star, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const packageIcons: Record<string, any> = { Free: Gift, Professional: Rocket, Enterprise: Crown, Elite: Star };
const packageColors: Record<string, string> = { Free: "bg-purple-100 text-purple-600", Professional: "bg-emerald-100 text-emerald-600", Enterprise: "bg-amber-100 text-amber-600", Elite: "bg-rose-100 text-rose-600" };

export default function Pricing() {
  const { profile, serviceBalance } = useAuth();
  const { toast } = useToast();
  const [packages, setPackages] = useState<any[]>([]);
  const [providerFees, setProviderFees] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("swiftwallet");
  const [direction, setDirection] = useState<"deposit" | "withdrawal">("deposit");
  const [calcAmount, setCalcAmount] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("packages").select("*").order("price"),
      supabase.from("provider_fees" as any).select("*").order("provider"),
    ]).then(([pkgRes, pfRes]) => {
      setPackages((pkgRes.data as any[]) || []);
      setProviderFees((pfRes.data as any[]) || []);
    });
  }, []);

  const currentPkg = packages.find(p => p.id === profile?.current_package_id) || packages.find(p => p.price === 0);
  const currentFee = providerFees.find(p => p.provider === selectedProvider);

  const feePct = currentFee ? Number(direction === "deposit" ? currentFee.deposit_fee_pct : currentFee.withdrawal_fee_pct) : 0;
  const costPct = currentFee ? Number(direction === "deposit" ? currentFee.deposit_cost_pct : currentFee.withdrawal_cost_pct) : 0;
  const amt = Number(calcAmount) || 0;
  const feeAmount = (amt * feePct) / 100;
  const costAmount = (amt * costPct) / 100;
  const profitAmount = feeAmount - costAmount;

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-2">
        <Layers className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">API Subscription & Tiers</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Manage your API subscription tier and monitor your monthly request usage</p>

      <div className="rounded-2xl p-6 mb-6 wallet-service text-primary-foreground">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2"><Wallet className="w-4 h-4" /><span className="text-sm opacity-90">Service Wallet Balance</span></div>
            <div className="text-3xl font-extrabold">KES {Number(serviceBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-sm opacity-75 mt-1">Subscription changes are deducted from your service wallet.</p>
          </div>
          <Button className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0" onClick={() => window.location.href = "/deposit"}>+ Top Up Wallet</Button>
        </div>
      </div>

      {/* Packages */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-1">📦 Available Subscription Tiers</h2>
          <p className="text-sm text-muted-foreground mb-4">Choose the plan that best fits your needs</p>
          <div className="grid md:grid-cols-4 gap-4">
            {packages.map((pkg) => {
              const Icon = packageIcons[pkg.name] || Gift;
              const isCurrent = pkg.id === currentPkg?.id;
              const canAfford = serviceBalance >= Number(pkg.price);
              const features = Array.isArray(pkg.features) ? pkg.features : [];
              return (
                <motion.div key={pkg.id} whileHover={{ scale: 1.02 }} className={`relative p-5 rounded-xl border-2 transition-all ${isCurrent ? "border-primary bg-primary/5" : pkg.is_popular ? "border-amber-400" : "border-border"}`}>
                  {isCurrent && <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">Current Plan</div>}
                  {pkg.is_popular && !isCurrent && <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">Most Popular</div>}
                  <div className={`w-12 h-12 rounded-xl ${packageColors[pkg.name] || "bg-muted"} flex items-center justify-center mb-3`}><Icon className="w-6 h-6" /></div>
                  <h3 className="font-bold text-foreground">{pkg.name}</h3>
                  <div className="text-xl font-extrabold text-foreground mt-1">{pkg.price === 0 ? "FREE" : `KES ${Number(pkg.price).toLocaleString()}`}<span className="text-xs font-normal text-muted-foreground">{pkg.price > 0 ? " /month" : ""}</span></div>
                  <div className="p-2 rounded-lg bg-muted/50 my-3 text-center">
                    <div className="text-lg font-bold text-primary">{pkg.tx_limit === -1 ? "Unlimited" : Number(pkg.tx_limit).toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">API Requests/Month</div>
                  </div>
                  <ul className="space-y-1.5 mb-4">
                    {features.map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-foreground"><Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />{f}</li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button disabled className="w-full" variant="outline" size="sm"><Check className="w-3.5 h-3.5 mr-1" /> Current Plan</Button>
                  ) : (
                    <div>
                      <Button className="w-full gradient-primary text-primary-foreground btn-press" size="sm" disabled={!canAfford && pkg.price > 0} onClick={() => toast({ title: "Coming Soon", description: "Package upgrades will be available shortly." })}>↑ Upgrade Now</Button>
                      {!canAfford && pkg.price > 0 && <p className="text-[10px] text-destructive text-center mt-1 flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3" /> Insufficient balance</p>}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per-provider fees */}
      <div className="flex items-center gap-3 mb-2 mt-8">
        <Tag className="w-7 h-7 text-amber-500" />
        <h1 className="text-2xl font-bold text-foreground">Per-Provider Pricing</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Each payment provider has its own pricing. Select a provider and a direction to preview your fee.</p>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2"><Calculator className="w-4 h-4 text-primary" /> Fee Calculator</h3>
            <div>
              <label className="text-xs font-medium text-foreground">Provider</label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {providerFees.map(p => (
                    <SelectItem key={p.provider} value={p.provider} disabled={!p.enabled} className="capitalize">
                      {p.provider}{!p.enabled ? " (disabled)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Direction</label>
              <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit (STK push)</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal (B2C)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Amount (KES)</label>
              <Input type="number" placeholder="e.g. 1000" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} className="mt-1" />
            </div>
            {amt > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Fee ({feePct}%):</span><span className="font-bold text-primary">KES {feeAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Provider cost ({costPct}%):</span><span className="font-mono text-xs">KES {costAmount.toFixed(2)}</span></div>
                <div className="flex justify-between pt-1 border-t border-border"><span className="text-muted-foreground">Net to you:</span>
                  <span className="font-bold text-emerald-600">KES {(amt - feeAmount).toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-bold text-foreground flex items-center gap-2 mb-4"><Shield className="w-4 h-4 text-primary" /> Fees by Provider</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs font-bold text-muted-foreground uppercase">Provider</th>
                    <th className="text-left py-2 px-3 text-xs font-bold text-muted-foreground uppercase">Deposit Fee</th>
                    <th className="text-left py-2 px-3 text-xs font-bold text-muted-foreground uppercase">Withdrawal Fee</th>
                    <th className="text-left py-2 px-3 text-xs font-bold text-muted-foreground uppercase">Status</th>
                  </tr></thead>
                  <tbody>
                    {providerFees.map((p) => (
                      <tr key={p.provider} className={`border-b border-border/50 hover:bg-muted/30 ${p.provider === selectedProvider ? "bg-primary/5" : ""}`}>
                        <td className="py-2 px-3 font-semibold capitalize text-foreground">{p.provider}</td>
                        <td className="py-2 px-3 font-semibold text-primary">{Number(p.deposit_fee_pct)}%</td>
                        <td className="py-2 px-3 font-semibold text-emerald-600">{Number(p.withdrawal_fee_pct)}%</td>
                        <td className="py-2 px-3"><span className={`status-pill ${p.enabled ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{p.enabled ? "Active" : "Disabled"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-xs">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-foreground">Fees vary per provider. The provider used for your transaction is chosen by the platform based on availability — the fee preview above reflects exactly what you'd pay.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
