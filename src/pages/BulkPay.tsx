import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Play, CheckCircle2, XCircle, Loader2, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BulkRow {
  phone: string;
  amount: number;
  reference: string;
  status: "pending" | "sending" | "success" | "failed";
  result?: string;
}

export default function BulkPay() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [running, setRunning] = useState(false);
  const [endpointKey, setEndpointKey] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      const parsed: BulkRow[] = [];

      lines.forEach((line, i) => {
        if (i === 0 && line.toLowerCase().includes("phone")) return; // skip header
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 2) {
          parsed.push({
            phone: parts[0],
            amount: Number(parts[1]),
            reference: parts[2] || `BULK-${Date.now()}-${i}`,
            status: "pending",
          });
        }
      });
      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const runBulk = async () => {
    if (!endpointKey.trim()) {
      toast.error("Enter an endpoint API key first");
      return;
    }
    setRunning(true);

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.status !== "pending") continue;

      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "sending" } : r)));

      try {
        const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/endpoint-pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": endpointKey.trim() },
          body: JSON.stringify({ amount: row.amount, phone_number: row.phone, external_reference: row.reference }),
        });
        const data = await resp.json();
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: data.success ? "success" : "failed", result: data.error || data.checkout_id } : r
          )
        );
      } catch {
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "failed", result: "Network error" } : r)));
      }

      // Small delay between requests
      await new Promise((r) => setTimeout(r, 1500));
    }

    setRunning(false);
    const successes = rows.filter((r) => r.status === "success").length;
    toast.success(`Bulk pay complete: ${successes}/${rows.length} sent`);
  };

  const statusIcon = (s: string) => {
    if (s === "success") return <CheckCircle2 className="w-4 h-4 text-emerald" />;
    if (s === "failed") return <XCircle className="w-4 h-4 text-destructive" />;
    if (s === "sending") return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />;
  };

  const totalAmount = rows.reduce((s, r) => s + (r.status === "pending" || r.status === "sending" ? r.amount : 0), 0);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 rounded-[2rem] gradient-hero p-6 text-secondary-foreground">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary mb-4">
            <Zap className="w-3.5 h-3.5" /> Bulk Operations
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Bulk Pay</h1>
          <p className="text-sm text-secondary-foreground/75 leading-7">
            Upload a CSV with phone numbers and amounts to initiate multiple STK pushes at once.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Upload className="w-5 h-5" /> Upload CSV</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">CSV Format:</p>
              <code className="text-[10px]">phone_number,amount,reference(optional)</code>
              <pre className="mt-2 text-[10px]">0712345678,500,ORDER-001{"\n"}0798765432,1000,ORDER-002</pre>
            </div>
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              <Button variant="outline" className="btn-press" onClick={() => fileRef.current?.click()}>
                <FileText className="w-4 h-4 mr-2" /> Choose CSV File
              </Button>
              {rows.length > 0 && <span className="text-sm text-muted-foreground">{rows.length} rows loaded</span>}
            </div>
            <div>
              <Label>Endpoint API Key</Label>
              <Input placeholder="bp_xxxxxxxxxxxxxxxx" value={endpointKey} onChange={(e) => setEndpointKey(e.target.value)} className="mt-1.5 font-mono" />
            </div>
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <>
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Preview ({rows.length} payments)</CardTitle>
                <Button className="gradient-primary text-primary-foreground btn-press" onClick={runBulk} disabled={running || !endpointKey.trim()}>
                  {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><Play className="w-4 h-4 mr-2" /> Run Bulk Pay</>}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs">
                        <th className="text-left py-2 pr-4">#</th>
                        <th className="text-left py-2 pr-4">Phone</th>
                        <th className="text-left py-2 pr-4">Amount</th>
                        <th className="text-left py-2 pr-4">Reference</th>
                        <th className="text-left py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                          <td className="py-2 pr-4 font-mono">{row.phone}</td>
                          <td className="py-2 pr-4 font-semibold">KES {row.amount.toLocaleString()}</td>
                          <td className="py-2 pr-4 text-xs text-muted-foreground">{row.reference}</td>
                          <td className="py-2 flex items-center gap-2">{statusIcon(row.status)} <span className="text-xs capitalize">{row.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  Total pending: <strong className="text-foreground">KES {totalAmount.toLocaleString()}</strong> across {rows.filter((r) => r.status === "pending").length} payments
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
