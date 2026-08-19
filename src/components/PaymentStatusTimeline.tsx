import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
const steps = [
  { label: "Initiated", icon: Clock, done: true },
  { label: "STK Push Sent", icon: Loader2, done: true },
  { label: "Processing", icon: Loader2, done: true },
  { label: "Completed", icon: CheckCircle2, done: false },
];
export default function PaymentStatusTimeline({ status }: { status: string }) {
  const getStep = () => { if (status === "completed") return 3; if (status === "failed") return -1; return 2; };
  const current = getStep();
  return (
    <div className="flex items-center gap-1">{steps.map((s, i) => {
      const active = i <= current;
      const failed = current === -1 && i === 3;
      return (
        <div key={i} className="flex items-center gap-1 flex-1">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${active ? "bg-emerald/10" : "bg-muted"}`}>
            {failed ? <XCircle className="w-3.5 h-3.5 text-destructive" /> : <s.icon className={`w-3.5 h-3.5 ${active ? "text-emerald" : "text-muted-foreground"} ${i === current && status === "pending" ? "animate-spin" : ""}`} />}
          </div>
          <span className={`text-[9px] ${active ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
          {i < steps.length - 1 && <div className={`flex-1 h-px ${i < current ? "bg-emerald" : "bg-border"}`} />}
        </div>
      );
    })}</div>
  );
}
