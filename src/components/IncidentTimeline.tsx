import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface Incident {
  id: string;
  title: string;
  severity: "critical" | "major" | "minor";
  status: "resolved" | "investigating" | "monitoring";
  date: string;
  duration: string;
  updates: { time: string; message: string }[];
}

const incidents: Incident[] = [
  { id: "INC-2026-042", title: "Elevated STK Push Latency", severity: "minor", status: "resolved", date: "Aug 15, 2026", duration: "45 min", updates: [
    { time: "14:30", message: "Investigating reports of slow STK push responses" },
    { time: "14:45", message: "Identified Safaricom gateway latency increase" },
    { time: "15:15", message: "Latency returned to normal. Monitoring for recurrence." },
  ]},
  { id: "INC-2026-038", title: "M-Pesa Payment Processing Delay", severity: "major", status: "resolved", date: "Jul 28, 2026", duration: "2h 10min", updates: [
    { time: "09:00", message: "Payments processing slower than usual" },
    { time: "09:30", message: "Safaricom experiencing system-wide delays" },
    { time: "10:15", message: "Implementing retry logic for failed transactions" },
    { time: "11:10", message: "All systems back to normal. All affected transactions completed." },
  ]},
  { id: "INC-2026-029", title: "Dashboard Accessibility Issue", severity: "minor", status: "resolved", date: "Jun 12, 2026", duration: "20 min", updates: [
    { time: "16:00", message: "Some users unable to load dashboard" },
    { time: "16:15", message: "CDN cache issue identified and resolved" },
    { time: "16:20", message: "All users can access dashboard normally" },
  ]},
];

const severityConfig = { critical: { color: "bg-red-500/10 text-red-500 border-red-500/20", label: "Critical" }, major: { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", label: "Major" }, minor: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", label: "Minor" } };
const statusConfig = { resolved: { icon: CheckCircle, color: "text-green-500" }, investigating: { icon: AlertTriangle, color: "text-orange-500" }, monitoring: { icon: Clock, color: "text-blue-500" } };

export default function IncidentTimeline() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? incidents : incidents.slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Incident History</CardTitle>
        <Badge variant="outline" className="text-xs">{incidents.length} total incidents</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.map((inc) => {
          const sev = severityConfig[inc.severity];
          const sts = statusConfig[inc.status];
          const isOpen = expanded === inc.id;
          return (
            <div key={inc.id} className="border rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpanded(isOpen ? null : inc.id)}>
              <div className="flex items-center gap-3">
                <sts.icon className={`w-4 h-4 ${sts.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{inc.title}</span>
                    <Badge variant="outline" className={`text-[10px] ${sev.color}`}>{sev.label}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{inc.date} · {inc.duration}</span>
                </div>
                <span className="text-xs text-green-500 font-medium capitalize">{inc.status}</span>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
              {isOpen && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {inc.updates.map((u, i) => (
                    <div key={i} className="flex gap-3 text-xs">
                      <span className="text-muted-foreground font-mono w-12 shrink-0">{u.time}</span>
                      <span>{u.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {incidents.length > 3 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Show Less" : `View All ${incidents.length} Incidents`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
