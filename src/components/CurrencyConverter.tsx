import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRightLeft } from "lucide-react";

const RATES: Record<string, number> = { USD: 0.0077, GBP: 0.0061, EUR: 0.0071, KES: 1 };

export default function CurrencyConverter() {
  const [kes, setKes] = useState("1000");
  const [currency, setCurrency] = useState("USD");

  const amount = Number(kes) || 0;
  const converted = (amount * RATES[currency]).toFixed(2);
  const symbol: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", KES: "KES" };

  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-primary" /> Currency Converter</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground mb-1">KES Amount</p>
            <Input type="number" value={kes} onChange={(e) => setKes(e.target.value)} className="text-sm font-mono" />
          </div>
          <div className="mt-4"><ArrowRightLeft className="w-4 h-4 text-muted-foreground" /></div>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground mb-1">Currency</p>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {["USD", "GBP", "EUR"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-muted/50 text-center">
          <p className="text-2xl font-black text-foreground">{symbol[currency]}{converted}</p>
          <p className="text-xs text-muted-foreground mt-1">≈ {amount.toLocaleString()} KES · Rates are approximate</p>
        </div>
      </CardContent>
    </Card>
  );
}
