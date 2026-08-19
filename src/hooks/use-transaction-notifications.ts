import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useTransactionNotifications(userId: string | undefined) {
  const prevCount = useRef<number>(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("tx-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
        (payload) => {
          const tx = payload.new as any;
          if (!initialized.current) return;

          const typeEmoji: Record<string, string> = {
            deposit: "💰",
            withdrawal: "💸",
            endpoint: "⚡",
            transfer: "📤",
            activation_fee: "💳",
          };
          const emoji = typeEmoji[tx.type] || "💳";
          const isCredit = tx.type === "deposit" || tx.type === "endpoint";

          toast[tx.status === "failed" ? "error" : tx.status === "pending" ? "warning" : "success"](
            `${emoji} ${tx.status === "completed" ? "Payment Received" : tx.status === "pending" ? "Payment Pending" : "Payment Failed"}`,
            {
              description: `KES ${Number(tx.amount).toLocaleString()} ${isCredit ? "credited" : "debited"} — ${tx.external_reference || tx.type}`,
              duration: 5000,
            }
          );
        }
      )
      .subscribe();

    // Mark as initialized after a short delay to avoid showing existing transactions as new
    const timer = setTimeout(() => { initialized.current = true; }, 2000);

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
