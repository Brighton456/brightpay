import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Play, CheckCircle, Terminal, Code2, FileCode } from "lucide-react";

const examples = {
  "initiate-payment": {
    title: "Initiate STK Push Payment",
    description: "Send an M-Pesa payment request to a customer's phone",
    method: "POST",
    endpoint: "/api/v1/payments/initiate",
    body: '{\n  "phone_number": "254712345678",\n  "amount": 1500,\n  "account_reference": "ORDER-001",\n  "callback_url": "https://yourapp.com/webhook/mpesa"\n}',
    curl: 'curl -X POST https://api.brightpay.co.ke/api/v1/payments/initiate \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{\n    "phone_number": "254712345678",\n    "amount": 1500,\n    "account_reference": "ORDER-001"\n  }\'',
    python: 'import requests\n\nresponse = requests.post(\n    "https://api.brightpay.co.ke/api/v1/payments/initiate",\n    headers={"Authorization": "Bearer YOUR_API_KEY"},\n    json={\n        "phone_number": "254712345678",\n        "amount": 1500,\n        "account_reference": "ORDER-001"\n    }\n)\nprint(response.json())',
    javascript: 'const response = await fetch(\n  "https://api.brightpay.co.ke/api/v1/payments/initiate",\n  {\n    method: "POST",\n    headers: {\n      "Authorization": "Bearer YOUR_API_KEY",\n      "Content-Type": "application/json"\n    },\n    body: JSON.stringify({\n      phone_number: "254712345678",\n      amount: 1500,\n      account_reference: "ORDER-001"\n    })\n  }\n);\nconst data = await response.json();',
    response: '{\n  "status": "success",\n  "data": {\n    "transaction_id": "TXN_20260821_abc123",\n    "checkout_request_id": "ws_CO_21082026123456",\n    "response_code": "0",\n    "response_description": "Success. Request accepted for processing",\n    "merchant_request_id": "29115-34839-1"\n  }\n}',
  },
  "check-status": {
    title: "Check Transaction Status",
    description: "Query the status of a payment transaction",
    method: "GET",
    endpoint: "/api/v1/payments/TXN_20260821_abc123",
    body: "",
    curl: 'curl https://api.brightpay.co.ke/api/v1/payments/TXN_20260821_abc123 \\\n  -H "Authorization: Bearer YOUR_API_KEY"',
    python: 'response = requests.get(\n    "https://api.brightpay.co.ke/api/v1/payments/TXN_20260821_abc123",\n    headers={"Authorization": "Bearer YOUR_API_KEY"}\n)',
    javascript: 'const response = await fetch(\n  "https://api.brightpay.co.ke/api/v1/payments/TXN_20260821_abc123",\n  { headers: { "Authorization": "Bearer YOUR_API_KEY" } }\n);',
    response: '{\n  "status": "success",\n  "data": {\n    "transaction_id": "TXN_20260821_abc123",\n    "status": "completed",\n    "amount": 1500,\n    "phone_number": "2547****5678",\n    "mpesa_receipt": "QHK71JG3ZL",\n    "completed_at": "2026-08-21T10:30:15Z"\n  }\n}',
  },
  "list-transactions": {
    title: "List Transactions",
    description: "Retrieve a paginated list of transactions",
    method: "GET",
    endpoint: "/api/v1/payments?page=1&limit=20",
    body: "",
    curl: 'curl "https://api.brightpay.co.ke/api/v1/payments?page=1&limit=20" \\\n  -H "Authorization: Bearer YOUR_API_KEY"',
    python: 'response = requests.get(\n    "https://api.brightpay.co.ke/api/v1/payments",\n    headers={"Authorization": "Bearer YOUR_API_KEY"},\n    params={"page": 1, "limit": 20}\n)',
    javascript: 'const response = await fetch(\n  "https://api.brightpay.co.ke/api/v1/payments?page=1&limit=20",\n  { headers: { "Authorization": "Bearer YOUR_API_KEY" } }\n);',
    response: '{\n  "status": "success",\n  "data": {\n    "transactions": [...],\n    "pagination": {\n      "page": 1,\n      "limit": 20,\n      "total": 156,\n      "pages": 8\n    }\n  }\n}',
  },
};

export default function CodePlayground() {
  const [selected, setSelected] = useState("initiate-payment");
  const [lang, setLang] = useState<"curl" | "python" | "javascript">("curl");
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [showResponse, setShowResponse] = useState(false);

  const example = examples[selected as keyof typeof examples];

  const handleCopy = () => {
    navigator.clipboard.writeText(lang === "curl" ? example.curl : lang === "python" ? example.python : example.javascript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = () => {
    setRunning(true);
    setShowResponse(false);
    setTimeout(() => { setRunning(false); setShowResponse(true); }, 1500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          Interactive API Playground
        </CardTitle>
        <CardDescription>Try our API endpoints with sample data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(examples).map(([key, ex]) => (
              <SelectItem key={key} value={key}>
                <span className="font-mono text-xs text-green-500 mr-2">{ex.method}</span> {ex.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className={example.method === "POST" ? "text-green-500" : "text-blue-500"}>{example.method}</Badge>
            <code className="text-muted-foreground">{example.endpoint}</code>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{example.description}</p>
        </div>

        <Tabs value={lang} onValueChange={(v) => setLang(v as typeof lang)}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="curl" className="text-xs"><Terminal className="w-3 h-3 mr-1" /> cURL</TabsTrigger>
              <TabsTrigger value="python" className="text-xs"><FileCode className="w-3 h-3 mr-1" /> Python</TabsTrigger>
              <TabsTrigger value="javascript" className="text-xs"><Code2 className="w-3 h-3 mr-1" /> JavaScript</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopy}>
                {copied ? <><CheckCircle className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleRun} disabled={running}>
                <Play className="w-3 h-3 mr-1" /> {running ? "Running..." : "Try It"}
              </Button>
            </div>
          </div>

          {["curl", "python", "javascript"].map((l) => (
            <TabsContent key={l} value={l}>
              <pre className="p-4 bg-slate-950 text-slate-100 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed">
                {l === "curl" ? example.curl : l === "python" ? example.python : example.javascript}
              </pre>
            </TabsContent>
          ))}
        </Tabs>

        {showResponse && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-green-500/10 text-green-500">200 OK</Badge>
              <span className="text-xs text-muted-foreground">Response ({Math.floor(Math.random() * 200 + 100)}ms)</span>
            </div>
            <pre className="p-4 bg-slate-950 text-green-400 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed">
              {example.response}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
