import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Copy, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface Props { apiKey: string; endpointName: string; }

export default function PaymentLinkGenerator({ apiKey, endpointName }: Props) {
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [showQR, setShowQR] = useState(false);

  const baseUrl = `${window.location.origin}/pay/${apiKey}`;
  const params = new URLSearchParams();
  if (amount) params.set("amount", amount);
  if (reference) params.set("ref", reference);
  const fullUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

  const copyLink = () => { navigator.clipboard.writeText(fullUrl); toast.success("Payment link copied!"); };

  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Link2 className="w-5 h-5 text-primary" /> Payment Link</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Endpoint</Label>
          <p className="text-sm font-semibold text-foreground mt-0.5">{endpointName}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Amount (KES) <span className="text-muted-foreground font-normal">optional</span></Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Any amount" className="mt-1 text-xs" /></div>
          <div><Label className="text-xs">Reference <span className="text-muted-foreground font-normal">optional</span></Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="ORDER-001" className="mt-1 text-xs" /></div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gradient-primary text-primary-foreground btn-press flex-1" onClick={copyLink}><Copy className="w-3 h-3 mr-1" /> Copy Link</Button>
          <Button size="sm" variant="outline" className="btn-press" onClick={() => setShowQR(!showQR)}><QrCode className="w-4 h-4 mr-1" /> QR</Button>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 text-[10px] text-muted-foreground font-mono break-all">{fullUrl}</div>
        {showQR && (
          <div className="text-center p-4 bg-white rounded-xl border border-border">
            <QRCodeSVG value={fullUrl} size={140} level="M" />
            <p className="text-[9px] text-muted-foreground mt-2">Scan to pay {amount ? `KES ${Number(amount).toLocaleString()}` : "any amount"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
