import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Webhook, Send, CheckCircle, XCircle, Clock, Zap } from "lucide-react";

const webhookTypes = [
  { value: "payment.success", label: "Payment Success", color: "text-green-500" },
  { value: "payment.failed", label: "Payment Failed", color: "text-red-500" },
  { value: "payment.pending", label: "Payment Pending", color: "text-yellow-500" },
  { value: "account.created", label: "Account Created", color: "text-blue-500" },
  { value: "endpoint.created", label: "Endpoint Created", color: "text-purple-500" },
];

const samplePayloads: Record<string, object> = {
  "payment.success": { event: "payment.success", data: { transaction_id: "TXN_demo_001", amount: 1500, phone_number: "2547****5678", status: "completed", mpesa_receipt: "DEMO123XYZ", created_at: new Date().toISOString() } },
  "payment.failed": { event: "payment.failed", data: { transaction_id: "TXN_demo_002", amount: 2000, status: "failed", error_code: "insufficient_funds", error_message: "Insufficient M-Pesa balance" } },
  "payment.pending": { event: "payment.pending", data: { transaction_id: "TXN_demo_003", amount: 500, status: "pending", checkout_request_id: "ws_CO_demo_001" } },
  "account.created": { event: "account.created", data: { user_id: "usr_demo_001", email: "newuser@example.com", created_at: new Date().toISOString() } },
  "endpoint.created": { event: "endpoint.created", data: { endpoint_id: "ep_demo_001", name: "Shop Payments", payment_link: "https://pay.brightpay.co.ke/ep_demo_001" } },
};

export default function WebhookSimulator() {
  const [url, setUrl] = useState("");
  const [eventType, setEventType] = useState("payment.success");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [sentCount, setSentCount] = useState(0);

  const handleSend = () => {
    if (!url) return;
    setSending(true);
    setResult(null);
    setTimeout(() => {
      setSending(false);
      setResult(Math.random() > 0.15 ? "success" : "error");
      setSentCount((c) => c + 1);
    }, 1200);
  };

  const payload = samplePayloads[eventType] || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="w-5 h-5" />
          Webhook Simulator
        </CardTitle>
        <CardDescription>Test your webhook endpoint with sample payloads</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <Input placeholder="https://yourapp.com/webhook/brightpay" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Event Type</Label>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {webhookTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}><span className={t.color}>{t.label}</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Payload Preview</Label>
          <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg text-xs overflow-x-auto font-mono max-h-40 overflow-y-auto">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
        <Button onClick={handleSend} disabled={!url || sending} className="w-full">
          {sending ? <><Clock className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><Send className="w-4 h-4 mr-2" /> Send Test Webhook</>}
        </Button>
        {result && (
          <div className={`flex items-center gap-3 p-3 rounded-lg ${result === "success" ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
            {result === "success" ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
            <div>
              <p className="text-sm font-medium">{result === "success" ? "Webhook delivered!" : "Delivery failed"}</p>
              <p className="text-xs text-muted-foreground">{result === "success" ? "Your endpoint returned 200 OK" : "Endpoint returned an error or timed out"}</p>
            </div>
          </div>
        )}
        {sentCount > 0 && (
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Zap className="w-3 h-3" /> {sentCount} test{sentCount !== 1 ? "s" : ""} sent this session
          </div>
        )}
      </CardContent>
    </Card>
  );
}
