import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SmartAmountChips from "@/components/SmartAmountChips";

export default function QuickPayFAB() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentTxs, setRecentTxs] = useState<any[]>([]);

  useEffect(() => {
    if (user && open) {
      supabase.from("transactions").select("amount, status").eq("user_id", user.id).eq("status", "completed").limit(20).then(({ data }) => setRecentTxs((data as any[]) || []));
    }
  }, [user, open]);

  const handlePay = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0 || !phone.trim()) {
      toast.error("Enter a valid phone number and amount");
      return;
    }
    setLoading(true);
    try {
      // Find the user's first active endpoint to use for the STK push
      const { data: endpoints } = await supabase
        .from("endpoints")
        .select("api_key")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1);

      if (!endpoints || endpoints.length === 0) {
        toast.error("No active endpoint found. Create one first.");
        return;
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/endpoint-pay`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": endpoints[0].api_key,
          },
          body: JSON.stringify({
            amount: amt,
            phone_number: phone.trim(),
            external_reference: reference.trim() || `QP-${Date.now()}`,
          }),
        }
      );

      const data = await resp.json();
      if (data.success) {
        toast.success("STK Push sent!", { description: `KES ${amt.toLocaleString()} to ${phone}` });
        setOpen(false);
        setPhone("");
        setAmount("");
        setReference("");
      } else {
        toast.error("Payment failed", { description: data.error || "Unknown error" });
      }
    } catch (err: any) {
      toast.error("Payment failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-4 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl flex items-center justify-center lg:hidden"
      >
        <Zap className="w-5 h-5" />
      </motion.button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Quick Pay
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">Initiate a quick STK push payment from your active endpoint.</p>
            <SmartAmountChips transactions={recentTxs} onSelect={(a) => setAmount(String(a))} />
            <div>
              <Label>Phone Number</Label>
              <Input
                placeholder="07XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 font-mono"
              />
            </div>
            <div>
              <Label>Amount (KES)</Label>
              <Input
                type="number"
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5"
                min={1}
              />
            </div>
            <div>
              <Label>Reference <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="ORDER-123"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button
              className="w-full gradient-primary text-primary-foreground btn-press"
              onClick={handlePay}
              disabled={loading || !phone.trim() || !amount}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending STK Push...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Send KES {amount ? Number(amount).toLocaleString() : "0"}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
