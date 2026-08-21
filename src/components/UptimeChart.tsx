import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface UptimeData {
  month: string;
  uptime: number;
  incidents: number;
  avgResponse: number;
}

const uptimeData: UptimeData[] = months.map((m, i) => ({
  month: m,
  uptime: i < 7 ? 99.9 + Math.random() * 0.1 : i === 7 ? 99.97 : 0,
  incidents: i < 7 ? Math.floor(Math.random() * 3) : i === 7 ? 1 : 0,
  avgResponse: 120 + Math.floor(Math.random() * 80),
}));

export default function UptimeChart() {
  const [view, setView] = useState<"uptime" | "response">("uptime");
  const currentYear = 2026;

  const getBarHeight = (val: number, max: number) => `${(val / max) * 100}%`;
  const getBarColor = (uptime: number) => {
    if (uptime >= 99.9) return "bg-green-500";
    if (uptime >= 99.5) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Uptime History — {currentYear}</CardTitle>
        <div className="flex gap-1">
          <Button variant={view === "uptime" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setView("uptime")}>Uptime %</Button>
          <Button variant={view === "response" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setView("response")}>Response Time</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-40">
          {uptimeData.map((d, i) => {
            if (d.uptime === 0) return <div key={i} className="flex-1 flex flex-col items-center gap-1"><span className="text-[10px] text-muted-foreground">—</span><div className="w-full h-1 bg-muted rounded" /><span className="text-[10px] text-muted-foreground">{d.month}</span></div>;
            const val = view === "uptime" ? d.uptime : d.avgResponse;
            const max = view === "uptime" ? 100 : 300;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {view === "uptime" ? `${d.uptime.toFixed(2)}%` : `${d.avgResponse}ms`}
                </span>
                <div className={`w-full rounded-t transition-all ${view === "uptime" ? getBarColor(d.uptime) : "bg-blue-500"}`} style={{ height: getBarHeight(view === "uptime" ? d.uptime - 99 : d.avgResponse, view === "uptime" ? 1 : 300) }} />
                <span className="text-[10px] text-muted-foreground">{d.month}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-muted-foreground">
          <span>Overall Uptime: <strong className="text-green-500">99.97%</strong></span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500" /> 99.9%+</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-500" /> 99.5-99.9%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500" /> &lt;99.5%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
