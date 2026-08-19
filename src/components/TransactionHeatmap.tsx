import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface TransactionHeatmapProps {
  transactions: any[];
}

export default function TransactionHeatmap({ transactions }: TransactionHeatmapProps) {
  const { weeks, maxCount, totalDays } = useMemo(() => {
    const now = new Date();
    const days: { date: string; count: number }[] = [];

    // Build 90 days of data
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().split("T")[0], count: 0 });
    }

    // Count transactions per day
    transactions.forEach((tx) => {
      const day = tx.created_at?.split("T")[0];
      const entry = days.find((d) => d.date === day);
      if (entry) entry.count++;
    });

    const max = Math.max(...days.map((d) => d.count), 1);

    // Group into weeks (7 columns)
    const weeksArr: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeksArr.push(days.slice(i, i + 7));
    }

    return { weeks: weeksArr, maxCount: max, totalDays: days.length };
  }, [transactions]);

  const dayLabels = ["Mon", "", "Wed", "", "Fri", "", ""];

  const getIntensity = (count: number) => {
    if (count === 0) return "bg-muted/50";
    const ratio = count / maxCount;
    if (ratio < 0.25) return "bg-emerald/20";
    if (ratio < 0.5) return "bg-emerald/40";
    if (ratio < 0.75) return "bg-emerald/60";
    return "bg-emerald/90";
  };

  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Activity Heatmap
        </CardTitle>
        <p className="text-xs text-muted-foreground">Transaction activity over the past {totalDays} days</p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-[3px] mr-1">
            {dayLabels.map((label, i) => (
              <div key={i} className="w-7 h-[11px] text-[9px] text-muted-foreground flex items-center">{label}</div>
            ))}
          </div>
          {/* Grid */}
          <div className="flex gap-[3px] overflow-x-auto">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count} transaction${day.count !== 1 ? "s" : ""}`}
                    className={`w-[11px] h-[11px] rounded-[2px] ${getIntensity(day.count)} hover:ring-1 hover:ring-primary/50 transition-all cursor-default`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 text-[9px] text-muted-foreground">
          <span>Less</span>
          <div className="w-[11px] h-[11px] rounded-[2px] bg-muted/50" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-emerald/20" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-emerald/40" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-emerald/60" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-emerald/90" />
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
