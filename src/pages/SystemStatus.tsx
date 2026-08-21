import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import UptimeChart from "@/components/UptimeChart";
import IncidentTimeline from "@/components/IncidentTimeline";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Activity, Wifi, Server, CreditCard, ArrowRight, Bell, RefreshCw, Globe, Shield, Database } from "lucide-react";

interface ServiceStatus { name: string; icon: any; status: "operational" | "degraded" | "outage" | "maintenance"; latency: number; uptime30d: number; }
interface Incident { id: string; title: string; status: "resolved" | "investigating" | "monitoring"; severity: "minor" | "major" | "critical"; created_at: string; resolved_at?: string; updates: { time: string; message: string }[]; }

const defaultServices: ServiceStatus[] = [
  { name: "M-Pesa STK Push", icon: CreditCard, status: "operational", latency: 340, uptime30d: 99.98 },
  { name: "API Gateway", icon: Globe, status: "operational", latency: 45, uptime30d: 99.99 },
  { name: "Transaction Engine", icon: Activity, status: "operational", latency: 120, uptime30d: 99.97 },
  { name: "Database", icon: Database, status: "operational", latency: 12, uptime30d: 100 },
  { name: "Webhook Delivery", icon: ArrowRight, status: "operational", latency: 85, uptime30d: 99.95 },
  { name: "Authentication", icon: Shield, status: "operational", latency: 32, uptime30d: 99.99 },
  { name: "Dashboard UI", icon: Server, status: "operational", latency: 180, uptime30d: 99.96 },
  { name: "Notification Service", icon: Bell, status: "operational", latency: 55, uptime30d: 99.92 },
];

const pastIncidents: Incident[] = [
  {
    id: "inc-001", title: "M-Pesa STK Push delays", status: "resolved", severity: "minor",
    created_at: "2025-08-15T10:30:00Z", resolved_at: "2025-08-15T11:45:00Z",
    updates: [
      { time: "10:30 AM", message: "We're seeing increased STK push latency on Safaricom's API. Investigating." },
      { time: "11:15 AM", message: "Safaricom confirmed a network issue on their side. Latency improving." },
      { time: "11:45 AM", message: "Resolved. All STK pushes completing normally. Average latency back to ~340ms." },
    ],
  },
  {
    id: "inc-002", title: "Scheduled maintenance — Database upgrade", status: "resolved", severity: "minor",
    created_at: "2025-08-10T02:00:00Z", resolved_at: "2025-08-10T02:45:00Z",
    updates: [
      { time: "2:00 AM", message: "Beginning scheduled database upgrade. Read-only mode enabled for ~30 minutes." },
      { time: "2:45 AM", message: "Upgrade complete. Full functionality restored." },
    ],
  },
  {
    id: "inc-003", title: "Webhook delivery delays", status: "resolved", severity: "major",
    created_at: "2025-07-28T14:20:00Z", resolved_at: "2025-07-28T16:10:00Z",
    updates: [
      { time: "2:20 PM", message: "Webhook queue processing slower than expected. Investigating root cause." },
      { time: "3:00 PM", message: "Identified memory leak in queue worker. Deploying fix." },
      { time: "4:10 PM", message: "Fix deployed and verified. All queued webhooks delivered successfully." },
    ],
  },
];

const statusConfig = {
  operational: { label: "Operational", color: "text-emerald", bg: "bg-emerald/10", icon: CheckCircle2 },
  degraded: { label: "Degraded", color: "text-amber", bg: "bg-amber/10", icon: AlertTriangle },
  outage: { label: "Major Outage", color: "text-destructive", bg: "bg-destructive/10", icon: XCircle },
  maintenance: { label: "Maintenance", color: "text-blue-500", bg: "bg-blue-500/10", icon: Clock },
};

const severityConfig = {
  minor: { label: "Minor", color: "bg-amber/10 text-amber border-amber/20" },
  major: { label: "Major", color: "bg-orange/10 text-orange border-orange/20" },
  critical: { label: "Critical", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

function UptimeBar({ uptime }: { uptime: number }) {
  const bars = 30;
  return (
    <div className="flex gap-[2px]">
      {Array.from({ length: bars }).map((_, i) => {
        const pct = uptime - (Math.random() * 0.1);
        const color = pct >= 99.9 ? "bg-emerald" : pct >= 99 ? "bg-amber" : pct >= 95 ? "bg-orange" : "bg-destructive";
        return <div key={i} title={`Day ${i + 1}: ${pct.toFixed(2)}%`} className={`w-[6px] h-4 rounded-sm ${color} opacity-80 hover:opacity-100 transition-opacity`} />;
      })}
    </div>
  );
}

export default function SystemStatus() {
  const [services, setServices] = useState<ServiceStatus[]>(defaultServices);
  const [lastChecked, setLastChecked] = useState(new Date());

  const allOperational = services.every((s) => s.status === "operational");
  const degradedCount = services.filter((s) => s.status === "degraded").length;
  const outageCount = services.filter((s) => s.status === "outage").length;

  const refresh = () => {
    setServices((prev) => prev.map((s) => ({
      ...s,
      latency: Math.max(10, s.latency + Math.floor(Math.random() * 40 - 20)),
    })));
    setLastChecked(new Date());
  };

  useEffect(() => { const t = setInterval(refresh, 30000); return () => clearInterval(t); }, []);

  return (
    <DashboardLayout>
      {/* Overall Status Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={`rounded-[1.75rem] p-5 mb-6 border ${
          allOperational ? "bg-emerald/5 border-emerald/20" : outageCount > 0 ? "bg-destructive/5 border-destructive/20" : "bg-amber/5 border-amber/20"
        }`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {allOperational ? <CheckCircle2 className="w-6 h-6 text-emerald" /> : outageCount > 0 ? <XCircle className="w-6 h-6 text-destructive" /> : <AlertTriangle className="w-6 h-6 text-amber" />}
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {allOperational ? "All Systems Operational" : outageCount > 0 ? "Service Outage Detected" : "Some Systems Degraded"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {allOperational
                  ? "All services are running normally."
                  : `Affected services: ${services.filter((s) => s.status !== "operational").map((s) => s.name).join(", ")}`}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="btn-press" onClick={refresh}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* Services Grid */}
      <h3 className="text-lg font-bold text-foreground mb-4">Services</h3>
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        {services.map((s, i) => {
          const cfg = statusConfig[s.status];
          return (
            <motion.div key={s.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="rounded-[1.25rem] border-border/70">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <s.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{s.name}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
                      <cfg.icon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                    <span>Latency: <span className="font-semibold text-foreground">{s.latency}ms</span></span>
                    <span>30-day uptime: <span className="font-semibold text-emerald">{s.uptime30d}%</span></span>
                  </div>
                  <UptimeBar uptime={s.uptime30d} />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Incident History */}
      <h3 className="text-lg font-bold text-foreground mb-4">Past Incidents</h3>
      <div className="space-y-4 mb-6">
        {pastIncidents.map((inc) => {
          const sev = severityConfig[inc.severity];
          return (
            <Card key={inc.id} className="rounded-[1.5rem] border-border/70">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-foreground">{inc.title}</h4>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sev.color}`}>{sev.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(inc.created_at).toLocaleDateString()} {new Date(inc.created_at).toLocaleTimeString()}
                      {inc.resolved_at && ` — Resolved ${new Date(inc.resolved_at).toLocaleTimeString()}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-emerald font-semibold bg-emerald/10 px-2 py-0.5 rounded-full">Resolved</span>
                </div>
                <div className="space-y-2 ml-3 border-l-2 border-border pl-3">
                  {inc.updates.map((u, j) => (
                    <div key={j}>
                      <p className="text-[10px] text-primary font-semibold">{u.time}</p>
                      <p className="text-xs text-muted-foreground">{u.message}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-muted-foreground py-4">
        Last checked: {lastChecked.toLocaleTimeString()} · Auto-refreshes every 30 seconds · Powered by BrightPay Infrastructure
      </p>
    
      <div className="mt-8">
        <UptimeChart />
      </div>
      <div className="mt-6">
        <IncidentTimeline />
      </div>
    </DashboardLayout>
  );
}
