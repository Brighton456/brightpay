import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, CheckCircle2, XCircle, Loader2, Shield, Heart,
  Users, Phone, Banknote, Lock, Sparkles, ArrowRight, Clock,
  Star, Globe, Zap, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

export default function Pay() {
  const { apiKey } = useParams<{ apiKey: string }>();
  const [endpoint, setEndpoint] = useState<any>(null);
  const [meta, setMeta] = useState<any>({});
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "completed" | "failed">("idle");
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    if (!apiKey) return;
    (async () => {
      const { data } = await supabase.from("endpoints").select("*").eq("api_key", apiKey).eq("status", "active").single();
      if (data) {
        setEndpoint(data);
        try {
          const m = JSON.parse(data.callback_url);
          setMeta(m);
          if (m.amount) setAmount(String(m.amount));
        } catch { /* URL callback */ }
      }
      setLoading(false);
    })();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [apiKey]);

  const handlePay = async () => {
    if (!phone || !amount || !apiKey) return;

    // Basic validation
    const cleanPhone = phone.replace(/\s/g, "");
    if (!/^(07|01|2547|2541|\+2547|\+2541)\d{7,8}$/.test(cleanPhone)) {
      setError("Please enter a valid Safaricom phone number (e.g. 07XX XXX XXX)");
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 1 || numAmount > 150000) {
      setError("Amount must be between KES 1 and KES 150,000");
      return;
    }

    setPaying(true);
    setError("");
    setStatus("idle");
    setPollCount(0);

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/endpoint-pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          amount: numAmount,
          phone_number: cleanPhone,
          external_reference: `PAY-${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Payment initiation failed. Please try again.");
        setStatus("failed");
        setPaying(false);
        return;
      }

      setStatus("sent");
      const checkoutId = data.checkout_id;

      let attempts = 0;
      intervalRef.current = setInterval(async () => {
        attempts++;
        setPollCount(attempts);
        if (attempts > 40) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setStatus("failed");
          setError("Verification timed out. If you completed the payment, your funds are safe and will reflect shortly.");
          setPaying(false);
          return;
        }
        try {
          const statusRes = await fetch(
            `${supabaseUrl}/functions/v1/endpoint-status?checkout_id=${encodeURIComponent(checkoutId)}`,
            { headers: { "x-api-key": apiKey! } }
          );
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.status === "COMPLETED") {
              if (intervalRef.current) clearInterval(intervalRef.current);
              setStatus("completed");
              setPaying(false);
              // Redirect if configured
              if (meta?.redirect_url) {
                setTimeout(() => { window.location.href = meta.redirect_url; }, 3000);
              }
            } else if (statusData.status === "FAILED") {
              if (intervalRef.current) clearInterval(intervalRef.current);
              setStatus("failed");
              setError(statusData.error_message || "Payment was not completed.");
              setPaying(false);
            }
          }
        } catch { /* retry */ }
      }, 3000);
    } catch (e: any) {
      setError(e.message || "Network error. Check your connection.");
      setStatus("failed");
      setPaying(false);
    }
  };

  const isLipwa = meta.type === "lipwa";
  const isFundraiser = meta.type === "fundraiser";
  const title = isLipwa
    ? endpoint?.name?.replace("lipwa:", "") || "Payment"
    : isFundraiser
    ? endpoint?.name?.replace("fundraiser:", "") || "Fundraiser"
    : endpoint?.name || "Payment";

  const fundraiserProgress = isFundraiser && meta.target_amount
    ? Math.min((Number(endpoint?.total_collected || 0) / Number(meta.target_amount)) * 100, 100)
    : 0;

  // --- Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center animate-pulse">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            </div>
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading payment page...</p>
        </motion.div>
      </div>
    );
  }

  // --- Expired / Invalid State ---
  if (!endpoint) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center rounded-3xl border border-white/5 bg-white/[0.03] backdrop-blur-xl p-10">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-red-500/20">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Link Expired or Invalid</h1>
          <p className="text-slate-400 leading-relaxed">This payment link is no longer active or doesn't exist. Please contact the sender for a new link.</p>
          <div className="mt-8 pt-6 border-t border-white/5 text-xs text-slate-500 flex items-center justify-center gap-2">
            <Shield className="w-3.5 h-3.5" /> Powered by BrightPay
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1c] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-20 ${
          isFundraiser ? "bg-rose-500" : "bg-sky-500"}`} />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600 rounded-full blur-[100px] opacity-10" />
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-emerald-500 rounded-full blur-[80px] opacity-10" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "40px 40px"
        }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white/80">BrightPay</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Lock className="w-3 h-3" /> Secure Payment
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4 pb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }} className="w-full max-w-[440px]">

            {/* Payment Card */}
            <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl shadow-2xl overflow-hidden">

              {/* Card Header */}
              <div className={`relative overflow-hidden p-7 pb-8 ${
                isFundraiser
                  ? "bg-gradient-to-br from-rose-600/90 via-rose-500/80 to-orange-500/70"
                  : "bg-gradient-to-br from-sky-600/90 via-sky-500/80 to-cyan-500/70"
              }`}>
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white rounded-full blur-3xl" />
                </div>
                <div className="relative z-10">
                  {/* Type badge */}
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-white/90 mb-5 border border-white/10">
                    {isFundraiser ? <Heart className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                    {isFundraiser ? "Fundraising Campaign" : isLipwa ? "Payment Request" : "Payment"}
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">{title}</h1>

                  {/* Description */}
                  {meta.description && (
                    <p className="text-sm text-white/60 leading-relaxed max-w-sm">{meta.description}</p>
                  )}

                  {/* Fixed Amount Badge */}
                  {!isFundraiser && meta.amount && meta.amount_type === "fixed" && (
                    <div className="mt-5 inline-flex items-baseline gap-1">
                      <span className="text-xs text-white/40 font-medium">Amount</span>
                      <span className="text-3xl font-black text-white ml-2">KES {Number(meta.amount).toLocaleString()}</span>
                    </div>
                  )}

                  {/* Fundraiser Progress */}
                  {isFundraiser && meta.target_amount && (
                    <div className="mt-6">
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-3xl font-black text-white">
                          KES {Number(endpoint.total_collected).toLocaleString()}
                        </span>
                        <span className="text-sm text-white/40">raised of KES {Number(meta.target_amount).toLocaleString()}</span>
                      </div>
                      <div className="h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${fundraiserProgress}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-white/90 to-white/70 rounded-full"
                        />
                      </div>
                      <div className="flex items-center justify-between mt-3 text-xs">
                        <span className="text-white/50 font-medium">{Math.round(fundraiserProgress)}% of goal</span>
                        <div className="flex items-center gap-3 text-white/40">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {endpoint.successful_transactions} supporters</span>
                          {meta.deadline && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.max(0, Math.ceil((new Date(meta.deadline).getTime() - Date.now()) / 86400000))}d left
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-7">
                <AnimatePresence mode="wait">
                  {/* SUCCESS STATE */}
                  {status === "completed" && (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="text-center py-6">
                      <div className="relative mx-auto mb-6 w-24 h-24">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                          <CheckCircle2 className="w-12 h-12 text-white" />
                        </div>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">Payment Received!</h2>
                      <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
                        Your payment of <span className="font-bold text-white">KES {Number(amount).toLocaleString()}</span> has been confirmed successfully.
                      </p>
                      <div className="mt-6 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                        <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Transaction Verified via M-Pesa
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* WAITING STATE */}
                  {status === "sent" && (
                    <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-center py-6">
                      <div className="relative mx-auto mb-6 w-24 h-24">
                        <svg className="absolute inset-0 w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                          <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                          <circle cx="48" cy="48" r="44" fill="none" stroke="url(#poll-grad)" strokeWidth="4"
                            strokeDasharray={`${(pollCount / 40) * 276.5} 276.5`}
                            strokeLinecap="round" className="transition-all duration-500" />
                          <defs><linearGradient id="poll-grad"><stop stopColor="#38bdf8" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Phone className="w-8 h-8 text-sky-400 animate-pulse" />
                        </div>
                      </div>
                      <h2 className="text-xl font-bold text-white mb-2">Check Your Phone</h2>
                      <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto mb-4">
                        An M-Pesa payment prompt has been sent to <span className="font-semibold text-white">{phone}</span>. Enter your PIN to complete.
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Confirming payment... ({Math.round((pollCount / 40) * 100)}%)
                      </div>
                    </motion.div>
                  )}

                  {/* FORM STATE */}
                  {(status === "idle" || status === "failed") && (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="space-y-5">

                      {error && (
                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl bg-red-500/8 border border-red-500/15 flex items-start gap-3">
                          <Info className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-red-300 leading-relaxed">{error}</p>
                        </motion.div>
                      )}

                      {/* Phone Input */}
                      <div>
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">
                          M-Pesa Phone Number
                        </label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                            <div className="w-6 h-4 rounded-sm overflow-hidden flex flex-col">
                              <div className="flex-1 bg-black" />
                              <div className="flex-1 bg-red-600" />
                              <div className="flex-1 bg-green-600" />
                            </div>
                            <span className="text-slate-400 text-sm font-medium">+254</span>
                          </div>
                          <Input
                            placeholder="7XX XXX XXX"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="h-14 rounded-xl text-base pl-24 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-sky-500/50 focus:ring-sky-500/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Amount Input */}
                      <div>
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">
                          Amount
                        </label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <span className="text-slate-400 text-sm font-bold">KES</span>
                          </div>
                          <Input
                            type="number"
                            placeholder="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={meta.amount_type === "fixed" && !!meta.amount}
                            className="h-14 rounded-xl text-2xl font-black pl-16 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-sky-500/50 focus:ring-sky-500/20 transition-all disabled:opacity-60"
                          />
                        </div>
                        {meta.amount_type === "fixed" && <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1"><Lock className="w-3 h-3" /> Fixed amount set by the receiver</p>}
                      </div>

                      {/* Pay Button */}
                      <Button
                        className={`w-full h-14 rounded-xl text-base font-bold shadow-xl transition-all ${
                          isFundraiser
                            ? "bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-rose-500/25"
                            : "bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 shadow-sky-500/25"
                        } text-white disabled:opacity-40 disabled:shadow-none`}
                        onClick={handlePay}
                        disabled={paying || !phone || !amount}
                      >
                        {paying ? (
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                          <ArrowRight className="w-5 h-5 mr-2" />
                        )}
                        {paying ? "Sending prompt..." : `Pay KES ${Number(amount || 0).toLocaleString()}`}
                      </Button>

                      {/* Trust Indicators */}
                      <div className="pt-4 space-y-3">
                        <div className="flex items-center justify-center gap-5 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-500" /> Encrypted</span>
                          <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-sky-400" /> Verified</span>
                          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-amber-400" /> Instant</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Card Footer */}
              <div className="px-7 pb-6">
                <div className="pt-5 border-t border-white/[0.05]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
                        <Zap className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-[11px] text-slate-500">Powered by <span className="font-semibold text-slate-400">BrightPay</span></span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-600">
                      <Lock className="w-2.5 h-2.5" /> SSL Secured
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Below card info */}
            <div className="mt-6 text-center">
              <p className="text-[11px] text-slate-600 leading-relaxed max-w-xs mx-auto">
                Payments are processed securely via M-Pesa. Your financial data is never stored on our servers.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
