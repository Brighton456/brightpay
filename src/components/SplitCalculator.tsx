import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Percent } from "lucide-react";
export default function SplitCalculator() {
  const [total, setTotal] = useState(""); const [fee, setFee] = useState("2.5"); const [count, setCount] = useState("2");
  const result = useMemo(() => {
    const t = Number(total) || 0; const f = Number(fee) || 0; const c = Number(count) || 1;
    const feeAmount = t * (f / 100); const perPerson = (t + feeAmount) / c;
    return { feeAmount, perPerson, totalWithFee: t + feeAmount };
  }, [total, fee, count]);
  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" /> Fee Split Calculator</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div><p className="text-[10px] text-muted-foreground">Total (KES)</p><Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} className="text-xs mt-1" /></div>
          <div><p className="text-[10px] text-muted-foreground">Fee %</p><Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} className="text-xs mt-1" /></div>
          <div><p className="text-[10px] text-muted-foreground">Split #</p><Input type="number" value={count} onChange={(e) => setCount(e.target.value)} className="text-xs mt-1" min="1" /></div>
        </div>
        <div className="p-3 rounded-xl bg-muted/50 space-y-1">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Platform fee</span><span className="font-semibold">KES {result.feeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total with fee</span><span className="font-semibold">KES {result.totalWithFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between text-xs border-t border-border pt-1"><span className="font-bold text-foreground">Per person</span><span className="font-black text-primary">KES {result.perPerson.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        </div>
      </CardContent>
    </Card>
  );
}
function Input(props: any) { return <input {...props} className={`w-full h-8 rounded-md border border-input bg-background px-2 text-sm outline-none ${props.className || ""}`} />; }
