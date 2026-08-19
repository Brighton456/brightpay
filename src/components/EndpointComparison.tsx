import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3 } from "lucide-react";

interface Endpoint {
  id: string;
  name: string;
  total_collected: number;
  total_transactions: number;
  successful_transactions: number;
}

interface EndpointComparisonProps {
  endpoints: Endpoint[];
}

export default function EndpointComparison({ endpoints }: EndpointComparisonProps) {
  const chartData = useMemo(() => {
    return endpoints.map((ep) => ({
      name: ep.name.length > 15 ? ep.name.slice(0, 15) + "…" : ep.name,
      collected: Number(ep.total_collected) || 0,
      transactions: ep.total_transactions || 0,
      successRate:
        ep.total_transactions > 0
          ? Math.round((ep.successful_transactions / ep.total_transactions) * 100)
          : 0,
    }));
  }, [endpoints]);

  if (endpoints.length === 0) return null;

  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Endpoint Comparison
        </CardTitle>
        <p className="text-xs text-muted-foreground">Compare performance across all your endpoints</p>
      </CardHeader>
      <CardContent>
        {chartData.length === 1 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Create more endpoints to see comparisons
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} />
                <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="collected" name="Collected (KES)" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="transactions" name="Transactions" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Data table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 pr-3">Endpoint</th>
                    <th className="text-right py-2 pr-3">Collected</th>
                    <th className="text-right py-2 pr-3">Transactions</th>
                    <th className="text-right py-2">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row) => (
                    <tr key={row.name} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-medium text-foreground">{row.name}</td>
                      <td className="py-2 pr-3 text-right">KES {row.collected.toLocaleString()}</td>
                      <td className="py-2 pr-3 text-right">{row.transactions}</td>
                      <td className={`py-2 text-right font-semibold ${row.successRate >= 80 ? "text-emerald" : row.successRate >= 50 ? "text-amber" : "text-destructive"}`}>
                        {row.successRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
