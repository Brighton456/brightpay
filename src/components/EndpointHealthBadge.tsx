import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
export default function EndpointHealthBadge({ endpoint }: { endpoint: any }) {
  const rate = endpoint.total_transactions > 0 ? (endpoint.successful_transactions / endpoint.total_transactions) * 100 : 0;
  const health = rate >= 90 ? "excellent" : rate >= 70 ? "good" : rate >= 50 ? "fair" : "poor";
  const config: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    excellent: { icon: CheckCircle2, color: "text-emerald", bg: "bg-emerald/10", label: "Excellent" },
    good: { icon: Shield, color: "text-blue-500", bg: "bg-blue-500/10", label: "Good" },
    fair: { icon: AlertTriangle, color: "text-amber", bg: "bg-amber/10", label: "Fair" },
    poor: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", label: "Poor" },
  };
  const c = config[health];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg} ${c.color}`}>
      <c.icon className="w-3 h-3" />{c.label}
    </span>
  );
}
