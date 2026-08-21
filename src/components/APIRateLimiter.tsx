import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Info } from "lucide-react";

interface RateLimit {
  tier: string;
  requestsPerMinute: number;
  requestsPerDay: number;
  burstLimit: number;
  description: string;
}

const rateLimits: RateLimit[] = [
  { tier: "Free", requestsPerMinute: 10, requestsPerDay: 1000, burstLimit: 15, description: "Basic API access for testing" },
  { tier: "Starter", requestsPerMinute: 30, requestsPerDay: 5000, burstLimit: 50, description: "For small applications" },
  { tier: "Business", requestsPerMinute: 100, requestsPerDay: 25000, burstLimit: 200, description: "For growing businesses" },
  { tier: "Enterprise", requestsPerMinute: 500, requestsPerDay: 100000, burstLimit: 1000, description: "For high-volume operations" },
];

const headers = [
  { name: "X-RateLimit-Limit", desc: "Max requests per window" },
  { name: "X-RateLimit-Remaining", desc: "Remaining requests" },
  { name: "X-RateLimit-Reset", desc: "Window reset timestamp" },
  { name: "Retry-After", desc: "Seconds to wait (on 429)" },
];

export default function APIRateLimiter() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> API Rate Limits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Per Minute</TableHead>
                <TableHead className="text-right">Per Day</TableHead>
                <TableHead className="text-right">Burst</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateLimits.map((rl) => (
                <TableRow key={rl.tier}>
                  <TableCell><Badge variant="outline">{rl.tier}</Badge></TableCell>
                  <TableCell className="text-right font-mono text-sm">{rl.requestsPerMinute}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{rl.requestsPerDay.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{rl.burstLimit}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{rl.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><Info className="w-3 h-3" /> Rate Limit Headers</h4>
          <div className="space-y-1">
            {headers.map((h) => (
              <div key={h.name} className="flex items-center gap-3 text-sm">
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{h.name}</code>
                <span className="text-muted-foreground">{h.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
