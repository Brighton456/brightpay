import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
export default function TotalVolumeCard({ transactions }: { transactions: any[] }) {
  const { deposits, withdrawals } = useMemo(() => {
    const c = transactions.filter((t) => t.status === "completed");
    return {
      deposits: c.filter((t) => t.type === "deposit" || t.type === "endpoint").re
